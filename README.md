# 🏙️ CivicSight Cloud Platform

CivicSight is a highly scalable, full-stack civic reporting platform designed to bridge the gap between citizens and municipal authorities. Built heavily around modern cloud infrastructure, it enables citizens to report local issues (like potholes, broken streetlights, or waste management problems) and allows city administrators to securely manage, track, and resolve those reports.

---

## ✨ Key Features

- **🛡️ Strict Role-Based Access Control (RBAC):** Built with Amazon Cognito to separate users into logical roles. Citizens can submit and track their own reports, while Staff/Admins have access to a secure backend portal for updating issue statuses.
- **⚡ Lightning Fast Delivery:** The frontend is statically hosted on Amazon S3 and distributed globally via CloudFront CDN.
- **🖼️ Secure Media Storage:** Image reports are uploaded directly and securely to Amazon S3.
- **🚀 Scalable Backend:** Powered by a robust FastAPI backend hosted on an EC2 instance, connecting to a fully managed PostgreSQL database via Amazon RDS.
- **⚙️ Infrastructure as Code (IaC):** The entire AWS cloud infrastructure is modeled and deployed automatically using the AWS Cloud Development Kit (CDK) in Python.

---

## 🛠️ Technology Stack

**Frontend**
- **Framework:** React (Vite)
- **Styling:** Vanilla CSS (Glassmorphism & Modern UI)
- **Language:** TypeScript
- **Hosting:** S3 + CloudFront CDN

**Backend**
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL
- **ORM:** SQLAlchemy

**AWS Cloud Infrastructure**
- **Compute:** EC2 (Backend hosting)
- **Database:** RDS (PostgreSQL Managed Database)
- **Storage:** S3 (Images & Static Web Hosting)
- **Authentication:** Amazon Cognito (User Pools & Identity Pools)
- **Delivery:** CloudFront (CDN)
- **Orchestration:** AWS CDK (Python)

---

## 🏗️ Architecture Overview

1. **User Authentication:** Users authenticate directly with **Amazon Cognito**. Cognito hands back JWT tokens verifying their identity and role (`citizen`, `staff`, `admin`).
2. **Frontend Delivery:** The React app is fetched rapidly from **CloudFront**, which caches the static assets stored in an **S3 Bucket**.
3. **API Requests:** Authorized requests are sent to the **FastAPI** backend running on an EC2 instance. 
4. **Data Persistence:** The API writes relational data (users, issue statuses) to the **RDS PostgreSQL** database, and uploads heavy media (images) to a separate **S3 bucket**.

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js (v18+)
- Python 3.9+
- AWS CLI (configured with credentials)
- AWS CDK CLI

### 1. Backend Setup
```bash
# Navigate to the backend directory
cd api

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
# Navigate to the frontend directory
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```

---

## ☁️ Cloud Deployment

This project uses the AWS CDK to deploy the entire cloud infrastructure.

```bash
# Install CDK dependencies
npm install -g aws-cdk
pip install -r requirements.txt

# Bootstrap your AWS environment (if this is your first time using CDK)
cdk bootstrap

# Deploy the entire stack
cdk deploy
```

Once the CDK finishes deploying, it will output the URLs for your CloudFront distribution, EC2 instance, and Cognito details in your terminal.

---
*Developed by [Afzaal Ahmed Khan](https://github.com/Afziii20).*
