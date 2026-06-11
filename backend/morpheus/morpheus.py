#!/usr/bin/env python3
"""
AEGIX AI — MORPHEUS: Moving Target Defense Engine
Rotates endpoint tokens every 60 seconds.
Stores current token in /tmp/morpheus_token.json
Run as background service: nohup python3 morpheus.py &
"""
import json, time, random, string, os, signal, sys
from datetime import datetime

TOKEN_FILE = '/tmp/morpheus_token.json'
ROTATE_INTERVAL = 60  # seconds
HISTORY_SIZE = 3       # keep last N tokens valid (grace period)

token_history = []
running = True

def signal_handler(sig, frame):
    global running
    print("[MORPHEUS] Shutting down...")
    running = False
    sys.exit(0)

def gen_token(length=8):
    chars = string.ascii_lowercase + string.digits
    return ''.join(random.choices(chars, k=length))

def rotate():
    global token_history
    new_token = gen_token()
    now = datetime.utcnow().isoformat()
    token_history.append({'token': new_token, 'created_at': now})
    if len(token_history) > HISTORY_SIZE:
        token_history = token_history[-HISTORY_SIZE:]

    data = {
        'current': new_token,
        'history': token_history,
        'rotated_at': now,
        'next_rotation_in': ROTATE_INTERVAL,
        'total_rotations': getattr(rotate, 'count', 0),
    }
    rotate.count = getattr(rotate, 'count', 0) + 1

    with open(TOKEN_FILE, 'w') as f:
        json.dump(data, f)

    print(f"[MORPHEUS] Token rotated → /api/{new_token}/login at {now}")
    return new_token

def main():
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    print("[MORPHEUS] Starting Moving Target Defense Engine...")
    print(f"[MORPHEUS] Rotation interval: {ROTATE_INTERVAL}s | History: {HISTORY_SIZE} tokens")

    # Initial rotation
    rotate()

    while running:
        time.sleep(ROTATE_INTERVAL)
        if running:
            rotate()

if __name__ == '__main__':
    main()
