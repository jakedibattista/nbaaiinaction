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

// Load environment variables - handle both local and Cloud Run environments
try {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
} catch (error) {
  // In Cloud Run, environment variables are provided directly, so .env file may not exist
  console.log('No .env file found, using environment variables from runtime');
}
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');
const SimplifiedNBAChatHandler = require('./simplified-chat-handler');

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8080',
    process.env.CLIENT_URL || 'https://your-client-url.run.app',
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(express.static('public'));

// Global chat handler instance
let chatHandler = null;

// MongoDB connection
const connectDB = async () => {
  try {
    // Ensure the MONGO_URI is loaded
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is not defined in environment variables.');
      return false;
    }

    // Log connection attempt
    console.log('Attempting to connect to MongoDB...');
    
    // Connect with options for better reliability
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10,
      retryWrites: true
    });
    
    console.log('✅ Connected to MongoDB Atlas - NBA Trade Consigliere Database');
    
    // Initialize simplified chat handler after DB connection
    chatHandler = new SimplifiedNBAChatHandler(
      mongoose.connection.db,
      process.env.GEMINI_API_KEY
    );
    console.log('✅ Simplified NBA Chat Handler initialized');
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Connection details:', {
      uri: process.env.MONGO_URI ? 'URI is set' : 'URI is missing',
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT
    });
    console.log('Server will continue running without database connection');
    return false;
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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'NBA Trade Consigliere API Server',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: ['/health', '/chat'],
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    chatHandler: chatHandler ? 'Ready' : 'Not Ready'
  });
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { query } = req.body;
    console.log(`\n[${new Date().toISOString()}] 🚀 Received query: "${query}"`);
    
    if (!query) {
      console.log('[ERROR] No query provided in request body');
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!chatHandler) {
      console.log('[ERROR] Chat handler not initialized');
      return res.status(503).json({ 
        error: 'Chat service is initializing, please try again in a moment'
      });
    }

    // Process the chat using our simplified handler
    console.log('[DEBUG] Starting chat processing...');
    const result = await chatHandler.processChat(query);
    console.log(`[${new Date().toISOString()}] ✨ Chat handler processed. Success: ${result.success}`);

    if (result.success && result.data) {
      console.log(`[${new Date().toISOString()}] 🧐 Deep dive into returned data:`, JSON.stringify(result.data, null, 2));
    }
    
    const responseTime = Date.now() - startTime;
    
    if (result.success) {
      console.log('[DEBUG] Sending successful response');
      res.json({
        response: result.response,
        queryType: result.queryType.type,
        data: result.data,
        responseTime: `${responseTime}ms`,
        source: 'gemini-2.5-flash-preview-05-20'
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
    console.error(`[${new Date().toISOString()}] 💥 Error in chat endpoint:`, error);
    res.status(500).json({
      error: error.message,
      response: "I encountered an error processing your request. Please try again."
    });
  }
});

// Start the server
const startServer = async () => {
  try {
    console.log('🚀 Starting NBA Trade Consigliere API Server...');
    console.log('Environment check:');
    console.log('- PORT:', PORT);
    console.log('- MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'Missing');
    console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'Missing');
    console.log('- MCP_SERVER_URL:', process.env.MCP_SERVER_URL || 'Not set');
    
    // Start server first, then connect to MongoDB
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 NBA Trade Consigliere API Server listening on http://0.0.0.0:${PORT}`);
      console.log('🤖 Powered by Gemini 2.5 Flash');
      console.log('Health check available at /health');
    });
    
    // Connect to MongoDB in background
    connectDB().catch(error => {
      console.error('MongoDB connection failed, but server is still running:', error);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        if (mongoose.connection.readyState === 1) {
          mongoose.connection.close();
        }
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
