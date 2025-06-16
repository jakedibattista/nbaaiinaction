# 🚀 Deployment Guide

## Google Cloud Run Deployment

This project uses a multi-service architecture deployed on Google Cloud Run with automated deployment scripts.

### Prerequisites

1. **Google Cloud Project** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Docker** installed locally
4. **MongoDB Atlas** cluster with NBA data
5. **Google Gemini API** key

### Environment Setup

#### 1. Create Google Cloud Secrets

```bash
# Create secrets for sensitive data
gcloud secrets create MONGO_URI --data-file=mongo_uri.txt
gcloud secrets create GEMINI_API_KEY --data-file=gemini_key.txt

# Verify secrets
gcloud secrets list
```

#### 2. Configure MongoDB Atlas

1. Go to MongoDB Atlas → Network Access
2. Add IP Address: `0.0.0.0/0` (Allow access from anywhere)
3. This allows Google Cloud Run to connect to your database

### Deployment Process

#### Option 1: Individual Service Deployment

```bash
# Deploy in order (dependencies matter)

# 1. Deploy MCP Data Server
./deploy-mcp.ps1

# 2. Deploy API Server (depends on MCP)
./deploy-api.ps1

# 3. Deploy Client (depends on API)
./deploy-client.ps1
```

#### Option 2: All Services at Once

```bash
# Deploy all services with dependency management
./deploy-simple.ps1
```

### Service URLs

After deployment, you'll get these URLs:

- **Client**: `https://nba-agent-client-[hash]-uc.a.run.app`
- **API**: `https://nba-agent-api-[hash]-uc.a.run.app`
- **MCP**: `https://nba-mcp-server-[hash]-uc.a.run.app`

### Verification

#### 1. Check Service Health

```bash
# Test MCP Server
curl https://nba-mcp-server-[hash]-uc.a.run.app/health

# Test API Server
curl https://nba-agent-api-[hash]-uc.a.run.app/health

# Test Client
curl https://nba-agent-client-[hash]-uc.a.run.app/
```

#### 2. Test Full Flow

1. Visit the client URL
2. Try a query: "Tell me about LeBron James"
3. Verify AI response appears

### Troubleshooting

#### Common Issues

1. **Service Unavailable (503)**
   - Check MongoDB Atlas network access
   - Verify secrets are created correctly
   - Check Cloud Run logs

2. **CORS Errors**
   - Verify client URL is in API CORS configuration
   - Check nginx proxy settings

3. **Database Connection Failed**
   - Ensure MongoDB Atlas allows `0.0.0.0/0`
   - Verify MONGO_URI secret format

#### View Logs

```bash
# View logs for debugging
gcloud logs read --service=nba-agent-api --limit=50
gcloud logs read --service=nba-mcp-server --limit=50
gcloud logs read --service=nba-agent-client --limit=50
```

### Cost Optimization

- **Auto-scaling**: Services scale to 0 when not in use
- **Memory limits**: Optimized for cost efficiency
- **Request-based billing**: Only pay for actual usage

### Security Features

- **Secret Manager**: API keys never exposed in code
- **HTTPS Only**: All traffic encrypted
- **CORS Protection**: Restricted origins
- **Network Isolation**: Services communicate securely

### Performance Monitoring

- **Health Checks**: Built-in monitoring endpoints
- **Response Times**: Tracked in application logs
- **Error Rates**: Monitored via Cloud Run metrics
- **Scaling Events**: Automatic based on traffic

#### 4. Deploy Client (React App)

**Important**: Before deploying the client, update `client/nginx.conf` with your actual API server URL:
```bash
# Replace placeholders in nginx.conf
sed -i 's/YOUR_API_SERVER_URL/https:\/\/nba-agent-api-[your-hash]-uc.a.run.app/g' client/nginx.conf
sed -i 's/YOUR_API_SERVER_HOST/nba-agent-api-[your-hash]-uc.a.run.app/g' client/nginx.conf
```

```bash
# Deploy client
gcloud run deploy nba-agent-client \
  --source=./client \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=10 \
  --timeout=300s
``` 