/**
 * Simplified NBA Chat Handler - Optimized for 4 Main Scenarios
 * 1. Player Stats: "Josh Giddey" → stats + similar salary players
 * 2. Team Makeup: "Lakers" → salary info + weaknesses  
 * 3. Trade Legality: "LeBron for Luka" → CBA check + impact
 * 4. Playoff Impact: "How would this trade affect playoff chances?"
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch');

const DEFAULT_MCP_SERVER_URL = 'http://localhost:8765';
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || DEFAULT_MCP_SERVER_URL;

class SimplifiedNBAChatHandler {
  constructor(db, geminiApiKey) {
    this.db = db;
    this.geminiApiKey = geminiApiKey;
    this.model = new GoogleGenerativeAI(geminiApiKey).getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
    this.MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://mcp:3001';
    
    // Ensure the API key is provided
    if (!geminiApiKey) {
      throw new Error("Gemini API key is required.");
    }
  }

  /**
   * Check if a query is about a trade
   */
  isTradeQuery(query) {
    const tradePatterns = [
      /trade/i,
      /swap/i,
      /exchange/i,
      /deal/i,
      /can we trade/i,
      /can i trade/i,
      /would this trade/i,
      /is this trade/i
    ];
    return tradePatterns.some(pattern => pattern.test(query));
  }

  /**
   * Extract player names from a trade query
   */
  extractPlayersFromTradeQuery(query) {
    const playerPattern = /(?:trade|swap|exchange|deal)\s+(?:for|with)\s+([^?]+)/i;
    const match = query.match(playerPattern);
    if (match) {
      const players = match[1].split(/\s+(?:for|with)\s+/);
      return players.map(p => p.trim());
    }
    return [];
  }

  /**
   * Extract team name from query
   */
  extractTeamName(query) {
    const teamMap = {
      'celtics': 'Boston Celtics',
      'lakers': 'Los Angeles Lakers',
      'warriors': 'Golden State Warriors',
      'mavericks': 'Dallas Mavericks',
      'nuggets': 'Denver Nuggets',
      'heat': 'Miami Heat',
      'knicks': 'New York Knicks',
      'bucks': 'Milwaukee Bucks',
      'suns': 'Phoenix Suns',
      'clippers': 'Los Angeles Clippers',
      '76ers': 'Philadelphia 76ers',
      'nets': 'Brooklyn Nets',
      'bulls': 'Chicago Bulls',
      'pistons': 'Detroit Pistons',
      'pacers': 'Indiana Pacers',
      'hornets': 'Charlotte Hornets',
      'hawks': 'Atlanta Hawks',
      'magic': 'Orlando Magic',
      'wizards': 'Washington Wizards',
      'raptors': 'Toronto Raptors',
      'cavaliers': 'Cleveland Cavaliers',
      'grizzlies': 'Memphis Grizzlies',
      'pelicans': 'New Orleans Pelicans',
      'rockets': 'Houston Rockets',
      'spurs': 'San Antonio Spurs',
      'thunder': 'Oklahoma City Thunder',
      'jazz': 'Utah Jazz',
      'timberwolves': 'Minnesota Timberwolves',
      'trail blazers': 'Portland Trail Blazers',
      'kings': 'Sacramento Kings'
    };

    const cleanQuery = query.toLowerCase();
    for (const [key, value] of Object.entries(teamMap)) {
      if (cleanQuery.includes(key)) {
        return value;
      }
    }
    return null;
  }

  /**
   * Extract player name from query
   */
  extractPlayerName(query) {
    // Remove common prefixes and suffixes
    const cleanQuery = query
      .replace(/^(show|tell|get|find|search|look|what|how|can|is|are|was|were|will|would|should|could|do|does|did|have|has|had)\s+/i, '')
      .replace(/\s+(stats|statistics|numbers|data|info|information|details|record|performance|playoff|regular season|this season|last season|career)$/i, '')
      .trim();

    return cleanQuery;
  }

  /**
   * Classify the query using Gemini
   */
  async classifyQuery(query) {
    try {
      console.log('[HANDLER] 1. Classifying query...');
      
      const prompt = `You are an NBA expert assistant. Classify this query into one of these categories:
1. PLAYER_STATS - Questions about player performance, stats, or individual analysis
2. TEAM_MAKEUP - Questions about team roster, composition, or team analysis
3. TRADE_LEGALITY - Questions about trade validity, CBA rules, or salary matching
4. PLAYOFF_IMPLICATIONS - Questions about playoff impact, seeding, or postseason scenarios

Query: "${query}"

Respond with ONLY a JSON object in this exact format:
{
  "type": "PLAYER_STATS" or "TEAM_MAKEUP" or "TRADE_LEGALITY" or "PLAYOFF_IMPLICATIONS",
  "teams": ["team names mentioned"],
  "players": ["player names mentioned"],
  "needsClarification": true/false
}

Examples:
"Show me LeBron's stats" -> {"type": "PLAYER_STATS", "teams": [], "players": ["LeBron"], "needsClarification": false}
"Tell me about the Celtics" -> {"type": "TEAM_MAKEUP", "teams": ["Celtics"], "players": [], "needsClarification": false}
"Can we trade Luka for Tatum?" -> {"type": "TRADE_LEGALITY", "teams": [], "players": ["Luka", "Tatum"], "needsClarification": false}
"How would this trade affect the playoffs?" -> {"type": "PLAYOFF_IMPLICATIONS", "teams": [], "players": [], "needsClarification": true}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      try {
        const classification = JSON.parse(response);
        console.log('[HANDLER] Classification result:', classification);
        return classification;
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        return this.fallbackClassification(query);
      }
    } catch (error) {
      console.error('Error calling Gemini:', error);
      return this.fallbackClassification(query);
    }
  }

  /**
   * Fallback classification using pattern matching
   */
  fallbackClassification(query) {
    const cleanQuery = query.toLowerCase().trim();
    
    // Trade patterns - check first since they're most specific
    if (this.isTradeQuery(cleanQuery)) {
      return {
        type: 'TRADE_LEGALITY',
        query: query,
        teams: [],
        players: this.extractPlayersFromTradeQuery(query),
        needsClarification: false
      };
    }
    
    // Team patterns - check if the query contains a team name from our map
    const teamName = this.extractTeamName(cleanQuery);
    if (teamName) {
      return {
        type: 'TEAM_MAKEUP',
        query: query,
        teams: [teamName],
        players: [],
        needsClarification: false
      };
    }
    
    // Default to player query - most flexible
    return {
      type: 'PLAYER_STATS',
      query: query,
      teams: [],
      players: [this.extractPlayerName(query)],
      needsClarification: false
    };
  }

  /**
   * Process a chat query
   */
  async processChat(query) {
    try {
      console.log('[HANDLER] Starting chat processing...');
      
      // 1. Classify the query
      const classification = await this.classifyQuery(query);
      console.log('[HANDLER] Query classified as:', classification.type);
      
      // 2. Fetch data from MCP server
      const data = await this.fetchData(query, classification);
      console.log('[HANDLER] Data fetched from MCP:', data.success);
      
      // 3. Generate response based on classification and data
      let response;
      switch (classification.type) {
        case 'PLAYER_STATS':
          response = this.createPlayerPrompt(data, query);
          break;
        case 'TEAM_MAKEUP':
          response = this.createTeamPrompt(data, query);
          break;
        case 'TRADE_LEGALITY':
          response = this.createTradePrompt(data, query);
          break;
        case 'PLAYOFF_IMPLICATIONS':
          response = this.createPlayoffPrompt(data, query);
          break;
        default:
          response = "I'm not sure how to handle that type of query. Please try asking about player stats, team makeup, trade legality, or playoff implications.";
      }
      
      return {
        success: true,
        response: response,
        queryType: classification,
        data: data.data
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
   * Fetch data from MCP server
   */
  async fetchData(query, classification) {
    try {
      console.log('[HANDLER] Fetching data from MCP server...');
      
      const response = await fetch(`${this.MCP_SERVER_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          type: classification.type,
          teams: classification.teams,
          players: classification.players
        })
      });

      if (!response.ok) {
        throw new Error(`MCP server responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[HANDLER] MCP server response:', data);

      return { 
        success: true, 
        data: data
      };
      
    } catch (error) {
      console.error('[HANDLER] Error fetching data from MCP:', error);
        return { 
          success: false, 
        error: error.message
      };
    }
  }

  /**
   * Create player analysis prompt
   */
  createPlayerPrompt(data, query) {
    if (!data.success || !data.data || !data.data.response) {
      return `I couldn't find stats for that player. Please make sure you've spelled the name correctly. The error was: ${data.error || 'Could not find player data.'}`;
    }

    return data.data.response;
  }

  /**
   * Create team analysis prompt  
   */
  createTeamPrompt(data, query) {
    if (!data.success || !data.data || !data.data.response) {
      return `I couldn't find information for that team. Please make sure you've spelled the team name correctly. The error was: ${data.error || 'Could not find team data.'}`;
    }

    return data.data.response;
  }

  /**
   * Create trade analysis prompt
   */
  createTradePrompt(data, query) {
    if (!data.success || !data.data || !data.data.response) {
      return `I couldn't analyze that trade. Please make sure you've spelled the player names correctly. The error was: ${data.error || 'Could not find player data.'}`;
    }

    return data.data.response;
  }

  /**
   * Create playoff analysis prompt
   */
  createPlayoffPrompt(data, query) {
    if (!data.success || !data.data || !data.data.players || data.data.players.length === 0) {
      return `I couldn't analyze the playoff impact. Please make sure you've spelled the player names correctly. The error was: ${data.error || 'Could not find player data.'}`;
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
    - FG%: ${stats.field_goal_percentage || 'N/A'}
    - 3P%: ${stats.three_point_percentage || 'N/A'}
    - FT%: ${stats.free_throw_percentage || 'N/A'}`;
    });

    return `You are an NBA playoff analyst. Your analysis is strictly based on the provided 2023-2024 playoff data. Do not analyze defense as it's not in the data.

DATA PROVIDED:${playerComparison}

YOUR TASK:
1. Analyze how this trade would affect each team's playoff chances
2. Consider the offensive impact on both teams
3. Evaluate the salary implications for future roster building
Keep the analysis concise and focused on the provided data.`;
  }
}

module.exports = SimplifiedNBAChatHandler; 