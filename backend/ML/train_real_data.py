#!/usr/bin/env python3
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import pickle
import json
import sys
sys.path.insert(0, '/usr/lib/python3/dist-packages')

def load_from_mongodb():
    """Load logs from MongoDB"""
    from pymongo import MongoClient
    
    try:
        client = MongoClient('mongodb://localhost:27017/')
        db = client['aegixdb']
        logs = list(db.logs.find().limit(1000))  # Last 1000 logs
        
        print(f"✅ Loaded {len(logs)} logs from MongoDB")
        return logs
    except Exception as e:
        print(f"❌ MongoDB error: {e}")
        return []

def extract_features(log):
    """Extract features from log"""
    features = []
    
    # Endpoint length
    features.append(len(str(log.get('endpoint', ''))))
    
    # Hour of day
    try:
        time_str = log.get('time', '00:00:00')
        hour = int(time_str.split(':')[0])
        features.append(hour)
    except:
        features.append(0)
    
    # Attack type encoding
    attack_map = {
        'SQL Injection': 1,
        'XSS': 2,
        'Path Traversal': 3,
        'Command Injection': 4,
        'Unknown': 0
    }
    features.append(attack_map.get(log.get('attackType'), 0))
    
    # Severity
    severity_map = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4}
    features.append(severity_map.get(log.get('severity'), 0))
    
    # IP length
    features.append(len(str(log.get('ip', ''))))
    
    return features

def train_on_real_data():
    """Train model on real MongoDB logs"""
    print("🤖 Training on Real Data...")
    
    # Load logs
    logs = load_from_mongodb()
    
    if len(logs) < 50:
        print("❌ Not enough logs! Need at least 50.")
        return
    
    # Filter: Use only LOW/MEDIUM severity as "normal"
    normal_logs = [log for log in logs if log.get('severity') in ['LOW', 'MEDIUM', 'Unknown']]
    
    print(f"📊 Using {len(normal_logs)} normal logs for training")
    
    # Extract features
    X_train = np.array([extract_features(log) for log in normal_logs])
    
    # Train model
    model = IsolationForest(
        contamination=0.15,  # 15% anomalies expected
        random_state=42,
        n_estimators=200
    )
    
    model.fit(X_train)
    
    # Save model
    with open('anomaly_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    
    print("✅ Model trained on REAL data!")
    print(f"   - Training samples: {len(X_train)}")
    print(f"   - Features: 5")
    print(f"   - Algorithm: Isolation Forest")

if __name__ == '__main__':
    train_on_real_data()
