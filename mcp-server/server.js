// Load environment variables - handle both local and Cloud Run environments
try {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
} catch (error) {
  // In Cloud Run, environment variables are provided directly, so .env file may not exist
  console.log('No .env file found, using environment variables from runtime');
}
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch');

// Check for required environment variables
if (!process.env.MONGO_URI || !process.env.GEMINI_API_KEY) {
  console.error("❌ FATAL ERROR: MONGO_URI or GEMINI_API_KEY not found in .env file.");
  console.error("Please ensure the .env file is in the project root (AiinAction/) and contains both variables.");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

// Create a chat session that will maintain history
let chat = model.startChat({
  history: [],
  generationConfig: {
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE"
    }
  ]
});

// Keep track of chat history
let chatHistory = [];

// Initialize MongoDB
const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    db = client.db('nba-trade-consigliere');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Middleware
app.use(cors({
  origin: '*',  // Allow all origins in Cloud Run
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Health check endpoint for Cloud Run
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'NBA MCP Server'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'NBA Trade Consigliere MCP Server',
    status: 'running',
    endpoints: ['/health', '/chat', '/api/team', '/api/trade', '/api/playoff-impact']
  });
});

// Query classification function
async function classifyQuery(query) {
  try {
    const prompt = `You are an NBA expert assistant. Classify this query and extract the relevant entity.
Query: "${query}"

IMPORTANT: Carefully distinguish between LEGAL and IMPACT queries:
- LEGAL: Questions about trade validity, CBA rules, salary matching
  Examples: 
  - "Can we trade X for Y?"
  - "Is this trade allowed?"
  - "Would this trade work under CBA?"

- IMPACT: Questions about trade effects, playoff implications, team performance
  Examples:
  - "How would trading X affect the playoffs?"
  - "What happens if we trade X?"
  - "Would this trade make team Y better?"

Respond with ONLY the JSON object, no markdown formatting, no backticks, no other text:
{
  "type": "TEAM" or "PLAYER" or "LEGAL" or "IMPACT",
  "entity": "the exact team or player name from the query"
}

Examples:
"Tell me about the Celtics" -> {"type": "TEAM", "entity": "Celtics"}
"How is Tatum doing" -> {"type": "PLAYER", "entity": "Tatum"}
"Can we trade Luka for Tatum?" -> {"type": "LEGAL", "entity": null}
"How would trading Luka affect the Mavs?" -> {"type": "IMPACT", "entity": null}

Remember: Return ONLY the JSON object with no formatting or additional text.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Clean the response - remove any markdown formatting or extra text
    const cleanJson = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    console.log('Raw response:', responseText);
    console.log('Cleaned response:', cleanJson);
    
    const classification = JSON.parse(cleanJson);
    console.log('Classification result:', classification);
    return classification;
  } catch (error) {
    console.error('Classification error:', error);
    throw error;
  }
}

// Helper to extract trade participants from query
function extractTradeParticipants(query, teamsDocument) {
  const words = query.toLowerCase().split(' ');
  let players = [];
  let teams = [];
  let currentWord = '';

  for (let i = 0; i < words.length; i++) {
    if (words[i] === 'trade' || words[i] === 'for') continue;
    currentWord += ' ' + words[i];
    // Clean up the current word
    currentWord = currentWord.trim();
    
    // Check if current word combination matches a player or team
    if (teamsDocument) {
      for (const team of teamsDocument.nba_playoffs_2024) {
        // Check for team name
        if (team.team.toLowerCase().includes(currentWord)) {
          teams.push(team.team);
          currentWord = '';
        }
        // Check for player name
        for (const player of team.roster) {
          if (player.player.toLowerCase().includes(currentWord)) {
            players.push({
              name: player.player,
              team: team.team,
              salary: player.salary_2023_2024
            });
            currentWord = '';
            break;
          }
        }
      }
    }
  }

  return { players, teams };
}

// Main chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { query } = req.body;
    console.log('Received chat request:', { query });

    // Add query to chat history
    chatHistory.push({ role: 'user', content: query });

    // Get classification from Gemini
    const { type, entity } = await classifyQuery(query);
    console.log('Query type:', type, 'Entity:', entity);

    // Get the required documents
    let response;
    let requiredDoc;
    let teamsDoc;
    let playersDoc;
    let cbaDoc;

    // Get all required documents upfront
    teamsDoc = await db.collection('teams').findOne();
    console.log('Teams Document:', teamsDoc ? 'Found' : 'Not found');
    
    playersDoc = await db.collection('players').find().toArray();
    console.log('Players Document:', playersDoc ? 'Found' : 'Not found');
    if (playersDoc) {
      console.log('Number of players found:', playersDoc.length);
      console.log('Sample player:', JSON.stringify(playersDoc[0], null, 2));
      // Check if Tatum is in the data
      const tatum = playersDoc.find(p => p.name === "Jayson Tatum");
      console.log('Tatum found:', tatum ? 'Yes' : 'No');
      if (tatum) {
        console.log('Tatum data:', JSON.stringify(tatum, null, 2));
      }
    }
    
    cbaDoc = await db.collection('cba_rules').findOne();
    console.log('CBA Rules Document:', cbaDoc ? 'Found' : 'Not found');

    if (!teamsDoc || !playersDoc || !cbaDoc) {
      response = "I'm having trouble accessing the NBA database. Please try again later.";
      res.json({ response });
      return;
    }

    switch (type) {
      case 'TEAM': {
        const prompt = `You are an NBA expert analyzing team information for the 2023-24 playoffs.
Query: "${query}"

Teams Document:
${JSON.stringify(teamsDoc, null, 2)}

Players Document:
${JSON.stringify(playersDoc, null, 2)}

IMPORTANT: 
1. Find the team "${entity}" in the Teams Document's nba_playoffs_2024 array
2. Use the exact data from the document
3. Include their roster, strengths, and weaknesses
4. Focus on 2023-24 playoff performance
5. Format your response exactly like this:

[Team Name] 2023-24 Playoff Analysis

**Overview:**
[Brief description of team's playoff performance and record]

**Strengths:**
* [Strength 1]
* [Strength 2]
* [Strength 3]

**Weaknesses:**
* [Weakness 1]
* [Weakness 2]
* [Weakness 3]

**Key Roster Players and their 2023-24 Salaries:**
* [Player 1]: [Salary]
* [Player 2]: [Salary]
* [Player 3]: [Salary]
[etc...]`;

        const result = await model.generateContent(prompt);
        response = result.response.text();
        break;
      }
      case 'PLAYER': {
        const prompt = `You are an NBA expert analyzing player stats for the 2023-24 playoffs.
Query: "${query}"

Players Document:
${JSON.stringify(playersDoc, null, 2)}

IMPORTANT: 
1. Find the player "${entity}" in the Players Document
2. Use their exact stats from the document
3. Focus on their 2023-24 playoff performance
4. Include their team, position, and salary
5. Find one other player within $500,000 of their salary
6. Format your response exactly like this:

Player: [Name]
Team: [Team]
Position: [Position]
Salary: [Salary]

2023-24 Playoff Stats:
* Games Played: [Number]
* Minutes Per Game: [Number]
* Points Per Game: [Number]
* Rebounds Per Game: [Number]
* Assists Per Game: [Number]
* Steals Per Game: [Number]
* Blocks Per Game: [Number]
* Turnovers Per Game: [Number]

Similar Salary Player (within $500,000):
* [Player Name] ([Team]) - [Salary]`;

        const result = await model.generateContent(prompt);
        response = result.response.text();
        break;
      }
      case 'LEGAL': {
        const prompt = `You are an NBA expert analyzing trade legality for the 2023-24 playoffs.
Query: "${query}"

CBA Rules Document:
${JSON.stringify(cbaDoc, null, 2)}

Players Document:
${JSON.stringify(playersDoc, null, 2)}

Teams Document:
${JSON.stringify(teamsDoc, null, 2)}

IMPORTANT: 
1. Assume the trade is being made during a legal trade window
2. Focus on salary matching requirements from the CBA Rules Document
3. Find both players' salaries in the Players Document
4. Check both teams' total salary and apron status in the Teams Document
5. Format your response exactly like this:

Is it legal: [Yes/No]

Explanation: [Write a casual, fan-friendly explanation in 300 words or less. Focus on the key reasons why the trade is or isn't legal, using simple language. Explain salary matching rules in basic terms. Only analyze 1-for-1 trades as that's the current system limitation]`;

        const result = await model.generateContent(prompt);
        response = result.response.text();
        break;
      }
      case 'IMPACT': {
        const prompt = `You are an NBA expert analyzing trade impact for the 2023-24 playoffs.
Query: "${query}"

Players Document:
${JSON.stringify(playersDoc, null, 2)}

Teams Document:
${JSON.stringify(teamsDoc, null, 2)}

IMPORTANT: 
1. Find both players in the Players Document
2. Use their exact stats from the document
3. Focus on their 2023-24 playoff performance
4. Format your response exactly like this:

Player Statistics (2023-24 Playoff Performance):

[Player 1 Name] ([Position]) - [Team]
* Games Played: [Number]
* Minutes Per Game: [Number]
* Points Per Game: [Number]
* Rebounds Per Game: [Number]
* Assists Per Game: [Number]
* Steals Per Game: [Number]
* Blocks Per Game: [Number]
* Turnovers Per Game: [Number]

[Player 2 Name] ([Position]) - [Team]
* Games Played: [Number]
* Minutes Per Game: [Number]
* Points Per Game: [Number]
* Rebounds Per Game: [Number]
* Assists Per Game: [Number]
* Steals Per Game: [Number]
* Blocks Per Game: [Number]
* Turnovers Per Game: [Number]

Trade Analysis:

Winner: [Team Name]

Why: [One clear reason why this team benefits more in the 2023 playoffs, based on the stats]

Reasons to Make the Trade:

[Team 1]: [One compelling reason to make the trade]

[Team 2]: [One compelling reason to make the trade]

Reasons to Not Make the Trade:

[Team 1]: [One significant concern about making the trade]

[Team 2]: [One significant concern about making the trade]`;

        const result = await model.generateContent(prompt);
        response = result.response.text();
        break;
      }
    }

    res.json({ response });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to check database content
app.get('/test/players', async (req, res) => {
  try {
    // Check MongoDB connection
    if (!db) {
      return res.status(503).json({ status: 'error', message: 'Database not connected' });
    }
    
    // Get all players
    const players = await db.collection('players').find().toArray();
    
    // Get team information
    const teams = await db.collection('teams').find().toArray();
    
    res.json({ 
      status: 'ok',
      message: 'Database test successful',
      playerCount: players.length,
      teamCount: teams.length,
      samplePlayers: players.slice(0, 5).map(p => ({
        name: p.name,
        team: p.team,
        salary: p.salary_2023_2024,
        stats: p.stats_2023_2024
      })),
      teams: teams.map(t => ({
        name: t.team_name,
        salary_cap: t.salary_2023_2024
      }))
    });
  } catch (error) {
    console.error('Test failed:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Test failed',
      error: error.message
    });
  }
});

// Test endpoint to check teams collection
app.get('/test/teams', async (req, res) => {
  try {
    // Check MongoDB connection
    if (!db) {
      return res.status(503).json({ status: 'error', message: 'Database not connected' });
    }
    
    // Get all teams
    const teams = await db.collection('teams').find().toArray();
    
    res.json({ 
      status: 'ok',
      message: 'Teams collection test successful',
      teams
    });
  } catch (error) {
    console.error('Teams test failed:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Teams test failed',
      error: error.message
    });
  }
});

// Simple database check endpoint
app.get('/debug/db', async (req, res) => {
  try {
    // Check MongoDB connection
    if (!db) {
      return res.status(503).json({ status: 'error', message: 'Database not connected' });
    }
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Get sample data from each collection
    const samples = {};
    for (const name of collectionNames) {
      const sample = await db.collection(name).find().limit(1).toArray();
      samples[name] = sample[0] || null;
    }
    
    res.json({ 
      status: 'ok',
      collections: collectionNames,
      samples
    });
  } catch (error) {
    console.error('Debug failed:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Debug failed',
      error: error.message
    });
  }
});

// Diagnostic endpoint to analyze database structure
app.get('/debug/schema', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ status: 'error', message: 'Database not connected' });
    }

    const collections = await db.listCollections().toArray();
    const schema = {};

    for (const collection of collections) {
      const name = collection.name;
      // Get sample documents
      const samples = await db.collection(name).find().limit(3).toArray();
      
      // Analyze schema from samples
      const fields = new Set();
      const fieldTypes = {};
      
      samples.forEach(doc => {
        Object.entries(doc).forEach(([key, value]) => {
          fields.add(key);
          const type = value === null ? 'null' : 
                      Array.isArray(value) ? 'array' : 
                      typeof value;
          if (!fieldTypes[key]) {
            fieldTypes[key] = new Set();
          }
          fieldTypes[key].add(type);
        });
      });

      // Get document count
      const count = await db.collection(name).countDocuments();

      schema[name] = {
        documentCount: count,
        fields: Array.from(fields),
        fieldTypes: Object.fromEntries(
          Object.entries(fieldTypes).map(([key, types]) => [key, Array.from(types)])
        ),
        samples: samples.map(doc => {
          // Remove any sensitive data
          const safeDoc = { ...doc };
          delete safeDoc._id;
          return safeDoc;
        })
      };
    }

    res.json({
      status: 'ok',
      database: 'nba',
      collections: collections.map(c => c.name),
      schema
    });
  } catch (error) {
    console.error('Schema analysis failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Schema analysis failed',
      error: error.message
    });
  }
});

// Simple test endpoint
app.get('/test/db', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ status: 'error', message: 'Database not connected' });
    }

    // Get collections
    const collections = await db.listCollections().toArray();
    
    // Get sample data
    const data = {};
    for (const collection of collections) {
      const name = collection.name;
      const count = await db.collection(name).countDocuments();
      const sample = await db.collection(name).find().limit(1).toArray();
      
      data[name] = {
        count,
        sample: sample[0] ? {
          ...sample[0],
          _id: undefined // Remove _id for security
        } : null
      };
    }

    res.json({
      status: 'ok',
      collections: collections.map(c => c.name),
      data
    });
  } catch (error) {
    console.error('Test failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Test failed',
      error: error.message
    });
  }
});

app.post('/analyze-trade', async (req, res) => {
  try {
    const { team1, team2, players1, players2 } = req.body;
    
    // Get team data
    const teamsDoc = await db.collection('teams').findOne();
    const cbaDoc = await db.collection('cba_rules').findOne();

    // Extract team data
    const team1Data = teamsDoc.nba_playoffs_2024.find(t => t.team === team1);
    const team2Data = teamsDoc.nba_playoffs_2024.find(t => t.team === team2);
    
    if (!team1Data || !team2Data) {
      return res.status(400).json({ error: 'Invalid team names provided' });
    }

    // Extract player data
    const player1Data = team1Data.roster.find(p => p.player === players1[0]);
    const player2Data = team2Data.roster.find(p => p.player === players2[0]);

    if (!player1Data || !player2Data) {
      return res.status(400).json({ error: 'Invalid player names provided' });
    }

    // Prepare the trade analysis prompt
    const tradeAnalysisPrompt = `You are an NBA expert analyzing trade legality and impact for the 2023-24 season.

Trade proposal: ${players1[0]} (${team1}) for ${players2[0]} (${team2})

Players involved:
- ${players1[0]} (${team1}): ${player1Data.salary_2023_2024}
- ${players2[0]} (${team2}): ${player2Data.salary_2023_2024}

Teams involved:
- ${team1}
- ${team2}

Team Information:
${team1}: 
- Strength: ${team1Data.strength}
- Weakness: ${team1Data.weakness}
${team2}:
- Strength: ${team2Data.strength}
- Weakness: ${team2Data.weakness}

CBA Rules:
${JSON.stringify(cbaDoc, null, 2)}

Analyze this trade and respond in this exact format:

⚖️ Is this trade legal: [Yes/No]

📜 Logic from CBA:
[Explain the relevant CBA rules that make this trade legal or illegal. Include:
- Salary matching requirements (show the actual salary numbers)
- Trade exceptions if applicable
- Any relevant restrictions (hard cap, apron, etc.)
- Timing restrictions if any]

If the trade is legal, continue with:

🏆 Trade Winner: [One of: ${team1} or ${team2}]

💭 Why They Win:
[2-3 sentences explaining why this team benefits more from the trade. Consider:
- Player fit with new team
- Impact on playoff chances
- Long-term vs short-term benefits]

Keep your response clear and concise, using exactly this format.`;

    // Get Gemini's analysis
    const result = await model.generateContent(tradeAnalysisPrompt);
    res.json({ response: result.response.text() });
  } catch (error) {
    console.error('Error in trade analysis:', error);
    res.status(500).json({ error: 'Failed to analyze trade' });
  }
});

// Add a test endpoint for the Luka-Tatum trade
app.get('/test-trade', async (req, res) => {
  try {
    const tradeData = {
      team1: 'Dallas Mavericks',
      team2: 'Boston Celtics',
      players1: ['Luka Dončić'],
      players2: ['Jayson Tatum']
    };
    
    const response = await fetch('http://localhost:3001/analyze-trade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tradeData)
    });
    
    const analysis = await response.json();
    res.json(analysis);
  } catch (error) {
    console.error('Error testing trade:', error);
    res.status(500).json({ error: 'Failed to test trade' });
  }
});

// Add playoff series trade impact analysis endpoint
app.post('/analyze-playoff-impact', async (req, res) => {
  try {
    const { team1, team2, players1, players2 } = req.body;
    
    // Get team data
    const team1Data = await db.collection('teams').findOne({ 'nba_playoffs_2024.team': team1 });
    const team2Data = await db.collection('teams').findOne({ 'nba_playoffs_2024.team': team2 });
    
    if (!team1Data || !team2Data) {
      return res.status(400).json({ error: 'One or both teams not found in database' });
    }

    // Get playoff series data
    const playoffData = await db.collection('playoffseries').findOne();
    if (!playoffData) {
      return res.status(400).json({ error: 'Playoff series data not found' });
    }
    
    // Get player stats
    const player1Data = await db.collection('players').findOne({ name: players1[0] });
    const player2Data = await db.collection('players').findOne({ name: players2[0] });

    if (!player1Data || !player2Data) {
      return res.status(400).json({ error: 'One or both players not found in database' });
    }

    // Find current playoff series for each team
    const allPlayoffSeries = playoffData.series || [];
    const team1Series = allPlayoffSeries
      .find(s => s.teams.some(t => t.name === team1));
    const team2Series = allPlayoffSeries
      .find(s => s.teams.some(t => t.name === team2));

    // Get series details for prompt
    const getSeriesDetails = (series, teamName) => {
      if (!series) return 'Not in playoffs';
      const opponent = series.teams.find(t => t.name !== teamName)?.name || 'TBD';
      return `${series.round} vs ${opponent}`;
    };

    // Prepare the playoff impact prompt
    const playoffAnalysisPrompt = `You are an NBA expert analyzing how this 4-player trade would impact the 2023-24 playoffs. Here are the details:

TEAM SITUATIONS:
${team1}:
• Current Series: ${getSeriesDetails(team1Series, team1)}
• Round: ${team1Series ? team1Series.round : 'Not in playoffs'}
• Strengths: ${team1Data.strength}
• Weaknesses: ${team1Data.weakness}

${team2}:
• Current Series: ${getSeriesDetails(team2Series, team2)}
• Round: ${team2Series ? team2Series.round : 'Not in playoffs'}
• Strengths: ${team2Data.strength}
• Weaknesses: ${team2Data.weakness}

ROSTER CHANGES:
${team1} Trading Away:
${players1.slice(0, 2).map(name => {
  const player = team1Data.nba_playoffs_2024[0].roster.find(p => p.player === name);
  return `${name}:
  • Role: ${player.position}
  • Production: ${player.stats_2023_2024?.points_per_game || 'N/A'} PPG, ${player.stats_2023_2024?.plus_minus || 'N/A'} +/-
  • Playoff Experience: ${player.playoff_stats_2024 ? 'Yes' : 'No'}`
}).join('\n\n')}

${team1} Receiving:
${players2.slice(0, 2).map(name => {
  const player = team2Data.nba_playoffs_2024[0].roster.find(p => p.player === name);
  return `${name}:
  • Role: ${player.position}
  • Production: ${player.stats_2023_2024?.points_per_game || 'N/A'} PPG, ${player.stats_2023_2024?.plus_minus || 'N/A'} +/-
  • Playoff Experience: ${player.playoff_stats_2024 ? 'Yes' : 'No'}`
}).join('\n\n')}

PLAYOFF IMPACT ANALYSIS:
1. 🏆 Finals Odds Change (Significantly Better/Better/Neutral/Worse)
2. 🎮 Matchup Impact (How trade affects current series)
3. 🔄 Rotation Changes (Key lineup adjustments)
4. ⚡ Quick Impact Score (1-10, with 10 being most positive)

Keep responses focused on immediate playoff impact. Use emojis and bullet points for clarity.`;

    const result = await model.generateContent({
      contents: [{
        parts: [{ text: playoffAnalysisPrompt }]
      }]
    });

    const response = result.response;
    if (!response || !response.text) {
      throw new Error('Invalid response from Gemini model');
    }

    const analysis = response.text();
    res.json({ analysis });
  } catch (error) {
    console.error('Error analyzing playoff impact:', error);
    res.status(500).json({ error: 'Failed to analyze playoff impact: ' + error.message });
  }
});

// Team analysis endpoint
app.post('/api/team', async (req, res) => {
  try {
    const { team } = req.body;
    console.log('Team analysis request:', { team });

    // Get the teams document
    const teamsData = await db.collection('teams').findOne();
    if (!teamsData) {
      return res.status(404).json({ error: 'Teams data not found' });
    }

    // Find the team
    const teamData = teamsData.nba_playoffs_2024.find(t => 
      t.team.toLowerCase() === team.toLowerCase()
    );

    if (!teamData) {
      return res.status(404).json({ error: `Team ${team} not found` });
    }

    // Format the response
    const response = 
      `🏀 ${teamData.team}\n\n` +
      `💰 Total Salary: ${teamData.total_salary_2023_2024}\n\n` +
      `💪 Strengths:\n${teamData.strength}\n\n` +
      `⚠️ Weaknesses:\n${teamData.weakness}\n\n` +
      `👥 Roster:\n` +
      teamData.roster.map(player => 
        `${player.player}: ${player.salary_2023_2024}`
      ).join('\n');

    res.json({ response });
  } catch (error) {
    console.error('Error in team analysis:', error);
    res.status(500).json({ error: 'Failed to analyze team' });
  }
});

// Trade analysis endpoint
app.post('/api/trade', async (req, res) => {
  try {
    const { teams, players } = req.body;
    const [team1, team2] = teams;
    const [player1, player2] = players;

    // Get all relevant data
    const teamsDoc = await db.collection('teams').findOne();
    const cbaDoc = await db.collection('cba_rules').findOne();
    const playersDoc = await db.collection('players').findOne();

    // Prepare the trade analysis prompt
    const tradeAnalysisPrompt = `You are an NBA expert analyzing a potential trade in the 2023-24 season.

The proposed trade is: ${player1} (${team1}) for ${player2} (${team2})

Here are the complete documents for your analysis:

Teams Document:
${JSON.stringify(teamsDoc, null, 2)}

CBA Rules:
${JSON.stringify(cbaDoc, null, 2)}

Players Stats:
${JSON.stringify(playersDoc, null, 2)}

Analyze this trade and respond in this exact format:

⚖️ Is this trade legal: [Yes/No]

📜 Logic from CBA:
[Explain the relevant CBA rules that make this trade legal or illegal]

🏆 Trade Winner: [One of: ${team1} or ${team2}]

💭 Why They Win:
[2-3 sentences explaining why this team benefits more from the trade]`;

    // Get Gemini's analysis
    const result = await model.generateContent(tradeAnalysisPrompt);
    res.json({ response: result.response.text() });
  } catch (error) {
    console.error('Error in trade analysis:', error);
    res.status(500).json({ error: 'Failed to analyze trade' });
  }
});

// Playoff impact analysis endpoint
app.post('/api/playoff-impact', async (req, res) => {
  try {
    const { teams, players } = req.body;
    const [team1, team2] = teams;
    const [player1, player2] = players;

    // Get all relevant data
    const teamsDoc = await db.collection('teams').findOne();
    const playoffDoc = await db.collection('playoff_series').findOne();

    // Prepare the playoff impact prompt
    const playoffImpactPrompt = `You are an NBA expert analyzing how a trade would impact the 2023-24 playoffs.

The proposed trade is: ${player1} (${team1}) for ${player2} (${team2}).

Here are the complete team and playoff documents:

${JSON.stringify({ teamsDoc, playoffDoc }, null, 2)}

Analyze how this trade would affect each team's playoff outlook and chances. Consider current playoff positioning, matchups, and rotational impact.`;

    // Get Gemini's analysis
    const result = await model.generateContent(playoffImpactPrompt);
    const response = result.response.text().trim();

    res.json({ response });

  } catch (error) {
    console.error('Error in playoff impact analysis:', error);
    res.status(500).json({ 
      error: 'Failed to analyze playoff impact',
      details: error.message
    });
  }
});

// Start the server
async function startServer() {
  try {
    console.log('🚀 Starting NBA MCP Server...');
    console.log('Environment check:');
    console.log('- PORT:', PORT);
    console.log('- MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'Missing');
    console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'Missing');
    
    // Start server first, then connect to MongoDB
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 MCP Server listening on http://0.0.0.0:${PORT}`);
      console.log('Health check available at /health');
    });
    
    // Connect to MongoDB in background
    connectToMongoDB().catch(error => {
      console.error('MongoDB connection failed, but server is still running:', error);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        if (client) {
          client.close();
        }
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 