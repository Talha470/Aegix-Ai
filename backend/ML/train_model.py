#!/usr/bin/env python3
"""
AEGIX AI - Enhanced ML Engine v2.0
Ensemble: Isolation Forest + One-Class SVM
13 features, threat_level: ZERO-DAY / SUSPICIOUS
"""
import json
import math
import re
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler
import pickle
import sys
from urllib.parse import unquote

# ── Feature Engineering (13 features) ────────────────────────────────────────

BOT_AGENTS = ['bot','crawl','spider','scan','nikto','nmap','masscan','zgrab',
               'python-requests','curl','wget','sqlmap','hydra','burp','acunetix']

def calc_entropy(s):
    if not s: return 0.0
    freq = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    e = 0.0
    l = len(s)
    for f in freq.values():
        p = f / l
        e -= p * math.log2(p)
    return round(e, 4)

def extract_features(log):
    path = str(log.get('path', log.get('alert', log.get('message', log.get('endpoint', '')))))
    sev_map  = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4}
    src_map  = {'honeypot': 1, 'modsec': 2, 'suricata': 3}
    indicators = ['.env', '..', 'sql', 'xss', 'cmd', 'script', '/etc/', 'passwd',
                  'union', 'select', 'drop', 'insert', 'alert(', 'onerror']
    text = str(log).lower()
    ua   = str(log.get('userAgent', log.get('user_agent', ''))).lower()

    # Decode URL-encoded chars
    try:
        decoded_path = unquote(path)
    except Exception:
        decoded_path = path

    special_chars  = len(re.findall(r"[<>\"'();{}|&$`\\]", path))
    encoded_chars  = path.count('%')
    path_depth     = path.count('/')
    numeric_ratio  = len(re.findall(r'\d', path)) / max(len(path), 1)
    url_entropy    = calc_entropy(path)
    payload_size   = len(str(log.get('payload', '')))

    # Hour of day (0-23)
    ts = str(log.get('timestamp', log.get('time', '')))
    hour = 0
    m = re.search(r'T(\d{2}):', ts)
    if m:
        hour = int(m.group(1))

    is_bot = 1 if any(b in ua for b in BOT_AGENTS) else 0
    has_indicator = 1 if any(i in text for i in indicators) else 0

    return [
        len(path),                          # 1  path length
        sev_map.get(log.get('severity', 'MEDIUM'), 2),  # 2  severity
        src_map.get(log.get('source', ''), 0),          # 3  source
        len(str(log.get('ip', ''))),         # 4  IP length
        has_indicator,                       # 5  attack indicator
        url_entropy,                         # 6  URL entropy
        special_chars,                       # 7  special chars
        encoded_chars,                       # 8  encoded chars
        path_depth,                          # 9  path depth
        round(numeric_ratio, 4),             # 10 numeric ratio
        hour,                                # 11 hour of day
        is_bot,                              # 12 user-agent bot flag
        min(payload_size, 10000),            # 13 payload size (capped)
    ]

# ── Training ──────────────────────────────────────────────────────────────────

def train_model():
    print("AEGIX ML v2.0 — Training Ensemble (IF + OC-SVM)...")
    with open('/app/ML/all_logs_dataset.json', 'r') as f:
        data = json.load(f)

    all_logs = data.get('honeypot', []) + data.get('modsec', []) + data.get('suricata', [])
    print(f"Loaded {len(all_logs)} logs")

    X = np.array([extract_features(log) for log in all_logs])

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Isolation Forest
    iso = IsolationForest(contamination=0.15, random_state=42,
                          n_estimators=300, max_samples='auto', n_jobs=-1)
    iso.fit(X_scaled)

    # One-Class SVM (on sample for speed)
    sample_size = min(5000, len(X_scaled))
    idx = np.random.choice(len(X_scaled), sample_size, replace=False)
    svm = OneClassSVM(kernel='rbf', nu=0.15, gamma='scale')
    svm.fit(X_scaled[idx])

    bundle = {'iso': iso, 'svm': svm, 'scaler': scaler}
    with open('/app/ML/anomaly_model.pkl', 'wb') as f:
        pickle.dump(bundle, f)

    print(f"Ensemble trained on {len(X)} samples | saved to anomaly_model.pkl")

# ── Analysis ──────────────────────────────────────────────────────────────────

def analyze_logs():
    with open('/app/ML/anomaly_model.pkl', 'rb') as f:
        bundle = pickle.load(f)

    # Support old single-model pickle
    if isinstance(bundle, dict):
        iso, svm, scaler = bundle['iso'], bundle['svm'], bundle['scaler']
        ensemble = True
    else:
        iso = bundle
        scaler = None
        ensemble = False

    with open('/app/ML/all_logs_dataset.json', 'r') as f:
        data = json.load(f)

    all_logs = data.get('honeypot', []) + data.get('modsec', []) + data.get('suricata', [])
    recent = all_logs[-100:]

    anomalies = []
    for log in recent:
        features = np.array([extract_features(log)])
        if scaler:
            features = scaler.transform(features)

        iso_pred  = iso.predict(features)[0]
        iso_score = iso.score_samples(features)[0]

        if ensemble:
            svm_pred = svm.predict(features)[0]
            both_agree = (iso_pred == -1 and svm_pred == -1)
            threat_level = 'ZERO-DAY' if both_agree else 'SUSPICIOUS'
        else:
            threat_level = 'SUSPICIOUS'

        if iso_pred == -1:
            anomalies.append({
                'ip': log.get('ip', 'Unknown'),
                'endpoint': log.get('path', log.get('alert', log.get('message', 'N/A'))),
                'attackType': log.get('attack_type', log.get('source', 'Unknown')),
                'severity': log.get('severity', 'MEDIUM'),
                'ml_score': round(float(iso_score), 4),
                'confidence': round(min(abs(float(iso_score)) * 100, 99.9), 1),
                'threat_level': threat_level,
            })

    result = {
        'total_analyzed': len(recent),
        'anomalies_detected': len(anomalies),
        'zero_day_count': sum(1 for a in anomalies if a['threat_level'] == 'ZERO-DAY'),
        'anomalies': anomalies,
    }
    print(json.dumps(result))

# ── Real-time single predict ──────────────────────────────────────────────────

def predict_single():
    log_entry = json.loads(sys.stdin.read())
    with open('/app/ML/anomaly_model.pkl', 'rb') as f:
        bundle = pickle.load(f)

    if isinstance(bundle, dict):
        iso, svm, scaler = bundle['iso'], bundle['svm'], bundle['scaler']
        ensemble = True
    else:
        iso = bundle
        scaler = None
        ensemble = False

    features = np.array([extract_features(log_entry)])
    if scaler:
        features = scaler.transform(features)

    iso_pred  = iso.predict(features)[0]
    iso_score = iso.score_samples(features)[0]
    confidence = min(abs(float(iso_score)), 1.0)

    threat_level = 'NORMAL'
    if iso_pred == -1:
        if ensemble:
            svm_pred = svm.predict(features)[0]
            threat_level = 'ZERO-DAY' if svm_pred == -1 else 'SUSPICIOUS'
        else:
            threat_level = 'SUSPICIOUS'

    print(json.dumps({
        'is_anomaly': iso_pred == -1,
        'anomaly_score': float(iso_score),
        'confidence': round(confidence * 100, 1),
        'threat_level': threat_level,
        'should_block': confidence > 0.80 and iso_pred == -1,
    }))

# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == 'train':
            train_model()
        elif cmd == 'analyze':
            analyze_logs()
        elif cmd == 'predict':
            predict_single()
        else:
            print(f"Unknown command: {cmd}")
    else:
        print("Usage: python3 train_model.py [train|analyze|predict]")
