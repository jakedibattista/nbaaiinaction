# This script deploys the mcp-server to Google Cloud Run.
# It ensures all necessary environment variables are set.

Write-Host "Starting deployment of nba-mcp-server to Google Cloud Run..."

# Set the required environment variable for the connection string.
# IMPORTANT: This contains secrets and should be handled securely.
$connectionString = "mongodb+srv://nbauser:nbapassword123@nba-trade-consigliere.mongodb.net/nba-trade-consigliere?retryWrites=true&w=majority"

# The gcloud command to deploy the service.
gcloud run deploy nba-mcp-server `
  --source . `
  --platform managed `
  --region us-east1 `
  --allow-unauthenticated `
  --set-env-vars="MCP_CONNECTION_STRING=$connectionString"

Write-Host "Deployment command executed." 