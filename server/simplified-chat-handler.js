/**
 * Simplified NBA Chat Handler - Optimized for 3 Main Scenarios
 * 1. Player Analysis: "Josh Giddey" → stats + similar salary players
 * 2. Team Analysis: "Lakers" → salary info + weaknesses  
 * 3. Trade Analysis: "LeBron for Luka" → CBA check + impact
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch');

const DEFAULT_MCP_SERVER_URL = 'http://localhost:8765';
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || DEFAULT_MCP_SERVER_URL;

class SimplifiedNBAChatHandler {
  constructor(db, geminiApiKey) {
    this.db = db;
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
    
    // Ensure the API key is provided
    if (!geminiApiKey) {
      throw new Error("Gemini API key is required.");
    }
  }

  /**
   * Main chat processing method
   */
  async processChat(query) {
    try {
      // Step 1: Classify the query type
      console.log(`[HANDLER] 1. Classifying query...`);
      const queryType = this.classifyQuery(query);
      console.log(`[HANDLER]    ✅ Classified as: ${queryType}`);
      
      // Step 2: Get data from MCP server based on query type
      console.log(`[HANDLER] 2. Fetching data from MCP server...`);
      const dataResult = await this.fetchData(query, queryType);

      // This is the critical check for the MCP connection
      if (dataResult.error && dataResult.error.includes('Could not connect')) {
        console.error(`🔴 FATAL: Could not connect to MCP Data Server.`, dataResult.error);
        return { 
          success: false, 
          response: `I am currently unable to access the live NBA data needed to answer your question. Please ensure the data service is running.`,
          error: dataResult.error 
        };
      }
      
      console.log(`[HANDLER]    ✅ Data fetched. Success: ${dataResult.success}`);
      
      if (!dataResult.success) {
        // Handle cases where data wasn't found (e.g., unknown player)
        // but the server connection was fine.
        const friendlyError = dataResult.error || "I couldn't find the information needed to answer that.";
        return { 
          success: false, 
          response: friendlyError,
          error: friendlyError
        };
      }
      
      // Step 3: Generate AI response with appropriate context
      console.log(`[HANDLER] 3. Generating AI response...`);
      const response = await this.generateResponse(query, queryType, dataResult.data);
      console.log(`[HANDLER]    ✅ AI response generated.`);
      
      return {
        success: true,
        response,
        queryType,
        data: dataResult.data
      };
      
    } catch (error) {
      console.error('[HANDLER] 💥 FATAL ERROR in processChat:', error);
      return {
        success: false,
        error: error.message,
        response: "I encountered an error processing your request. Please try again."
      };
    }
  }

  /**
   * Classify query into one of the three main types
   */
  classifyQuery(query) {
    const cleanQuery = query.toLowerCase().trim();
    
    // Trade patterns - check first since they're most specific
    if (this.isTradeQuery(cleanQuery)) {
      return 'trade';
    }
    
    // Team patterns - check if the query contains a team name from our map
    if (this.extractTeamName(cleanQuery)) {
      return 'team';
    }
    
    // Default to player query - most flexible
    return 'player';
  }

  /**
   * Check if query is about a trade
   */
  isTradeQuery(query) {
    const tradeKeywords = ['for', 'trade', 'swap', 'exchange', 'deal'];
    const tradePatterns = [
      /\b\w+\s+for\s+\w+/,  // "player for player"
      /trade\s+\w+/,        // "trade player"
      /swap\s+\w+/,         // "swap player"
      /\w+\s+to\s+\w+\s+for\s+\w+/ // "player to team for player"
    ];
    
    return tradePatterns.some(pattern => pattern.test(query)) ||
           tradeKeywords.some(keyword => query.includes(keyword));
  }

  /**
   * Fetch data from MCP server based on query type
   */
  async fetchData(query, queryType) {
    try {
      switch (queryType) {
        case 'player':
          return await this.fetchPlayerData(query);
        case 'team':
          return await this.fetchTeamData(query);
        case 'trade':
          return await this.fetchTradeData(query);
        default:
          return { success: false, error: 'Unknown query type' };
      }
    } catch (error) {
      // Catch connection errors specifically
      if (error.code === 'ECONNREFUSED' || error.type === 'system') {
        return { 
          success: false, 
          error: 'MCP_CONNECTION_ERROR', 
          details: `Could not connect to the MCP data server at ${MCP_SERVER_URL}. Is it running?` 
        };
      }
      return { success: false, error: error.message };
    }
  }

  // Centralized MCP data fetching method
  async fetchFromMCP(endpoint, options = {}) {
    const url = `${MCP_SERVER_URL}${endpoint}`;
    const { method = 'GET', body = null } = options;
    console.log(`[HANDLER] Fetching from MCP: ${method} ${url}`);

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body && { body: JSON.stringify(body) }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`MCP request failed with status ${response.status}: ${errorBody}`);
      }

      return await response.json();
    } catch (error) {
      // Check for connection error specifically
      if (error.cause && (error.cause.code === 'ECONNREFUSED' || error.cause.code === 'ENOTFOUND')) {
        const connectionError = `Could not connect to the MCP data server at ${MCP_SERVER_URL}. Is it running?`;
        console.error(`[HANDLER] ❌ MCP Connection Error:`, connectionError);
        // Return a structured error that can be handled upstream
        return { success: false, error: connectionError };
      }
      // For other errors, log and re-throw a structured error
      console.error(`[HANDLER] ❌ MCP Fetch Error:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch player data including similar salary players
   */
  async fetchPlayerData(query) {
    try {
      const endpoint = `/api/player/${encodeURIComponent(query)}`;
      const result = await this.fetchFromMCP(endpoint);

      if (!result || result.error || (result.data && result.data.length === 0)) {
        console.warn(`[HANDLER] 🟠 Player "${query}" not found in database.`);
        return { 
          success: false, 
          error: `Player "${query}" not found.`, 
          reason: 'notFound' 
        };
      }
      
      console.log(`[HANDLER]    ✅ Player data fetched for ${query}`);
      return { success: true, data: result.data };
    } catch (error) {
      console.error(`[HANDLER] ❌ Error fetching player data for "${query}":`, error);
      return { success: false, error: `Failed to fetch data for player: ${query}.` };
    }
  }

  /**
   * Fetch team salary info and weaknesses
   */
  async fetchTeamData(query) {
    try {
      const endpoint = `/api/team/${encodeURIComponent(query)}`;
      const result = await this.fetchFromMCP(endpoint);

      if (!result || result.error || (result.data && result.data.players.length === 0)) {
        console.warn(`[HANDLER] 🟠 Team "${query}" not found or has no players.`);
        return { success: false, error: `Team "${query}" not found or has no players.` };
      }

      console.log(`[HANDLER]    ✅ Team data fetched for ${query}`);
      return { success: true, data: result.data };
    } catch (error) {
      console.error(`[HANDLER] ❌ Error fetching team data for "${query}":`, error);
      return { success: false, error: `Failed to fetch data for team: ${query}.` };
    }
  }

  /**
   * Fetch trade analysis data
   */
  async fetchTradeData(query) {
    try {
      const endpoint = '/api/trade/analyze';
      const body = { players: query };
      const result = await this.fetchFromMCP(endpoint, { method: 'POST', body });

      if (!result || result.error) {
        const errorMessage = result ? result.error : 'Unknown error during trade analysis.';
        console.warn(`[HANDLER] 🟠 Trade analysis failed: ${errorMessage}`);
        return { success: false, error: `Trade analysis failed: ${errorMessage}` };
      }

      console.log(`[HANDLER]    ✅ Trade data fetched for: ${query.join(', ')}`);
      return { success: true, data: result.data };
    } catch (error) {
      console.error(`[HANDLER] ❌ Error fetching trade data:`, error);
      return { success: false, error: 'Failed to fetch trade analysis data.' };
    }
  }

  /**
   * Generate AI response using Gemini
   */
  async generateResponse(query, queryType, data) {
    try {
      const systemPrompt = this.createSystemPrompt(queryType, data, query);
      const userPrompt = `User Query: "${query}"\n\nPlease provide a helpful response based on the data above.`;
      
      const result = await this.model.generateContent({
        contents: [{
          parts: [{ text: systemPrompt + '\n\n' + userPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 800,
        }
      });
      
      const response = result.response;

      if (response.candidates && response.candidates.length > 0) {
        return response.text();
      } else {
        const blockReason = response.promptFeedback?.blockReason;
        const safetyRatings = JSON.stringify(response.promptFeedback?.safetyRatings, null, 2);
        console.error(`🔴 Gemini response was blocked. Reason: ${blockReason}`);
        console.error(`Safety Ratings: ${safetyRatings}`);
        return `My AI response was blocked. This can happen due to safety filters. Please try rephrasing your query. (Reason: ${blockReason || 'Unknown'})`;
      }
    } catch (error) {
        console.error("🔴 Error in generateResponse:", error);
        throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }

  /**
   * Create appropriate system prompt based on query type
   */
  createSystemPrompt(queryType, data, query) {
    const basePrompt = `You are an NBA trade analysis expert. Be conversational and helpful.`;
    
    switch (queryType) {
      case 'player':
        return this.createPlayerPrompt(data, query);
      case 'team':
        return this.createTeamPrompt(data, query);
      case 'trade':
        return this.createTradePrompt(data, query);
      default:
        return basePrompt;
    }
  }

  /**
   * Create player analysis prompt
   */
  createPlayerPrompt(data, query) {
    if (!data.success) {
      return `You are an NBA expert. The user asked for a player, but we couldn't find them.
Suggest they check the spelling or try a different player name.`;
    }

    const { player, similarPlayers } = data.data;
    const stats = player.stats || {};

    return `You are a concise NBA stats provider. Your context is ONLY the 2023-2024 NBA Playoffs.
Do not write a narrative. Provide a scannable, data-focused summary.

Here is the data for the player requested and players with a similar salary.

PLAYER: ${player.name || 'N/A'} (${player.team || 'N/A'})
SALARY: $${((player.salary || 0) / 1000000).toFixed(1)}M

2023-2024 PLAYOFF STATS:
- Points: ${stats.points_per_game || 'N/A'}
- Rebounds: ${stats.rebounds_per_game || 'N/A'}
- Assists: ${stats.assists_per_game || 'N/A'}
- Steals: ${stats.steals_per_game || 'N/A'}
- Blocks: ${stats.blocks_per_game || 'N/A'}
- Field Goal Percentage: ${stats.field_goal_percentage || 'N/A'}
- Three-Point Percentage: ${stats.three_point_percentage || 'N/A'}

SIMILARLY PAID PLAYERS:
${similarPlayers.map(p => `- ${p.name}: $${((p.salary || 0) / 1000000).toFixed(1)}M`).join('\n') || '- None found.'}

YOUR TASK:
1. State the player's salary.
2. Present their key playoff stats.
3. List the similarly paid players.
Keep the entire response very brief and use bullet points for clarity.`;
  }

  /**
   * Create team analysis prompt  
   */
  createTeamPrompt(data, query) {
    if (!data.success) {
      return `You are an NBA expert. The user asked about a team, but we couldn't find the data.
Suggest they check the spelling or try a different team name.`;
    }

    const { salary } = data.data;

    // Note: salary.players is expected to be an array of top players from the MCP API
    return `You are a concise NBA analyst. Your task is to provide a brief, scannable summary for the user. Do not use conversational filler.

TEAM DATA:
- Team: ${salary.team}
- Total Salary: $${(salary.totalSalary / 1000000).toFixed(1)}M
- Top Paid Players:
${salary.players.slice(0, 5).map(p => `  - ${p.name}: $${(p.salary / 1000000).toFixed(1)}M`).join('\n')}

YOUR TASK:
Based on the data provided:
1. Briefly state the team's total salary.
2. Recommend 3 specific and realistic players the team could trade for. Keep recommendations very brief (e.g., "Player Name (Team)").`;
  }

  /**
   * Create trade analysis prompt
   */
  createTradePrompt(data, query) {
    if (!data.success || !data.data || !data.data.players || data.data.players.length === 0) {
      return `I couldn't analyze that trade. Please make sure you've spelled the player names correctly. The error was: ${data.error || 'Could not find player data.'}`;
    }

    const players = data.data.players;
    let playerComparison = '';

    players.forEach(player => {
        const stats = player.stats || {};
        playerComparison += `
- ${player.name} (${player.team}):
  - Salary: $${((player.salary || 0) / 1000000).toFixed(1)}M
  - Stats (2023-24 Playoffs):
    - PTS: ${stats.points_per_game || 'N/A'}
    - REB: ${stats.rebounds_per_game || 'N/A'}
    - AST: ${stats.assists_per_game || 'N/A'}
`;
    });

    return `You are an NBA trade analyst. Your analysis is strictly based on the provided 2023-2024 playoff data. Do not analyze defense as it's not in the data.

DATA PROVIDED:
${playerComparison}

YOUR TASK:
1.  **Player Comparison**: Briefly compare the stats and salaries of the players involved.
2.  **Salary Cap Analysis**: Discuss if the salaries match for a legal trade based on the numbers provided.
3.  **Offensive Fit**: Analyze how each player would fit into their new team's offense.
Keep the analysis concise and focused on the provided data.`;
  }

  /**
   * Utility methods for parsing queries
   */
  extractPlayerName(query) {
    // Simple extraction - remove common words and return remaining text
    const commonWords = ['show', 'get', 'find', 'player', 'stats', 'for', 'about'];
    const words = query.toLowerCase().split(' ').filter(word => !commonWords.includes(word));
    return words.join(' ').trim() || query.trim();
  }

  extractTeamName(query) {
    const teamMap = {
      'hawks': 'Atl', 'atlanta hawks': 'Atl',
      'celtics': 'Bos', 'boston celtics': 'Bos',
      'nets': 'Bkn', 'brooklyn nets': 'Bkn',
      'hornets': 'Cha', 'charlotte hornets': 'Cha',
      'bulls': 'Chi', 'chicago bulls': 'Chi',
      'cavaliers': 'Cle', 'cleveland cavaliers': 'Cle', 'cavs': 'Cle',
      'mavericks': 'Dal', 'dallas mavericks': 'Dal', 'mavs': 'Dal',
      'nuggets': 'Den', 'denver nuggets': 'Den',
      'pistons': 'Det', 'detroit pistons': 'Det',
      'warriors': 'Gsw', 'golden state warriors': 'Gsw',
      'rockets': 'Hou', 'houston rockets': 'Hou',
      'pacers': 'Ind', 'indiana pacers': 'Ind',
      'clippers': 'Lac', 'los angeles clippers': 'Lac', 'la clippers': 'Lac',
      'lakers': 'Lal', 'los angeles lakers': 'Lal',
      'grizzlies': 'Mem', 'memphis grizzlies': 'Mem',
      'heat': 'Mia', 'miami heat': 'Mia',
      'bucks': 'Mil', 'milwaukee bucks': 'Mil',
      'timberwolves': 'Min', 'minnesota timberwolves': 'Min', 'twolves': 'Min',
      'pelicans': 'Nop', 'new orleans pelicans': 'Nop', 'pels': 'Nop',
      'knicks': 'Nyk', 'new york knicks': 'Nyk',
      'thunder': 'Okc', 'oklahoma city thunder': 'Okc',
      'magic': 'Orl', 'orlando magic': 'Orl',
      '76ers': 'Phi', 'philadelphia 76ers': 'Phi', 'sixers': 'Phi',
      'suns': 'Phx', 'phoenix suns': 'Phx',
      'blazers': 'Por', 'portland trail blazers': 'Por',
      'kings': 'Sac', 'sacramento kings': 'Sac',
      'spurs': 'Sas', 'san antonio spurs': 'Sas',
      'raptors': 'Tor', 'toronto raptors': 'Tor',
      'jazz': 'Uta', 'utah jazz': 'Uta',
      'wizards': 'Was', 'washington wizards': 'Was'
    };
    
    const lowerQuery = query.toLowerCase();
    
    // To handle cases like "Los Angeles Lakers", we should check for full names first
    const sortedTeamKeys = Object.keys(teamMap).sort((a, b) => b.length - a.length);

    for (const key of sortedTeamKeys) {
      if (lowerQuery.includes(key)) {
        return teamMap[key];
      }
    }
    
    // Return null if no mapping found, to be handled in fetchData
    return null;
  }

  extractPlayersFromTradeQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    const forKeywords = [' trade for ', ' for '];
    for (const keyword of forKeywords) {
        const keywordIndex = lowerQuery.indexOf(keyword);
        if (keywordIndex !== -1) {
            const player1 = query.substring(0, keywordIndex).trim();
            const player2 = query.substring(keywordIndex + keyword.length).trim();
            if (player1 && player2) {
                return [player1, player2];
            }
        }
    }

    // "trade Player A and Player B"
    if (lowerQuery.startsWith('trade ')) {
        const remainingQuery = query.substring(6);
        const lowerRemaining = remainingQuery.toLowerCase();
        if (lowerRemaining.includes(' and ')) {
            const andIndex = lowerRemaining.indexOf(' and ');
            const player1 = remainingQuery.substring(0, andIndex).trim();
            const player2 = remainingQuery.substring(andIndex + 5).trim();
            if (player1 && player2) {
                return [player1, player2];
            }
        }
        return [remainingQuery.trim()].filter(p => p);
    }
    
    return [];
  }

  analyzeTeamWeaknesses(players) {
    // Simple weakness analysis based on roster composition
    const positions = {};
    let totalSalary = 0;
    
    players.forEach(player => {
      const pos = player.position || 'Unknown';
      positions[pos] = (positions[pos] || 0) + 1;
      totalSalary += player.salary || 0;
    });
    
    const weaknesses = [];
    
    // Check position balance
    if ((positions['G'] || 0) < 2) weaknesses.push('Need more guards');
    if ((positions['F'] || 0) < 2) weaknesses.push('Need more forwards');
    if ((positions['C'] || 0) < 1) weaknesses.push('Need a center');
    
    // Check salary distribution
    const avgSalary = totalSalary / players.length;
    if (avgSalary > 15000000) weaknesses.push('High salary burden');
    
    return weaknesses.length > 0 ? weaknesses : ['Well-balanced roster'];
  }
}

module.exports = SimplifiedNBAChatHandler; 