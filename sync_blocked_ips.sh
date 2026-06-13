#!/bin/bash
# AEGIX AI — UFW Sync Script
# Reads blocked IPs from container file and applies UFW rules on host
# Run via cron: */1 * * * * /home/azureuser/sync_blocked_ips.sh

BLOCKED_FILE="/home/azureuser/Aegix-Ai/backend/blocked_ips.txt"
LOG_FILE="/tmp/ufw_sync.log"

if [ ! -f "$BLOCKED_FILE" ]; then
    exit 0
fi

while IFS= read -r ip; do
    # Skip empty lines and comments
    [[ -z "$ip" || "$ip" == \#* ]] && continue

    # Validate basic IP format
    if [[ ! "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        continue
    fi

    # Check if already blocked in UFW
    if sudo ufw status | grep -q "$ip"; then
        continue
    fi

    # Apply UFW rule
    sudo ufw deny from "$ip" to any comment "AEGIX-AUTO" 2>/dev/null
    echo "$(date '+%Y-%m-%d %H:%M:%S'): Blocked $ip via UFW" >> "$LOG_FILE"

done < "$BLOCKED_FILE"
