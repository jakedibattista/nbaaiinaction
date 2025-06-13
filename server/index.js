// Polyfill for fetch and related APIs in older Node.js versions
if (!globalThis.fetch) {
  const fetch = require('node-fetch');
  globalThis.fetch = fetch;
  globalThis.Headers = fetch.Headers;
  globalThis.Request = fetch.Request;
  globalThis.Response = fetch.Response;
}

/**
 * NBA Trade Consigliere - Streamlined Server
 * Optimized for 3 main scenarios:
 * 1. Player Analysis: "Josh Giddey" → stats + similar salary players
 * 2. Team Analysis: "Lakers" → salary info + weaknesses  
 * 3. Trade Analysis: "LeBron for Luka" → CBA check + impact
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const SimplifiedNBAChatHandler = require('./simplified-chat-handler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Global chat handler instance
let chatHandler = null;

// MongoDB connection
const connectDB = async () => {
  try {
    // Ensure the MONGODB_URI is loaded
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in the .env file.');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas - NBA Trade Consigliere Database');
    
    // Initialize simplified chat handler after DB connection
    chatHandler = new SimplifiedNBAChatHandler(
      mongoose.connection.db,
      process.env.GEMINI_API_KEY
    );
    console.log('✅ Simplified NBA Chat Handler initialized');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    chatHandler: chatHandler ? 'Ready' : 'Not Ready'
  });
});

// Simplified chat endpoint - handles all 3 main scenarios
app.post('/api/chat', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { query } = req.body;
    console.log(`\n[${new Date().toISOString()}] 🚀 Received query: "${query}"`);
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!chatHandler) {
      return res.status(503).json({ 
        error: 'Chat service is initializing, please try again in a moment'
      });
    }

    // Process the chat using our simplified handler
    const result = await chatHandler.processChat(query);
    console.log(`[${new Date().toISOString()}] ✨ Chat handler processed. Success: ${result.success}`);

    if (result.success && result.data) {
      console.log(`[${new Date().toISOString()}] 🧐 Deep dive into returned data:`, JSON.stringify(result.data, null, 2));
    }
    
    const responseTime = Date.now() - startTime;
    
    if (result.success) {
      res.json({
        response: result.response,
        queryType: result.queryType,
        data: result.data,
        responseTime: `${responseTime}ms`,
        source: 'gemini-1.5-pro-latest'
      });
    } else {
      console.error(`[${new Date().toISOString()}] ❌ Error from chat handler:`, result.error);
      res.status(500).json({
        error: result.error,
        response: result.response,
        responseTime: `${responseTime}ms`
      });
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] 💥 FATAL ERROR in /api/chat:`, error);
    res.status(500).json({ 
      error: 'Failed to process chat',
      details: error.message 
    });
  }
});

// Simple database query endpoints (can be removed if not used by a frontend)
app.get('/api/teams', async (req, res) => {
  try {
    const teams = await mongoose.connection.db.collection('players')
      .distinct('team', { active: true });
    res.json({ teams: teams.filter(t => t).sort() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

app.get('/api/players/:team?', async (req, res) => {
  try {
    const team = req.params.team || req.query.team;
    const query = team ? { team: team, active: true } : { active: true };
    
    const players = await mongoose.connection.db.collection('players')
      .find(query)
      .project({ 
        name: 1, 
        team: 1, 
        position: 1, 
        salary_2023_2024: 1, 
        stats_2023_2024: 1 
      })
      .sort({ salary_2023_2024: -1 })
      .limit(50)
      .toArray();
    
    res.json({ players });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Connect to database and start server
async function startServer() {
  try {
    await connectDB();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 NBA Trade Consigliere API running on port ${PORT}`);
      console.log(`🤖 Powered by Gemini 1.5 Pro`);
      console.log(`📊 Database: 2023-24 NBA Season (Complete)`);
      console.log(`🎯 Optimized for 3 scenarios: Player, Team, & Trade Analysis`);
    });

    const gracefulShutdown = (signal) => {
      console.log(`\n[${new Date().toISOString()}] Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log(`[${new Date().toISOString()}] ✅ HTTP server closed.`);
        mongoose.connection.close(false, () => {
          console.log(`[${new Date().toISOString()}] ✅ MongoDB connection closed.`);
          process.exit(0);
        });
      });
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 