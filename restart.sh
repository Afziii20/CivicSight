#!/bin/bash
pkill -f uvicorn || true
sleep 2
cd /home/ubuntu/api
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > /home/ubuntu/api.log 2>&1 &
sudo systemctl restart caddy
