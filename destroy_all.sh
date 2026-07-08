#!/bin/bash
set -e

echo "======================================"
echo " CivicSight Teardown Script           "
echo "======================================"

echo "Warning: This will destroy ALL resources (Database, EC2, S3, Cognito)."
read -p "Are you sure you want to proceed? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Aborted."
    exit 1
fi

echo "[1/2] Destroying CDK Infrastructure..."
npx cdk destroy --force

echo "[2/2] Cleaning up local files..."
rm -f cdk-outputs.json
rm -f api.tar.gz
rm -f setup_backend.sh

echo "======================================"
echo " Teardown Complete!                   "
echo "======================================"
