# 🏗️ Architecture Documentation

## System Overview

NBA Trade Consigliere uses a microservices architecture deployed on Google Cloud Run, designed for scalability, maintainability, and performance.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                          │
│                    React + Material-UI                         │
│                      (Port 8080)                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS/REST
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     nginx Proxy                                │
│              (Reverse Proxy + Static Assets)                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Proxy to API
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API Server                                   │
│              Express.js + Gemini AI                            │
│                   (Port 8080)                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTP/REST
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MCP Server                                   │
│              MongoDB + Data Processing                         │
│                   (Port 8080)                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │ MongoDB Protocol
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  MongoDB Atlas                                 │
│                 (Cloud Database)                               │
└─────────────────────────────────────────────────────────────────┘
```

## Service Breakdown

### 1. Client Service (React Frontend)

**Technology Stack:**
- React 18 with hooks
- Material-UI v5 for components
- nginx for serving and proxying
- Docker multi-stage build

**Key Features:**
- Server-side rendering ready
- Responsive design (mobile-first)
- Real-time chat interface
- Error boundary handling
- Progressive Web App capabilities

**nginx Configuration:**
```nginx
# API Proxy
location /api/ {
    proxy_pass https://nba-agent-api-[hash]-uc.a.run.app/;
    proxy_set_header Host nba-agent-api-[hash]-uc.a.run.app;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 2. API Server (Application Logic)

**Technology Stack:**
- Node.js 18 with Express.js
- Google Gemini 2.5 Flash integration
- Mongoose for MongoDB operations
- Custom chat handler with query classification

**Core Components:**

#### Query Classification System
```javascript
async function classifyQuery(query) {
  // Uses Gemini to classify queries into:
  // - PLAYER: Individual player analysis
  // - TEAM: Team roster and salary analysis  
  // - LEGAL: Trade legality under CBA rules
  // - IMPACT: Playoff impact simulation
}
```

#### AI Response Pipeline
1. **Input Validation**: Sanitize and validate user queries
2. **Query Classification**: Determine query type and extract entities
3. **Data Retrieval**: Fetch relevant NBA data from MCP server
4. **Prompt Engineering**: Build context-rich prompts for Gemini
5. **AI Generation**: Get expert-level responses from Gemini
6. **Response Formatting**: Structure and return formatted responses

#### Error Handling
- Graceful degradation for service failures
- Comprehensive logging for debugging
- Health check endpoints for monitoring
- Circuit breaker pattern for external services

### 3. MCP Server (Data Layer)

**Technology Stack:**
- Node.js 18 with Express.js
- MongoDB native driver
- Custom data aggregation pipelines
- RESTful API design

**Data Collections:**

#### Players Collection (213 documents)
```javascript
{
  _id: ObjectId,
  name: "Luka Dončić",
  team: "Dal",
  position: "G",
  salary_2023_2024: 40100000,
  stats_2023_2024: {
    points_per_game: 32.4,
    rebounds_per_game: 9.1,
    assists_per_game: 9.8,
    field_goal_percentage: 0.473,
    three_point_percentage: 0.383,
    free_throw_percentage: 0.786,
    plus_minus: 5.2
  },
  playoff_stats_2024: { /* playoff performance */ }
}
```

#### Teams Collection (16 documents)
```javascript
{
  _id: ObjectId,
  team: "Boston Celtics",
  total_salary_2023_2024: "$181,939,000",
  roster: [
    {
      player: "Jayson Tatum",
      position: "F",
      salary_2023_2024: 32600060,
      stats_2023_2024: { /* complete stats */ }
    }
    // ... 14 more players
  ],
  strength: "Elite offense and defense with deep playoff experience",
  weakness: "Bench depth and consistency in clutch moments"
}
```

#### CBA Rules Collection
```javascript
{
  _id: ObjectId,
  year: 2023,
  salary_cap: 136021000,
  luxury_tax: 165294000,
  first_apron: 172346000,
  second_apron: 182794000,
  trade_rules: {
    salary_matching: { /* detailed rules */ },
    apron_restrictions: { /* apron limitations */ }
  }
}
```

### 4. Database Layer (MongoDB Atlas)

**Performance Optimizations:**

#### Strategic Indexing (15 indexes)
```javascript
// Player lookups
{ "name": 1 }                                    // 77ms avg
{ "salary_2023_2024": -1 }                      // 76ms avg
{ "team": 1, "salary_2023_2024": -1 }           // 75ms avg

// Complex aggregations
{ "position": 1, "salary_2023_2024": -1 }       // Position-based queries
{ "stats_2023_2024.points_per_game": -1 }       // Performance queries
```

#### Connection Management
- Connection pooling (max 10 connections)
- Automatic reconnection handling
- Read preference optimization
- Write concern configuration

## AI Integration Architecture

### Gemini 2.5 Flash Integration

**Model Configuration:**
```javascript
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash-preview-05-20",
  generationConfig: {
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 0.8,
    topK: 40
  }
});
```

**Custom Prompt Engineering:**

#### Trade Analysis Prompt Template
```javascript
const tradePrompt = `You are an NBA expert analyzing a potential trade.

TRADE DETAILS:
${player1} (${team1}) ↔ ${player2} (${team2})

SALARY INFORMATION:
${player1}: $${salary1}
${player2}: $${salary2}
Difference: $${Math.abs(salary1 - salary2)}

CBA COMPLIANCE:
${cbaAnalysis}

TEAM CONTEXTS:
${team1}: ${team1Data}
${team2}: ${team2Data}

ANALYSIS FRAMEWORK:
1. ⚖️ Legal Status: [Yes/No with reasoning]
2. 🏆 Trade Winner: [Team with justification]
3. 📊 Impact Rating: [1-10 scale]
4. 🎯 Key Factors: [3-4 bullet points]

Provide concise, expert-level analysis.`;
```

### Query Processing Flow

```
User Query → Classification → Data Fetching → Prompt Building → AI Generation → Response
     ↓              ↓              ↓              ↓              ↓              ↓
"Trade Luka"   →  LEGAL      →   Player/Team   →   Context     →   Gemini     →   Expert
"for Tatum"                      Data + CBA        Rich           Analysis       Analysis
```

## Cloud Infrastructure

### Google Cloud Run Configuration

**Service Specifications:**
```yaml
# API Server
memory: 1Gi
cpu: 1
min_instances: 1
max_instances: 10
port: 8080
timeout: 300s

# MCP Server  
memory: 512Mi
cpu: 1
min_instances: 1
max_instances: 5
port: 8080
timeout: 60s

# Client
memory: 512Mi
cpu: 1
min_instances: 1
max_instances: 5
port: 8080
timeout: 30s
```

**Auto-scaling Triggers:**
- CPU utilization > 70%
- Memory utilization > 80%
- Request latency > 2000ms
- Concurrent requests > 100

### Security Architecture

**Secret Management:**
- Google Secret Manager for API keys
- Environment variable injection at runtime
- No secrets in container images or code

**Network Security:**
- HTTPS-only communication
- CORS protection with specific origins
- MongoDB Atlas network access controls
- Cloud Run IAM policies

**Data Protection:**
- Input sanitization and validation
- SQL injection prevention (NoSQL)
- Rate limiting on API endpoints
- Error message sanitization

## Performance Characteristics

### Response Time Targets

| Operation | Target | Actual |
|-----------|--------|--------|
| Database Query | < 100ms | 75-85ms |
| AI Response | < 5s | 2-4s |
| Page Load | < 3s | 1.5-2.5s |
| API Latency | < 200ms | 150-180ms |

### Scalability Metrics

- **Concurrent Users**: 100+ supported
- **Requests/Second**: 50+ per service
- **Database Connections**: Pooled (max 10)
- **Memory Usage**: 200-800MB per service

### Monitoring and Observability

**Health Checks:**
```javascript
// API Server Health
GET /health
{
  "status": "OK",
  "database": "Connected",
  "chatHandler": "Ready",
  "timestamp": "2025-01-16T04:38:26.540Z"
}
```

**Logging Strategy:**
- Structured JSON logging
- Request/response correlation IDs
- Performance metrics tracking
- Error aggregation and alerting

## Development Workflow

### Local Development
```bash
# Start all services locally
docker-compose up --build

# Individual service development
cd mcp-server && npm run dev
cd server && npm run dev  
cd client && npm start
```

### CI/CD Pipeline
```bash
# Build → Test → Deploy
docker build → gcloud run deploy → health check → traffic routing
```

### Testing Strategy
- Unit tests for core logic
- Integration tests for API endpoints
- End-to-end tests for user flows
- Load testing for performance validation

## Future Architecture Considerations

### Scalability Enhancements
- Redis caching layer for frequent queries
- CDN integration for static assets
- Database read replicas for query optimization
- Message queue for async processing

### Feature Extensions
- WebSocket support for real-time updates
- GraphQL API for flexible data fetching
- Machine learning models for trade predictions
- Multi-tenant support for different leagues

### Monitoring Improvements
- Distributed tracing with Cloud Trace
- Custom metrics and dashboards
- Automated alerting and incident response
- Performance profiling and optimization 