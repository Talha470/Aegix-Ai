#!/usr/bin/env python3
import json
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM
import pickle
import sys
import math
import re
import os

DATASET_PATH = '/app/ML/all_logs_dataset.json'
MODEL_PATH = '/app/ML/anomaly_model.pkl'

def extract_features(log):
    path = str(log.get('path', log.get('alert', log.get('message', log.get('endpoint', '')))))
    ip = str(log.get('ip', ''))
    ua = str(log.get('user_agent', ''))
    text = str(log).lower()

    f1 = min(len(path), 500)

    sev = {'LOW':1,'MEDIUM':2,'HIGH':3,'CRITICAL':4}
    f2 = sev.get(log.get('severity','MEDIUM'), 2)

    src = {'honeypot':1,'modsec':2,'suricata':3}
    f3 = src.get(log.get('source',''), 0)

    f4 = len(ip)

    known = ['.env','..','sql','xss','cmd','script','/etc/','passwd','union','select']
    f5 = 1 if any(i in text for i in known) else 0

    def entropy(s):
        if not s: return 0
        freq = {}
        for c in s:
            freq[c] = freq.get(c, 0) + 1
        return -sum((v/len(s))*math.log2(v/len(s)) for v in freq.values())
    f6 = round(entropy(path), 4)

    f7 = len(re.findall(r'[%<>{}|\\^`\[\];\'"()]', path))
    f8 = path.count('%')
    f9 = path.count('..')

    digits = sum(c.isdigit() for c in path)
    f10 = round(digits / max(len(path), 1), 4)

    import datetime
    hour = datetime.datetime.now().hour
    f11 = 1 if 1 <= hour <= 6 else 0

    bots = ['python','curl','wget','nikto','sqlmap','nmap','masscan','zgrab','bot','crawler']
    f12 = 1 if any(b in ua.lower() for b in bots) else 0

    f13 = min(len(text), 1000)

    return [f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13]

def train_model():
    print("AEGIX ML v2.0 — Training Ensemble (IF + OC-SVM)...")
    with open(DATASET_PATH, 'r') as f:
        data = json.load(f)

    all_logs = data.get('honeypot',[]) + data.get('modsec',[]) + data.get('suricata',[])
    print(f"Loaded {len(all_logs)} logs")

    X = np.array([extract_features(log) for log in all_logs])

    model_if = IsolationForest(contamination=0.2, n_estimators=100, random_state=42, n_jobs=-1)
    model_if.fit(X)

    # SVM only on small sample (fast)
    sample_size = min(2000, len(X))
    idx = np.random.choice(len(X), sample_size, replace=False)
    model_svm = OneClassSVM(kernel='rbf', gamma='scale', nu=0.2)
    model_svm.fit(X[idx])

    with open(MODEL_PATH, 'wb') as f:
        pickle.dump({'isolation_forest': model_if, 'svm': model_svm}, f)

    print(f"Model trained on {len(X)} samples | Features: {X.shape[1]}")

def analyze_logs():
    with open(MODEL_PATH, 'rb') as f:
        models = pickle.load(f)

    if isinstance(models, dict):
        model_if = models['isolation_forest']
        model_svm = models.get('svm')
    else:
        model_if = models
        model_svm = None

    with open(DATASET_PATH, 'r') as f:
        data = json.load(f)

    all_logs = data.get('honeypot',[]) + data.get('modsec',[]) + data.get('suricata',[])
    recent = all_logs[-100:]

    anomalies = []
    for log in recent:
        features = np.array([extract_features(log)])
        pred_if = model_if.predict(features)[0]
        score_if = model_if.score_samples(features)[0]

        pred_svm = model_svm.predict(features)[0] if model_svm else pred_if

        votes = [pred_if, pred_svm].count(-1)

        if votes >= 1:
            threat_level = 'ZERO-DAY' if votes == 2 else 'SUSPICIOUS'
            confidence = round(abs(float(score_if)) * 100, 1)

            anomalies.append({
                'ip': log.get('ip', 'Unknown'),
                'endpoint': str(log.get('path', log.get('alert', log.get('message', 'N/A'))))[:100],
                'attackType': log.get('attack_type', log.get('source', 'Unknown')),
                'severity': log.get('severity', 'HIGH'),
                'ml_score': round(float(score_if), 4),
                'confidence': confidence,
                'threat_level': threat_level,
                'models_agreed': votes
            })

    result = {
        'total_analyzed': len(recent),
        'anomalies_detected': len(anomalies),
        'zero_day_detected': len([a for a in anomalies if a['threat_level']=='ZERO-DAY']),
        'suspicious': len([a for a in anomalies if a['threat_level']=='SUSPICIOUS']),
        'anomalies': anomalies
    }
    print(json.dumps(result))

if __name__ == '__main__':
    if len(sys.argv) > 1:
        if sys.argv[1] == 'train':
            train_model()
        elif sys.argv[1] == 'analyze':
            analyze_logs()
    else:
        print("Usage: python3 train_model.py [train|analyze]")
