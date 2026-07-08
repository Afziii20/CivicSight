#!/bin/bash
set -e
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg --yes
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

cat << 'CADDY_EOF' | sudo tee /etc/caddy/Caddyfile
13.233.129.94.nip.io {
    reverse_proxy localhost:8000
}
CADDY_EOF

sudo iptables -t nat -D PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8000 || true
sudo systemctl restart caddy
