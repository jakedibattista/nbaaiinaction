#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment process..."

# Step 1: Deploy MCP Server
echo "📦 Deploying MCP Server..."
gcloud builds submit --config=cloudbuild-mcp.yaml

# Get MCP Server URL
MCP_URL=$(gcloud run services describe nba-mcp-server --platform managed --region us-central1 --format 'value(status.url)')
echo "✅ MCP Server deployed at: $MCP_URL"

# Step 2: Deploy API Server
echo "📦 Deploying API Server..."
# Update MCP URL in API deployment
sed -i "s|_MCP_SERVER_URL: '.*'|_MCP_SERVER_URL: '$MCP_URL'|" cloudbuild-api.yaml
gcloud builds submit --config=cloudbuild-api.yaml

# Get API Server URL
API_URL=$(gcloud run services describe nba-api-server --platform managed --region us-central1 --format 'value(status.url)')
echo "✅ API Server deployed at: $API_URL"

# Step 3: Deploy Client
echo "📦 Deploying Client..."
# Update API URL in client deployment
sed -i "s|_API_SERVER_URL: '.*'|_API_SERVER_URL: '$API_URL'|" cloudbuild-client.yaml
gcloud builds submit --config=cloudbuild-client.yaml

# Get Client URL
CLIENT_URL=$(gcloud run services describe nba-client --platform managed --region us-central1 --format 'value(status.url)')
echo "✅ Client deployed at: $CLIENT_URL"

echo "🎉 Deployment complete! Your application is available at: $CLIENT_URL" 