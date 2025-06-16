# Exit on error
$ErrorActionPreference = "Stop"

# Set your project ID
$PROJECT_ID = "aiinaction-462118"
$REGION = "us-central1"

Write-Host "🚀 Starting simplified deployment process..." -ForegroundColor Green

# Get the project number
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
Write-Host "Project Number: $PROJECT_NUMBER" -ForegroundColor Yellow

# Grant Secret Manager access to Cloud Run service account
Write-Host "🔑 Setting up IAM permissions..." -ForegroundColor Yellow
$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
Write-Host "Service Account: $SERVICE_ACCOUNT" -ForegroundColor Yellow
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SERVICE_ACCOUNT" `
    --role="roles/secretmanager.secretAccessor"

# Step 1: Build and deploy MCP Server
Write-Host "📦 Building and deploying MCP Server..." -ForegroundColor Yellow
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
    --set-secrets MONGO_URI=MONGO_URI:latest `
    --project $PROJECT_ID

# Get MCP Server URL
$MCP_URL = gcloud run services describe nba-mcp-server --platform managed --region $REGION --format="value(status.url)" --project $PROJECT_ID
Write-Host "✅ MCP Server deployed at: $MCP_URL" -ForegroundColor Green

# Step 2: Build and deploy API Server
Write-Host "📦 Building and deploying API Server..." -ForegroundColor Yellow
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
    --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest,MONGO_URI=MONGO_URI:latest `
    --set-env-vars MCP_SERVER_URL=$MCP_URL `
    --project $PROJECT_ID

# Get API Server URL
$API_URL = gcloud run services describe nba-agent-api --platform managed --region $REGION --format="value(status.url)" --project $PROJECT_ID
Write-Host "✅ API Server deployed at: $API_URL" -ForegroundColor Green

# Step 3: Build and deploy Client
Write-Host "📦 Building and deploying Client..." -ForegroundColor Yellow
docker build -t gcr.io/$PROJECT_ID/nba-agent-client ./client
docker push gcr.io/$PROJECT_ID/nba-agent-client
gcloud run deploy nba-agent-client `
    --image gcr.io/$PROJECT_ID/nba-agent-client `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --memory 512Mi `
    --cpu 1 `
    --min-instances 1 `
    --max-instances 5 `
    --port 8080 `
    --set-env-vars REACT_APP_API_URL=$API_URL `
    --project $PROJECT_ID

# Get Client URL
$CLIENT_URL = gcloud run services describe nba-agent-client --platform managed --region $REGION --format="value(status.url)" --project $PROJECT_ID
Write-Host "✅ Client deployed at: $CLIENT_URL" -ForegroundColor Green

Write-Host "🎉 Deployment complete! Your application is available at: $CLIENT_URL" -ForegroundColor Green 