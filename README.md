# 🏀 NBA Trade Consigliere

**AI-Powered NBA Trade Simulator** - Explore "what if" scenarios from the 2023-24 NBA season with natural language queries powered by Google Gemini AI.

> *Submitted to: [AI in Action Hackathon](https://ai-in-action.devpost.com/)*  
> **Status**: 🎯 **Database Complete** → Now Building AI Agent & UX

## 🎯 Project Overview

**NBA Trade Consigliere** lets users create hypothetical NBA trades and simulate how they would have impacted the 2023-24 NBA playoffs. Ask questions like *"What if the Lakers traded for Damian Lillard?"* and get AI-powered analysis including salary cap implications, CBA compliance, and championship outcome changes.

## ✨ Key Features

### 🤖 **AI-Powered Trade Analysis**
- **Natural Language Queries**: "Trade X for Y" → AI handles all complexity
- **Google Gemini Integration**: Advanced AI understands NBA context
- **Salary Cap Compliance**: Real 2023 CBA rules with luxury tax calculations  
- **Playoff Impact Simulation**: How trades change championship odds

### 💰 **Complete NBA Financial Engine**
- **99.5% Salary Coverage**: 213/214 players with 2023-24 salary data
- **Full CBA Implementation**: Luxury tax, aprons, trade exceptions
- **Real Trade Validation**: First/Second Apron restrictions included
- **$1.34B+ Salary Database**: Every playoff team fully mapped

### 📊 **Production-Ready Database**
- **213 NBA Players** with complete stats + salaries
- **15 Playoff Series** from First Round to Finals  
- **2023 CBA Rules** with all salary cap restrictions
- **15 Optimized Indexes** for sub-100ms queries

## 🚀 Technology Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB Atlas with 15 performance indexes
- **AI Integration**: Google Gemini API with NBA context
- **Frontend**: React.js with TypeScript *(Next Phase)*
- **Data**: Complete 2023-24 season + CBA compliance
- **Performance**: Sub-100ms queries, real-time trade validation

## 🏆 Database Implementation Complete

### ✅ **Players Collection** (213 players)
```javascript
{
  name: "Luka Dončić",
  team: "Dal",
  position: "G", 
  salary_2023_2024: 40100000,  // Real contract data
  stats_2023_2024: {
    points_per_game: 32.4,
    rebounds_per_game: 9.1,
    assists_per_game: 9.8,
    // ... complete statistical profile
  }
}
```

### ✅ **CBA Rules Collection** (2023 NBA Season)
```javascript
{
  year: 2023,
  salary_cap: 136021000,      // $136.0M
  luxury_tax: 165294000,      // $165.3M  
  first_apron: 172346000,     // $172.3M
  second_apron: 182794000,    // $182.8M
  // ... all trade restrictions
}
```

### ✅ **Playoff Series Collection** (15 series)
```javascript
{
  series_id: "finals-celtics-mavs",
  round: "NBA Finals",
  winner: { name: "Boston Celtics", games_won: 4 },
  loser: { name: "Dallas Mavericks", games_won: 1 },
  upset: false
}
```

## 🎮 AI Agent Capabilities *(In Development)*

### 🧠 **Natural Language Understanding**
```
"What if Dallas traded Luka for Jayson Tatum?"
→ Salary analysis: Luka ($40.1M) vs Tatum ($34.8M) 
→ Cap impact: Dallas saves $5.3M, Boston over Second Apron
→ Playoff simulation: How Finals change with role reversal
```

### 📈 **Complex Trade Scenarios**  
```
"Show me realistic trades to get under the luxury tax"
→ AI identifies teams over $165.3M threshold
→ Suggests salary dumps with draft pick compensation
→ Validates CBA compliance automatically
```

### 🎯 **Championship Impact Analysis**
```
"Could the Warriors make playoffs with better shooting?"
→ Identifies available shooters within salary constraints
→ Simulates regular season record improvements
→ Projects playoff seeding changes
```

## 🛠 Quick Start *(Database Ready)*

### Prerequisites
- Node.js 18+
- MongoDB Atlas account  
- Google Gemini API key

### Installation
```bash
# Clone repository
git clone https://github.com/jakedibattista/nbaaiinaction.git
cd nbaaiinaction

# Install dependencies
npm install

# Environment setup
cp .env.example .env
# Add your MongoDB URI and Gemini API key

# Database is ready - start building!
npm run dev
```

## 📁 Current Project Structure

```
nbaaiinaction/
├── scripts/
│   └── gemini-api-layer.js       # AI integration (core functionality)
├── server/                       # Express.js API *(Next Phase)*
├── client/                       # React frontend *(Next Phase)*
├── data/                         # Original CSV files (archived)
└── README.md
```

## ⚡ Performance Benchmarks

### 🏃‍♂️ **Database Query Speed**
- **Player Lookup**: 77ms average (name index)
- **Team Roster**: <10ms (team index) 
- **Salary Analysis**: 76ms (salary index)
- **Trade Validation**: 75ms (compound indexes)

### 💾 **Data Coverage**
- **Players**: 99.5% (213/214 with salary data)
- **Playoff Teams**: 100% (all 16 teams complete)
- **Series Results**: 100% (verified historical)
- **CBA Rules**: 100% (complete 2023 compliance)

## 🎯 Development Roadmap

### 🔥 **Phase 2: AI Agent** *(Current Focus)*
- [ ] Enhanced Gemini prompts with NBA context
- [ ] Trade suggestion engine with salary constraints
- [ ] Natural language query processing
- [ ] Complex multi-team trade scenarios

### 🎨 **Phase 3: Beautiful UX**
- [ ] React frontend with modern design
- [ ] Interactive trade builder interface  
- [ ] Real-time salary cap visualizations
- [ ] Mobile-responsive trade simulator

### 🚀 **Phase 4: Advanced Features**
- [ ] Historical trade database integration
- [ ] Community voting on trade proposals
- [ ] Advanced analytics (PER, BPM, VORP)
- [ ] Social sharing of trade scenarios

## 🏀 Why 2023-24 Season?

The **2023-24 NBA season** provides perfect trade simulation context:

### 🏆 **Boston Celtics Championship**
- **64-18 record** with championship core intact
- **Jayson Tatum** (26.9 PPG) + **Jaylen Brown** (23.0 PPG)
- Trade scenarios: "What if they traded for another star?"

### 📈 **Major Storylines**
- **Dallas Mavericks** 5th seed → Finals appearance
- **Denver Nuggets** defending champions eliminated early
- **Multiple superstars** on tradeable contracts

### 💰 **Salary Cap Drama**
- **Second Apron** penalties create trade restrictions
- **Luxury tax** decisions influence roster construction
- **Contract year** players create natural trade scenarios

## 🤖 AI Integration Philosophy

### 🎯 **User-Centric Design**
1. **Natural Language First**: No complex forms or dropdowns
2. **Context-Aware**: AI understands NBA rules, player values, team needs
3. **Realistic Constraints**: All trades must pass salary cap validation
4. **Impact-Focused**: Every trade shows championship probability changes

### 📊 **Data-Driven Insights**
- **Statistical Impact**: How player stats translate to team performance
- **Financial Reality**: Luxury tax implications of every trade
- **Historical Context**: Compare to actual 2023-24 trades and rumors
- **Championship Probability**: Monte Carlo simulation of playoff outcomes

## 🎉 Hackathon Success Metrics

### ✅ **Technical Achievements**
- **Complete NBA Database**: 99.5% salary coverage achieved
- **Performance Optimization**: 15 indexes, sub-100ms queries
- **CBA Compliance**: Full luxury tax and apron implementation
- **Clean Architecture**: Production-ready codebase

### 🎯 **User Experience Goals**
- **Intuitive Interface**: Natural language → instant results
- **Realistic Trades**: AI suggests only viable scenarios
- **Rich Context**: Every trade includes championship impact
- **Mobile First**: Beautiful experience on all devices

## 🤝 Contributing

Built for **AI in Action Hackathon** but open to contributions:

1. **Fork** the repository
2. **Focus** on AI agent enhancements or React UX
3. **Submit** pull requests with detailed descriptions
4. **Maintain** basketball accuracy and performance standards

## 📄 License

MIT License - Perfect for hackathon innovation!

## 🏆 Ready for Launch

**NBA Trade Consigliere** has a **production-ready foundation**:
- ✅ Complete database with 99.5% salary coverage
- ✅ Real CBA compliance and trade validation  
- ✅ Optimized performance with 15 database indexes
- ✅ Clean, focused codebase ready for AI agent development

**Next stop**: Building the most intuitive NBA trade simulator ever created! 🚀 