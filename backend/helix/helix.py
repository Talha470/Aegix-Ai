#!/usr/bin/env python3
"""
AEGIX AI — HELIX: System Integrity Scanner
- File integrity (SHA256 vs baseline)
- Unknown process detection
- Suspicious network connection check
- API self-test (SQLi, XSS probes on own endpoints)
Runs every 5 minutes via cron. Outputs JSON report.
"""
import json, hashlib, os, sys, subprocess, socket, time, requests
from datetime import datetime

REPORT_FILE = '/tmp/helix_report.json'
BASELINE_FILE = '/app/helix/baseline.json'

# Files to monitor
WATCHED_FILES = [
    '/app/Server.js',
    '/app/middlewares.js',
    '/app/middlewares/zeroday.js',
    '/app/models/users.js',
    '/app/routes/auth.js',
    '/etc/nginx/sites-available/aegix',
    '/etc/nginx/nginx.conf',
]

# Processes that should NOT be running
SUSPICIOUS_PROCS = ['nc', 'netcat', 'ncat', 'socat', 'msfconsole', 'meterpreter']

# API self-test payloads
SELF_TEST_PAYLOADS = [
    {"desc": "SQLi basic",         "body": {"email": "' OR 1=1 --", "password": "x"}},
    {"desc": "XSS basic",          "body": {"email": "<script>alert(1)</script>", "password": "x"}},
    {"desc": "Path traversal",     "body": {"email": "../../etc/passwd", "password": "x"}},
    {"desc": "SQLi union",         "body": {"email": "' UNION SELECT 1,2,3--", "password": "x"}},
]

API_BASE = 'http://localhost:8080'

# ── Helpers ───────────────────────────────────────────────────────────────────

def sha256(path):
    h = hashlib.sha256()
    try:
        with open(path, 'rb') as f:
            for chunk in iter(lambda: f.read(65536), b''):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return None

def run_cmd(cmd):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        return result.stdout.strip()
    except Exception:
        return ''

# ── Scan Functions ────────────────────────────────────────────────────────────

def check_file_integrity():
    findings = []
    if not os.path.exists(BASELINE_FILE):
        # Generate baseline on first run
        baseline = {}
        for f in WATCHED_FILES:
            h = sha256(f)
            if h:
                baseline[f] = h
        os.makedirs(os.path.dirname(BASELINE_FILE), exist_ok=True)
        with open(BASELINE_FILE, 'w') as bf:
            json.dump(baseline, bf, indent=2)
        return [{'type': 'BASELINE_CREATED', 'message': f'Baseline created with {len(baseline)} files', 'severity': 'INFO'}]

    with open(BASELINE_FILE) as bf:
        baseline = json.load(bf)

    for f in WATCHED_FILES:
        current = sha256(f)
        if current is None:
            findings.append({'type': 'FILE_MISSING', 'file': f, 'severity': 'HIGH',
                             'message': f'Monitored file missing: {f}'})
        elif f in baseline and baseline[f] != current:
            findings.append({'type': 'FILE_TAMPERED', 'file': f, 'severity': 'CRITICAL',
                             'message': f'File tampered: {f}', 'expected': baseline[f][:16]+'...', 'found': current[:16]+'...'})
        elif f not in baseline:
            findings.append({'type': 'NEW_FILE', 'file': f, 'severity': 'MEDIUM',
                             'message': f'New file not in baseline: {f}'})

    return findings

def check_suspicious_processes():
    findings = []
    ps_out = run_cmd("ps aux --no-headers")
    for line in ps_out.splitlines():
        for proc in SUSPICIOUS_PROCS:
            if proc in line.lower():
                findings.append({'type': 'SUSPICIOUS_PROCESS', 'severity': 'CRITICAL',
                                 'message': f'Suspicious process detected: {proc}', 'detail': line[:120]})
    return findings

def check_network_connections():
    findings = []
    ss_out = run_cmd("ss -tnp 2>/dev/null || netstat -tnp 2>/dev/null")
    allowed_ports = {80, 443, 8080, 27017, 2222, 22, 51820, 5173}

    for line in ss_out.splitlines():
        parts = line.split()
        for part in parts:
            if ':' in part:
                try:
                    port = int(part.split(':')[-1])
                    if port > 1024 and port not in allowed_ports and port < 65000:
                        if 'LISTEN' in line:
                            findings.append({'type': 'UNKNOWN_PORT', 'severity': 'HIGH',
                                            'message': f'Unknown port listening: {port}', 'detail': line[:120]})
                except ValueError:
                    pass
    return findings

def self_test_api():
    findings = []
    for test in SELF_TEST_PAYLOADS:
        try:
            r = requests.post(f'{API_BASE}/api/auth/login',
                             json=test['body'], timeout=5,
                             headers={'X-Helix-Self-Test': '1'})
            if r.status_code == 200:
                findings.append({'type': 'API_VULNERABILITY', 'severity': 'CRITICAL',
                                 'test': test['desc'], 'status': r.status_code,
                                 'message': f'API vulnerability: {test["desc"]} returned 200!'})
            else:
                findings.append({'type': 'API_SELF_TEST', 'severity': 'INFO',
                                 'test': test['desc'], 'status': r.status_code,
                                 'message': f'Self-test OK: {test["desc"]} → {r.status_code}'})
        except Exception as e:
            findings.append({'type': 'SELF_TEST_ERROR', 'severity': 'LOW',
                            'test': test['desc'], 'message': str(e)})
    return findings

# ── Main ──────────────────────────────────────────────────────────────────────

def run_scan():
    start = time.time()
    report = {
        'scan_time': datetime.utcnow().isoformat(),
        'file_integrity': check_file_integrity(),
        'suspicious_processes': check_suspicious_processes(),
        'network_connections': check_network_connections(),
        'api_self_tests': self_test_api(),
    }

    # Summary
    all_findings = (report['file_integrity'] + report['suspicious_processes'] +
                    report['network_connections'] + report['api_self_tests'])
    critical = [f for f in all_findings if f.get('severity') == 'CRITICAL']
    high = [f for f in all_findings if f.get('severity') == 'HIGH']

    report['summary'] = {
        'total_findings': len(all_findings),
        'critical': len(critical),
        'high': len(high),
        'scan_duration_ms': round((time.time() - start) * 1000),
        'status': 'CRITICAL' if critical else 'HIGH' if high else 'CLEAN',
    }
    report['critical_findings'] = critical

    with open(REPORT_FILE, 'w') as f:
        json.dump(report, f, indent=2)

    print(json.dumps(report['summary']))
    return report

if __name__ == '__main__':
    result = run_scan()
    # If critical findings, invoke nexus
    if result['summary']['status'] == 'CRITICAL':
        print("[HELIX] Critical findings — invoking NEXUS healer...")
        os.system('python3 /app/helix/nexus.py')
