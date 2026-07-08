#!/bin/bash
set -e

echo "======================================"
echo " CivicSight Full Deployment Script    "
echo "======================================"

# Check for jq
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed."
    echo "Please install jq (e.g. 'brew install jq' or 'sudo apt install jq') and try again."
    exit 1
fi

echo "[1/5] Deploying AWS Infrastructure via CDK..."
source .venv/bin/activate
npx cdk deploy --require-approval never --outputs-file cdk-outputs.json

echo "[2/5] Extracting Configuration from CDK Outputs..."
DISTRIBUTION_ID=$(jq -r '.VtStack.DistributionId' cdk-outputs.json)
EC2_INSTANCE_ID=$(jq -r '.VtStack.Ec2InstanceId' cdk-outputs.json)
EC2_PUBLIC_IP=$(jq -r '.VtStack.Ec2PublicIp' cdk-outputs.json)
FRONTEND_BUCKET=$(jq -r '.VtStack.FrontendBucketName' cdk-outputs.json)
PHOTOS_BUCKET=$(jq -r '.VtStack.PhotosBucketName' cdk-outputs.json)
FRONTEND_URL=$(jq -r '.VtStack.FrontendUrl' cdk-outputs.json)
USER_POOL_ID=$(jq -r '.VtStack.UserPoolId' cdk-outputs.json)
USER_POOL_CLIENT_ID=$(jq -r '.VtStack.UserPoolClientId' cdk-outputs.json)
RDS_SECRET_ARN=$(jq -r '.VtStack.RdsSecretArn' cdk-outputs.json)
# Using regex to extract region from Secret ARN
REGION=$(echo $RDS_SECRET_ARN | cut -d: -f4)

echo "EC2 IP: $EC2_PUBLIC_IP"
echo "Frontend URL: $FRONTEND_URL"

echo "[3/5] Deploying Frontend..."
cat << EOF > frontend/.env.production
# Production — uses Cognito auth + EC2 API
VITE_API_URL=https://${EC2_PUBLIC_IP}.nip.io
VITE_COGNITO_REGION=${REGION}
VITE_COGNITO_USER_POOL_ID=${USER_POOL_ID}
VITE_COGNITO_CLIENT_ID=${USER_POOL_CLIENT_ID}
EOF

cd frontend
npm install
npm run build
aws s3 sync dist/ s3://${FRONTEND_BUCKET}/ --delete --region ${REGION}
cd ..

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id ${DISTRIBUTION_ID} --paths "/*" > /dev/null

echo "[4/5] Preparing Backend..."
# Fetch DB password from Secrets Manager
DB_SECRET=$(aws secretsmanager get-secret-value --secret-id ${RDS_SECRET_ARN} --region ${REGION} --query SecretString --output text)
DB_PASSWORD=$(echo $DB_SECRET | jq -r '.password')
DB_HOST=$(echo $DB_SECRET | jq -r '.host')
DB_USER=$(echo $DB_SECRET | jq -r '.username')

# URL encode the password for SQLAlchemy using python
DB_PASSWORD_ENCODED=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$DB_PASSWORD")
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD_ENCODED}@${DB_HOST}:5432/postgres?sslmode=require"

# Create a setup script for the EC2 instance
cat << EOF > setup_backend.sh
#!/bin/bash
set -e

echo "Updating system..."
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv libpq-dev postgresql-client debian-keyring debian-archive-keyring apt-transport-https curl

echo "Installing Caddy..."
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg --yes
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy

echo "Extracting API..."
tar -xzf api.tar.gz
cd api

echo "Setting up Python environment..."
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

echo "Writing environment variables..."
cat << 'INNER_EOF' > .env
DATABASE_URL=${DATABASE_URL}
COGNITO_REGION=${REGION}
COGNITO_USER_POOL_ID=${USER_POOL_ID}
COGNITO_APP_CLIENT_ID=${USER_POOL_CLIENT_ID}
S3_BUCKET_NAME=${PHOTOS_BUCKET}
ALLOWED_ORIGINS=${FRONTEND_URL},http://localhost:5173,https://${EC2_PUBLIC_IP}.nip.io
IS_PRODUCTION=true
ENV=production
INNER_EOF

echo "Setting up Caddy..."
cat << 'CADDY_EOF' | sudo tee /etc/caddy/Caddyfile
${EC2_PUBLIC_IP}.nip.io {
    reverse_proxy localhost:8000
}
CADDY_EOF

sudo iptables -t nat -D PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8000 2>/dev/null || true
sudo systemctl restart caddy

echo "Starting Uvicorn..."
pkill -f uvicorn || true
nohup venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > api.log 2>&1 &
echo "Backend deployment complete."
EOF

echo "Packaging backend..."
tar -czf api.tar.gz api/

echo "[5/5] Deploying Backend to EC2..."
# Ensure we have a local SSH key
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "Generating SSH key..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
fi

# Push temporary SSH key
aws ec2-instance-connect send-ssh-public-key --instance-id ${EC2_INSTANCE_ID} --instance-os-user ubuntu --ssh-public-key file://$HOME/.ssh/id_rsa.pub --region ${REGION} > /dev/null

# SCP files
scp -o StrictHostKeyChecking=no -i ~/.ssh/id_rsa api.tar.gz setup_backend.sh ubuntu@${EC2_PUBLIC_IP}:~

# Execute remote setup
ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_rsa ubuntu@${EC2_PUBLIC_IP} "bash setup_backend.sh"

echo "======================================"
echo " Deployment Complete!                 "
echo " Access your app at: $FRONTEND_URL    "
echo "======================================"
