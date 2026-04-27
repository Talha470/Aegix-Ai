#!/usr/bin/env python3
import json
import numpy as np
from sklearn.ensemble import IsolationForest
import pickle
import sys

def extract_features(log):
    path = log.get('path', log.get('alert', log.get('message', log.get('endpoint', ''))))
    sev = {'LOW':1,'MEDIUM':2,'HIGH':3,'CRITICAL':4}
    src = {'honeypot':1,'modsec':2,'suricata':3}
    indicators = ['.env','..','sql','xss','cmd','script','/etc/','passwd']
    text = str(log).lower()
    return [
        len(str(path)),
        sev.get(log.get('severity','MEDIUM'), 2),
        src.get(log.get('source',''), 0),
        len(str(log.get('ip',''))),
        1 if any(i in text for i in indicators) else 0
    ]

def train_model():
    print("Training on Real Attack Data...")
    with open('/app/ML/all_logs_dataset.json', 'r') as f:
        data = json.load(f)
    
    all_logs = data.get('honeypot',[]) + data.get('modsec',[]) + data.get('suricata',[])
    print(f"Loaded {len(all_logs)} logs")
    
    X_train = np.array([extract_features(log) for log in all_logs])
    
    model = IsolationForest(
        contamination=0.2,
        random_state=42,
        n_estimators=300,
        max_samples='auto'
    )
    model.fit(X_train)
    
    with open('/app/ML/anomaly_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    
    print(f"Model trained on {len(X_train)} samples")

def analyze_logs():
    with open('/app/ML/anomaly_model.pkl', 'rb') as f:
        model = pickle.load(f)
    
    with open('/app/ML/all_logs_dataset.json', 'r') as f:
        data = json.load(f)
    
    all_logs = data.get('honeypot',[]) + data.get('modsec',[]) + data.get('suricata',[])
    recent = all_logs[-50:]
    
    anomalies = []
    for log in recent:
        features = np.array([extract_features(log)])
        pred = model.predict(features)[0]
        score = model.score_samples(features)[0]
        
        if pred == -1:
            anomalies.append({
                'ip': log.get('ip', 'Unknown'),
                'endpoint': log.get('path', log.get('alert', log.get('message', 'N/A'))),
                'attackType': log.get('attack_type', log.get('source', 'Unknown')),
                'severity': log.get('severity', 'MEDIUM'),
                'ml_score': round(float(score), 4),
                'confidence': round(abs(float(score)) * 100, 1)
            })
    
    result = {
        'total_analyzed': len(recent),
        'anomalies_detected': len(anomalies),
        'anomalies': anomalies
    }
    print(json.dumps(result))

def predict_single():
    log_entry = json.loads(sys.stdin.read())
    with open('/app/ML/anomaly_model.pkl', 'rb') as f:
        model = pickle.load(f)
    features = np.array([extract_features(log_entry)])
    pred = model.predict(features)[0]
    score = model.score_samples(features)[0]
    print(json.dumps({
        'is_anomaly': pred == -1,
        'anomaly_score': float(score),
        'confidence': abs(float(score))
    }))

if __name__ == '__main__':
    if len(sys.argv) > 1:
        if sys.argv[1] == 'train':
            train_model()
        elif sys.argv[1] == 'analyze':
            analyze_logs()
        elif sys.argv[1] == 'predict':
            predict_single()
    else:
        print("Usage: python3 train_model.py [train|analyze|predict]")
