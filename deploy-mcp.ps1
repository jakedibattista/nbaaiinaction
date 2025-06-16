# Exit on error
$ErrorActionPreference = "Stop"

# Set your project ID
$PROJECT_ID = "aiinaction-462118"
$REGION = "us-central1"

Write-Host "Deploying MCP Server..." -ForegroundColor Yellow

# Build and deploy MCP Server
docker build -t gcr.io/$PROJECT_ID/nba-mcp-server ./mcp-server
docker push gcr.io/$PROJECT_ID/nba-mcp-server
gcloud run deploy nba-mcp-server `
    --image gcr.io/$PROJECT_ID/nba-mcp-server `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --memory 512Mi `
    --cpu 1 `
    --min-instances 1 `
    --max-instances 5 `
    --port 8080 `
    --set-secrets "MONGO_URI=MONGO_URI:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest" `
    --project $PROJECT_ID

# Get MCP Server URL
$MCP_URL = gcloud run services describe nba-mcp-server --platform managed --region $REGION --format="value(status.url)" --project $PROJECT_ID
Write-Host "MCP Server deployed at: $MCP_URL" -ForegroundColor Green 