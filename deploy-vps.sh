#!/bin/bash
sshpass -p 'aqil@noon' ssh -o StrictHostKeyChecking=no aqil@187.127.154.55 << 'EOF'
cd /var/www/socialsched
echo "aqil@noon" | sudo -S git fetch origin
echo "aqil@noon" | sudo -S git reset --hard origin/main
echo "aqil@noon" | sudo -S bash deploy/deploy.sh
EOF
