# 🏀 NBA Trade Consigliere

**AI-Powered NBA Trade Analysis for the 2023-24 Season**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Google%20Cloud-blue)](https://nba-agent-client-v4hgvtnxva-uc.a.run.app)
[![API Status](https://img.shields.io/badge/API-Online-green)](https://nba-agent-api-v4hgvtnxva-uc.a.run.app)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Hackathon Project**: AI in Action  
> **Live Demo**: https://nba-agent-client-v4hgvtnxva-uc.a.run.app

## 🎯 Project Overview

NBA Trade Consigliere is an AI-powered web application that lets users explore hypothetical NBA trades and analyze their impact on the 2023-24 playoffs. Using natural language queries, users can ask about player stats, team compositions, trade legality under NBA CBA rules, and playoff implications.

### 🌟 Key Features

- **🤖 Natural Language Interface**: Ask questions in plain English
- **📊 Real NBA Data**: Complete 2023-24 season stats and salary data
- **⚖️ CBA Compliance**: Validates trades against actual NBA salary cap rules
- **🏆 Playoff Impact Analysis**: Simulates how trades would affect playoff outcomes
- **🚀 Cloud-Native**: Fully deployed on Google Cloud Run
- **📱 Responsive Design**: Works on desktop and mobile

### 🎮 Example Queries

```
"Can I legally trade Luka for Tatum?"
"Tell me about LeBron James stats"
"What's the Lakers roster and salary situation?"
"How would trading Giannis affect the Bucks playoff chances?"
```

## 🏗️ Architecture

### **Multi-Service Cloud Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │───▶│   API Server    │───▶│   MCP Server    │
│   (nginx)       │    │   (Express.js)  │    │   (MongoDB)     │
│   Port 8080     │    │   Port 8080     │    │   Port 8080     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   Google Cloud Run       Google Cloud Run       Google Cloud Run
```

### **Technology Stack**

- **Frontend**: React.js + Material-UI + nginx
- **Backend**: Node.js + Express.js + Mongoose
- **AI**: Google Gemini 2.5 Flash
- **Database**: MongoDB Atlas
- **Cloud**: Google Cloud Run
- **Containerization**: Docker + docker-compose

### **Data Sources**

- **Players**: 213/214 players with complete salary data (99.5% coverage)
- **Teams**: All 16 playoff teams with roster and salary breakdowns
- **CBA Rules**: Complete 2023 NBA Collective Bargaining Agreement
- **Playoff Series**: All 15 playoff series with detailed outcomes

## 🚀 Quick Start

### **Option 1: Use Live Demo**
Visit: https://nba-agent-client-v4hgvtnxva-uc.a.run.app

### **Option 2: Run Locally**

```bash
# Clone the repository
git clone https://github.com/jakedibattista/nbaaiinaction.git
cd nbaaiinaction

# Set up environment variables
cp .env.example .env
# Add your MONGO_URI and GEMINI_API_KEY

# Run with Docker Compose
docker-compose up --build

# Access the application
open http://localhost:3000
```

### **Option 3: Deploy to Google Cloud**

```bash
# Deploy all services
./deploy-mcp.ps1     # Deploy data server
./deploy-api.ps1     # Deploy API server  
./deploy-client.ps1  # Deploy frontend
```

## 🧠 AI Intelligence System

### **Three-Step AI Process**

1. **Query Classification**: Determines if query is about Player, Team, Trade, or Playoff Impact
2. **Data Retrieval**: Fetches relevant NBA data from MongoDB via MCP server
3. **AI Analysis**: Uses Gemini 2.5 Flash with custom prompts for expert-level responses

### **Custom Prompt Engineering**

```javascript
// Example: Trade Analysis Prompt
const tradePrompt = `You are an NBA expert analyzing a potential trade.
Trade: ${player1} (${team1}) for ${player2} (${team2})

CBA Rules: ${cbaRules}
Team Data: ${teamData}
Player Stats: ${playerStats}

Analyze: Legal? Winner? Impact?`;
```

### **Smart Query Routing**

- **Player Queries** → Player stats + similar salary comparisons
- **Team Queries** → Roster breakdown + salary cap analysis + trade targets
- **Trade Queries** → CBA validation + impact analysis
- **Playoff Queries** → Series simulation + championship odds

## 📊 Database Design

### **Optimized MongoDB Collections**

```javascript
// Players Collection (213 documents)
{
  name: "Luka Dončić",
  team: "Dal",
  position: "G", 
  salary_2023_2024: 40100000,
  stats_2023_2024: { /* complete stats */ },
  playoff_stats_2024: { /* playoff performance */ }
}

// Teams Collection (16 playoff teams)
{
  team: "Boston Celtics",
  total_salary_2023_2024: "$181,939,000",
  roster: [/* 15 players with salaries */],
  strength: "Elite offense and defense",
  weakness: "Depth concerns"
}

// CBA Rules Collection
{
  year: 2023,
  salary_cap: 136021000,
  luxury_tax: 165294000,
  first_apron: 172346000,
  second_apron: 182794000
}
```

### **Performance Optimizations**

- **15 Strategic Indexes**: Sub-100ms query performance
- **Compound Indexes**: Optimized for complex aggregations
- **Connection Pooling**: Efficient MongoDB Atlas connections

## 🔧 Development Workflow

### **Local Development**

```bash
# Start MongoDB MCP server
cd mcp-server && npm start

# Start API server  
cd server && npm start

# Start React client
cd client && npm start
```

### **Docker Development**

```bash
# Build and run all services
docker-compose up --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### **Cloud Deployment**

Each service deploys independently to Google Cloud Run:

- **Secrets Management**: Google Secret Manager for API keys
- **Environment Variables**: Injected at runtime
- **Health Checks**: Custom endpoints for monitoring
- **Auto-scaling**: Handles traffic spikes automatically

## 🎨 User Experience

### **Modern React Interface**

- **Material-UI Components**: Professional, responsive design
- **Real-time Chat**: Instant AI responses
- **Suggestion Cards**: Guided user experience
- **Error Handling**: Graceful fallbacks and helpful messages

### **NBA-Themed Design**

- **Basketball Icons**: Custom iconography
- **Team Colors**: Dynamic color schemes
- **Professional Layout**: Clean, modern interface
- **Mobile-First**: Optimized for all devices

## 🔐 Security & Best Practices

### **Environment Security**

- **Secret Management**: Google Cloud Secret Manager
- **Environment Isolation**: Separate dev/prod environments
- **API Key Protection**: Server-side only, never exposed to client

### **Network Security**

- **CORS Configuration**: Restricted origins
- **HTTPS Only**: All communications encrypted
- **MongoDB Atlas**: Network access controls
- **Input Validation**: Sanitized user inputs

### **Code Quality**

- **Error Handling**: Comprehensive try-catch blocks
- **Logging**: Structured logging for debugging
- **Health Checks**: Service monitoring endpoints
- **Graceful Shutdown**: Proper resource cleanup

## 📈 Performance Metrics

### **Response Times**

- **Database Queries**: < 100ms average
- **AI Responses**: 2-5 seconds typical
- **Page Load**: < 3 seconds initial load
- **API Latency**: < 200ms for data endpoints

### **Scalability**

- **Auto-scaling**: 1-10 instances per service
- **Memory Efficient**: 512MB-1GB per container
- **Connection Pooling**: Optimized database connections
- **CDN Ready**: Static assets optimized for delivery

## 🏆 Hackathon Highlights

### **Technical Innovation**

- **Multi-Service Architecture**: Microservices on Cloud Run
- **AI Integration**: Custom Gemini prompts for NBA expertise
- **Real-Time Data**: Live NBA statistics and salary data
- **CBA Compliance**: Actual NBA rule validation

### **User Experience**

- **Natural Language**: No complex forms or menus
- **Instant Results**: Fast AI-powered responses
- **Educational**: Learn about NBA trades and rules
- **Engaging**: Interactive chat interface

### **Production Ready**

- **Cloud Deployed**: Fully functional live demo
- **Monitoring**: Health checks and logging
- **Scalable**: Handles concurrent users
- **Maintainable**: Clean, documented codebase

## 🛠️ API Documentation

### **Chat Endpoint**

```bash
POST /chat
Content-Type: application/json

{
  "query": "Can I trade LeBron for Luka?"
}

Response:
{
  "response": "AI analysis...",
  "queryType": "LEGAL",
  "data": { /* relevant NBA data */ },
  "responseTime": "1250ms"
}
```

### **Health Check**

```bash
GET /health

Response:
{
  "status": "OK",
  "database": "Connected", 
  "chatHandler": "Ready"
}
```

## 📝 Environment Setup

### **Required Environment Variables**

```bash
# .env file
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/nba-trade-consigliere
GEMINI_API_KEY=your_gemini_api_key_here
MCP_SERVER_URL=http://localhost:8765  # Local development
```

### **Google Cloud Secrets**

```bash
# Create secrets in Google Cloud
gcloud secrets create MONGO_URI --data-file=mongo_uri.txt
gcloud secrets create GEMINI_API_KEY --data-file=gemini_key.txt
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **NBA Data**: Official 2023-24 season statistics
- **Google Gemini**: AI-powered natural language processing
- **MongoDB Atlas**: Cloud database hosting
- **Google Cloud**: Scalable cloud infrastructure
- **Material-UI**: React component library

## 📞 Contact

**Jake DiBattista**
- GitHub: [@jakedibattista](https://github.com/jakedibattista)
- Project Link: [https://github.com/jakedibattista/nbaaiinaction](https://github.com/jakedibattista/nbaaiinaction)
- Live Demo: [https://nba-agent-client-v4hgvtnxva-uc.a.run.app](https://nba-agent-client-v4hgvtnxva-uc.a.run.app)

---

**Built for AI in Action Hackathon 2025** 🏀🤖 