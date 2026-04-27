#!/usr/bin/env python3
import json
import re
from datetime import datetime

def parse_honeypot_logs():
    """Parse HTTP honeypot logs"""
    logs = []
    try:
        with open('/var/log/nginx/honeypot.log', 'r') as f:
            for line in f:
                # Parse NGINX log format
                match = re.match(r'(\S+) - - \[(.*?)\] "(\S+) (\S+) .*?" (\d+)', line)
                if match:
                    ip, timestamp, method, path, status = match.groups()
                    logs.append({
                        'source': 'honeypot',
                        'ip': ip,
                        'method': method,
                        'path': path,
                        'status': int(status),
                        'timestamp': timestamp,
                        'severity': 'HIGH' if '.env' in path or '..' in path else 'MEDIUM'
                    })
    except Exception as e:
        print(f"Honeypot error: {e}")
    return logs

def parse_modsec_logs():
    """Parse ModSecurity logs"""
    logs = []
    try:
        with open('/var/log/nginx/error.log', 'r') as f:
            for line in f:
                if 'ModSecurity' in line:
                    # Extract IP
                    ip_match = re.search(r'client: (\S+)', line)
                    ip = ip_match.group(1) if ip_match else 'unknown'
                    
                    # Determine attack type
                    attack_type = 'Unknown'
                    if 'SQL' in line:
                        attack_type = 'SQL Injection'
                    elif 'XSS' in line:
                        attack_type = 'XSS'
                    elif 'traversal' in line.lower():
                        attack_type = 'Path Traversal'
                    
                    logs.append({
                        'source': 'modsec',
                        'ip': ip,
                        'attack_type': attack_type,
                        'severity': 'CRITICAL',
                        'message': line.strip()
                    })
    except Exception as e:
        print(f"ModSec error: {e}")
    return logs

def parse_suricata_logs():
    """Parse Suricata logs"""
    logs = []
    try:
        with open('/var/log/suricata/fast.log', 'r') as f:
            for line in f:
                parts = line.split('[**]')
                if len(parts) >= 2:
                    logs.append({
                        'source': 'suricata',
                        'alert': parts[1].strip() if len(parts) > 1 else 'unknown',
                        'severity': 'HIGH'
                    })
    except Exception as e:
        print(f"Suricata error: {e}")
    return logs

def combine_all():
    """Combine all logs"""
    print("🔍 Collecting logs from all sources...")
    
    honeypot = parse_honeypot_logs()
    modsec = parse_modsec_logs()
    suricata = parse_suricata_logs()
    
    print(f"✅ HTTP Honeypot: {len(honeypot)} logs")
    print(f"✅ ModSecurity: {len(modsec)} logs")
    print(f"✅ Suricata: {len(suricata)} logs")
    print(f"📊 Total: {len(honeypot) + len(modsec) + len(suricata)} logs")
    
    # Save combined
    combined = {
        'honeypot': honeypot,
        'modsec': modsec,
        'suricata': suricata
    }
    
    with open('all_logs_dataset.json', 'w') as f:
        json.dump(combined, f, indent=2)
    
    print("💾 Saved: all_logs_dataset.json")
    return combined

if __name__ == '__main__':
    combine_all()
