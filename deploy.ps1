# Exit on error
$ErrorActionPreference = "Stop"

# Set gcloud path
$GCLOUD_PATH = 'C:\Users\JD\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud'

Write-Host '🚀 Starting deployment process...' -ForegroundColor Green

# Step 1: Deploy MCP Server
Write-Host '📦 Deploying MCP Server...' -ForegroundColor Yellow
& $GCLOUD_PATH builds submit --config=cloudbuild-mcp.yaml

# Get MCP Server URL
$MCP_URL = & $GCLOUD_PATH run services describe nba-mcp-server --platform managed --region us-central1 --format 'value(status.url)'
Write-Host "✅ MCP Server deployed at: $MCP_URL" -ForegroundColor Green

# Step 2: Deploy API Server
Write-Host '📦 Deploying API Server...' -ForegroundColor Yellow
# Update MCP URL in API deployment
(Get-Content cloudbuild-api.yaml) -replace "_MCP_SERVER_URL: '.*'", "_MCP_SERVER_URL: '$MCP_URL'" | Set-Content cloudbuild-api.yaml
& $GCLOUD_PATH builds submit --config=cloudbuild-api.yaml

# Get API Server URL
$API_URL = & $GCLOUD_PATH run services describe nba-api-server --platform managed --region us-central1 --format 'value(status.url)'
Write-Host "✅ API Server deployed at: $API_URL" -ForegroundColor Green

# Step 3: Deploy Client
Write-Host '📦 Deploying Client...' -ForegroundColor Yellow
# Update API URL in client deployment
(Get-Content cloudbuild-client.yaml) -replace "_API_SERVER_URL: '.*'", "_API_SERVER_URL: '$API_URL'" | Set-Content cloudbuild-client.yaml
& $GCLOUD_PATH builds submit --config=cloudbuild-client.yaml

# Get Client URL
$CLIENT_URL = & $GCLOUD_PATH run services describe nba-client --platform managed --region us-central1 --format 'value(status.url)'
Write-Host "✅ Client deployed at: $CLIENT_URL" -ForegroundColor Green

Write-Host "🎉 Deployment complete! Your application is available at: $CLIENT_URL" -ForegroundColor Green 