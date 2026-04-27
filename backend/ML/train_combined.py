#!/usr/bin/env python3
import json
import numpy as np
from sklearn.ensemble import IsolationForest
import pickle

def extract_features_multi(log):
    """Extract features from any log type"""
    features = []
    
    # Feature 1: Path/endpoint length
    path = log.get('path', log.get('alert', log.get('message', '')))
    features.append(len(str(path)))
    
    # Feature 2: Severity score
    severity_map = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4}
    features.append(severity_map.get(log.get('severity', 'MEDIUM'), 2))
    
    # Feature 3: Source type
    source_map = {'honeypot': 1, 'modsec': 2, 'suricata': 3}
    features.append(source_map.get(log.get('source', 'unknown'), 0))
    
    # Feature 4: IP uniqueness (string length as proxy)
    features.append(len(str(log.get('ip', ''))))
    
    # Feature 5: Attack indicator (binary)
    indicators = ['.env', '..', 'sql', 'xss', 'cmd', 'script', '/etc/', 'passwd']
    text = str(log).lower()
    has_attack = 1 if any(ind in text for ind in indicators) else 0
    features.append(has_attack)
    
    return features

def train_on_combined():
    """Train on combined dataset"""
    print("🤖 Training ML Model on Combined Data...")
    
    # Load dataset
    with open('all_logs_dataset.json', 'r') as f:
        data = json.load(f)
    
    # Combine all logs
    all_logs = []
    all_logs.extend(data.get('honeypot', []))
    all_logs.extend(data.get('modsec', []))
    all_logs.extend(data.get('suricata', []))
    
    print(f"📊 Total training samples: {len(all_logs)}")
    
    # Extract features
    X_train = np.array([extract_features_multi(log) for log in all_logs])
    
    print(f"✅ Feature matrix shape: {X_train.shape}")
    
    # Train Isolation Forest
    model = IsolationForest(
        contamination=0.2,  # 20% anomalies expected
        random_state=42,
        n_estimators=300,
        max_samples='auto',
        n_jobs=-1  # Use all CPU cores
    )
    
    print("⚙️  Training model...")
    model.fit(X_train)
    
    # Save model
    with open('anomaly_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    
    print("✅ Model trained successfully!")
    print(f"   - Algorithm: Isolation Forest")
    print(f"   - Training samples: {len(X_train)}")
    print(f"   - Features: {X_train.shape[1]}")
    print(f"   - Estimators: 300")
    print(f"   - Contamination: 20%")
    print("💾 Saved: anomaly_model.pkl")

if __name__ == '__main__':
    train_on_combined()
