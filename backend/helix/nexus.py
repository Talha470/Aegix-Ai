#!/usr/bin/env python3
"""
AEGIX AI — NEXUS: Self-Healing Engine
Reads HELIX report and auto-heals:
- Restore tampered files from git
- Kill suspicious processes
- Block suspicious IPs
- Reload NGINX after fixes
- Generate ModSecurity rules for new vulnerabilities
"""
import json, os, subprocess, sys
from datetime import datetime

REPORT_FILE = '/tmp/helix_report.json'
HEAL_LOG = '/tmp/nexus_heal.log'
APP_DIR = '/app'

def log(msg):
    ts = datetime.utcnow().isoformat()
    line = f"[{ts}] [NEXUS] {msg}"
    print(line)
    with open(HEAL_LOG, 'a') as f:
        f.write(line + '\n')

def run(cmd, check=False):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        return result.returncode == 0, result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return False, '', str(e)

# ── Healing Actions ───────────────────────────────────────────────────────────

def restore_file(filepath):
    """Restore file from git."""
    log(f"Restoring tampered file: {filepath}")
    rel = os.path.relpath(filepath, APP_DIR)
    ok, out, err = run(f"cd {APP_DIR} && git checkout HEAD -- {rel}")
    if ok:
        log(f"RESTORED: {filepath}")
    else:
        log(f"RESTORE FAILED: {filepath} | {err}")
    return ok

def kill_process(proc_name):
    """Kill suspicious process."""
    log(f"Killing suspicious process: {proc_name}")
    ok, out, err = run(f"pkill -f {proc_name}")
    if ok:
        log(f"KILLED: {proc_name}")
    return ok

def block_ip(ip, reason='NEXUS auto-block'):
    """Block IP via UFW."""
    log(f"Blocking IP: {ip} — {reason}")
    ok, _, _ = run(f"sudo ufw deny from {ip} to any comment 'NEXUS: {reason}'")
    return ok

def reload_nginx():
    """Reload NGINX after fixes."""
    log("Reloading NGINX...")
    ok, _, err = run("sudo nginx -t && sudo systemctl reload nginx")
    if ok:
        log("NGINX reloaded successfully")
    else:
        log(f"NGINX reload failed: {err}")
    return ok

def generate_modsec_rule(vuln_type, detail):
    """Generate and append a ModSecurity rule for new vulnerability patterns."""
    rule_file = '/etc/nginx/modsecurity/custom_rules.conf'
    rule_id = 9900 + hash(detail) % 100
    rules = {
        'SQLi': f'SecRule ARGS "@detectSQLi" "id:{rule_id},phase:2,deny,status:403,msg:\'NEXUS-SQLi-Block\'"',
        'XSS': f'SecRule ARGS "@detectXSS" "id:{rule_id+10},phase:2,deny,status:403,msg:\'NEXUS-XSS-Block\'"',
    }
    rule = rules.get(vuln_type, '')
    if rule:
        log(f"Generating ModSecurity rule for {vuln_type}: {rule[:80]}...")
        try:
            with open(rule_file, 'a') as f:
                f.write(f"\n# NEXUS auto-generated {datetime.utcnow().isoformat()}\n{rule}\n")
            reload_nginx()
        except Exception as e:
            log(f"Rule generation failed: {e}")

def verify_fix(filepath):
    """Verify file hash matches expected after restore."""
    import hashlib
    baseline_file = '/app/helix/baseline.json'
    try:
        with open(baseline_file) as f:
            baseline = json.load(f)
        h = hashlib.sha256()
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(65536), b''):
                h.update(chunk)
        match = (h.hexdigest() == baseline.get(filepath, ''))
        log(f"Fix verification {'PASSED' if match else 'FAILED'}: {filepath}")
        return match
    except Exception:
        return False

# ── Main Healer ───────────────────────────────────────────────────────────────

def heal():
    log("=== NEXUS Healing Sequence Started ===")

    if not os.path.exists(REPORT_FILE):
        log("No HELIX report found. Exiting.")
        return

    with open(REPORT_FILE) as f:
        report = json.load(f)

    healed = []
    failed = []

    # 1. Fix tampered files
    for finding in report.get('file_integrity', []):
        if finding['type'] == 'FILE_TAMPERED':
            fp = finding['file']
            ok = restore_file(fp)
            if ok:
                verify_fix(fp)
                healed.append(f"RESTORED: {fp}")
            else:
                failed.append(f"FAILED RESTORE: {fp}")

    # 2. Kill suspicious processes
    for finding in report.get('suspicious_processes', []):
        if finding['type'] == 'SUSPICIOUS_PROCESS':
            proc = finding.get('detail', '').split()[0] if finding.get('detail') else ''
            if proc:
                ok = kill_process(proc)
                if ok:
                    healed.append(f"KILLED: {proc}")
                else:
                    failed.append(f"FAILED KILL: {proc}")

    # 3. Handle API vulnerabilities
    for finding in report.get('api_self_tests', []):
        if finding['type'] == 'API_VULNERABILITY':
            vuln = 'SQLi' if 'sql' in finding.get('test','').lower() else 'XSS'
            generate_modsec_rule(vuln, finding.get('test', ''))
            healed.append(f"MODSEC RULE: {finding['test']}")

    # 4. Reload NGINX if any fixes were applied
    if healed:
        reload_nginx()

    # Summary
    summary = {
        'healed_at': datetime.utcnow().isoformat(),
        'healed': healed,
        'failed': failed,
        'total_healed': len(healed),
        'total_failed': len(failed),
    }

    with open('/tmp/nexus_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)

    log(f"=== NEXUS Complete: {len(healed)} healed, {len(failed)} failed ===")
    return summary

if __name__ == '__main__':
    heal()
