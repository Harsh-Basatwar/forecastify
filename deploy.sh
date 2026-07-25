#!/bin/bash
set -e

echo "🚀 One-Click Deploy: Forecastify -> Docker -> Kubernetes (Reverse Proxy)"

# Removed eval $(minikube docker-env) due to Docker API version mismatches

# 1. Build the Docker Image on the host machine
echo "📦 Building Docker Image..."
docker build -t darshan11111/forecastify:latest .

# 2. Load the built image directly into Minikube's storage
echo "🚚 Loading Docker Image into Minikube cluster (this may take a minute)..."
minikube image load darshan11111/forecastify:latest

# 2. Setup Kubernetes Namespace
echo "🌐 Setting up Kubernetes Namespace..."
kubectl apply -f k8s/namespace.yaml

# 3. Inject the .env variables securely into K8s Secrets (DO NOT bake into Dockerfile!)
echo "🔐 Injecting Environment Variables securely into Kubernetes..."
if [ -f ".env" ]; then
    kubectl create secret generic forecastify-secrets --from-env-file=.env -n forecastify-prod --dry-run=client -o yaml | kubectl apply -f -
else
    echo "⚠️ Warning: .env file not found! Pods may crash without environment variables."
fi

# 4. Deploy Frontend, API, Jarvis, and NGINX Ingress Reverse Proxy
echo "🚢 Deploying Microservices & NGINX Reverse Proxy..."
kubectl apply -f k8s/

echo "✅ One-Click Deployment Complete!"
echo "📡 Your NGINX Reverse Proxy Ingress is now routing traffic."
echo "👀 Watching pods start up..."
kubectl get pods -n forecastify-prod -w
