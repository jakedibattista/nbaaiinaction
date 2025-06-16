# Exit on error
$ErrorActionPreference = "Stop"

# Set your project ID
$PROJECT_ID = "aiinaction-462118"
$REGION = "us-central1"

Write-Host "Deploying Client..." -ForegroundColor Yellow

# Get API URL first (assuming API is already deployed)
$API_URL = gcloud run services describe nba-agent-api --platform managed --region $REGION --format="value(status.url)" --project $PROJECT_ID

# Build and deploy Client
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
Write-Host "Client deployed at: $CLIENT_URL" -ForegroundColor Green 