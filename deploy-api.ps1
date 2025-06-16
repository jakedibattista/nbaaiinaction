# Exit on error
$ErrorActionPreference = "Stop"

# Set your project ID
$PROJECT_ID = "aiinaction-462118"
$REGION = "us-central1"

Write-Host "Deploying API Server..." -ForegroundColor Yellow

# Get MCP Server URL first
$MCP_URL = gcloud run services describe nba-mcp-server --platform managed --region $REGION --format="value(status.url)" --project $PROJECT_ID
Write-Host "Using MCP Server URL: $MCP_URL" -ForegroundColor Cyan

# Build and deploy API Server
docker build -t gcr.io/$PROJECT_ID/nba-agent-api ./server
docker push gcr.io/$PROJECT_ID/nba-agent-api
gcloud run deploy nba-agent-api `
    --image gcr.io/$PROJECT_ID/nba-agent-api `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --memory 1Gi `
    --cpu 1 `
    --min-instances 1 `
    --max-instances 10 `
    --port 8080 `
    --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest,MONGO_URI=MONGO_URI:latest" `
    --set-env-vars MCP_SERVER_URL=$MCP_URL `
    --project $PROJECT_ID

# Get API Server URL
$API_URL = gcloud run services describe nba-agent-api --platform managed --region $REGION --format="value(status.url)" --project $PROJECT_ID
Write-Host "API Server deployed at: $API_URL" -ForegroundColor Green 