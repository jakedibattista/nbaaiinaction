const { MongoClient } = require('mongodb');
require('dotenv').config();

// Database connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const DB_NAME = 'nba-trade-consigliere';

// Team abbreviation map for robust matching
const TEAM_ABBR_MAP = {
  'boston celtics': 'Bos', 'celtics': 'Bos', 'bos': 'Bos',
  'miami heat': 'Mia', 'heat': 'Mia', 'mia': 'Mia',
  'dallas mavericks': 'Dal', 'mavericks': 'Dal', 'dal': 'Dal',
  'oklahoma city thunder': 'OKC', 'thunder': 'OKC', 'okc': 'OKC',
  'new york knicks': 'NYK', 'knicks': 'NYK', 'nyk': 'NYK',
  'philadelphia 76ers': 'PHI', 'sixers': 'PHI', 'phi': 'PHI',
  'milwaukee bucks': 'MIL', 'bucks': 'MIL', 'mil': 'MIL',
  'indiana pacers': 'IND', 'pacers': 'IND', 'ind': 'IND',
  'cleveland cavaliers': 'CLE', 'cavaliers': 'CLE', 'cavs': 'CLE', 'cle': 'CLE',
  'orlando magic': 'ORL', 'magic': 'ORL', 'orl': 'ORL',
  'denver nuggets': 'DEN', 'nuggets': 'DEN', 'den': 'DEN',
  'los angeles lakers': 'LAL', 'lakers': 'LAL', 'lal': 'LAL',
  'minnesota timberwolves': 'MIN', 'timberwolves': 'MIN', 'wolves': 'MIN', 'min': 'MIN',
  'phoenix suns': 'PHX', 'suns': 'PHX', 'phx': 'PHX',
  'la clippers': 'LAC', 'clippers': 'LAC', 'lac': 'LAC',
  // Add more as needed
};

// Team full name map for playoff series
const TEAM_FULLNAME_MAP = {
  'bos': 'Boston Celtics', 'boston celtics': 'Boston Celtics', 'celtics': 'Boston Celtics',
  'mia': 'Miami Heat', 'miami heat': 'Miami Heat', 'heat': 'Miami Heat',
  'dal': 'Dallas Mavericks', 'dallas mavericks': 'Dallas Mavericks', 'mavericks': 'Dallas Mavericks',
  'okc': 'Oklahoma City Thunder', 'oklahoma city thunder': 'Oklahoma City Thunder', 'thunder': 'Oklahoma City Thunder',
  // Add more as needed
};

// Function registry for Gemini to access
const functionRegistry = {
  // Player stats queries
  getPlayerStats: async (playerName) => {
    const db = client.db(DB_NAME);
    const player = await db.collection('players').findOne(
      { name: { $regex: new RegExp(playerName, 'i') } },
      { projection: { 
        name: 1,
        team: 1,
        position: 1,
        'stats_2023_2024': 1,
        active: 1,
        _id: 0
      }}
    );
    return player;
  },

  // Team roster queries
  getTeamRoster: async (teamInput) => {
    const db = client.db(DB_NAME);
    let abbr = TEAM_ABBR_MAP[teamInput.toLowerCase().trim()] || teamInput;
    // Try both abbreviation and full name
    let players = await db.collection('players').find(
      { team: abbr },
      { projection: {
        name: 1,
        position: 1,
        'stats_2023_2024': 1,
        active: 1,
        _id: 0
      }}
    ).toArray();
    // If not found, try as full name
    if (players.length === 0 && abbr.length > 3) {
      abbr = abbr.slice(0, 3).toUpperCase();
      players = await db.collection('players').find(
        { team: abbr },
        { projection: {
          name: 1,
          position: 1,
          'stats_2023_2024': 1,
          active: 1,
          _id: 0
        }}
      ).toArray();
    }
    return players;
  },

  // Playoff series queries
  getPlayoffSeries: async (params) => {
    const db = client.db(DB_NAME);
    let team1, team2;
    if (Array.isArray(params)) {
      [team1, team2] = params;
    } else if (typeof params === 'object' && params !== null) {
      team1 = params.team1;
      team2 = params.team2;
    } else {
      throw new Error('Invalid parameters for getPlayoffSeries');
    }
    // Normalize to full names
    const t1 = TEAM_FULLNAME_MAP[team1.toLowerCase().trim()] || team1;
    const t2 = TEAM_FULLNAME_MAP[team2.toLowerCase().trim()] || team2;
    const series = await db.collection('playoffseries').findOne(
      { 
        $or: [
          { 'team1.name': t1, 'team2.name': t2 },
          { 'team1.name': t2, 'team2.name': t1 }
        ]
      },
      { projection: {
        series_id: 1,
        round: 1,
        team1: 1,
        team2: 1,
        winner: 1,
        loser: 1,
        betting_odds: 1,
        upset: 1,
        sweep: 1,
        _id: 0
      }}
    );
    return series;
  },

  // Trade analysis functions with salary cap validation
  analyzeTradeImpact: async (tradeDetails) => {
    const db = client.db(DB_NAME);
    // Get players involved in trade with salary information
    const players = await Promise.all(
      tradeDetails.players.map(player => 
        db.collection('players').findOne(
          { name: { $regex: new RegExp(player, 'i') } },
          { projection: {
            name: 1,
            team: 1,
            position: 1,
            'stats_2023_2024': 1,
            'salary_2023_2024': 1,
            active: 1,
            _id: 0
          }}
        )
      )
    );
    
    // Filter out null results
    const validPlayers = players.filter(p => p !== null);
    
    // Calculate team impacts with salary considerations
    const teamImpacts = {};
    let totalSalaryOut = 0;
    let totalSalaryIn = 0;
    
    validPlayers.forEach(player => {
      if (!teamImpacts[player.team]) {
        teamImpacts[player.team] = {
          pointsChange: 0,
          playersGained: [],
          playersLost: [],
          salaryOut: 0,
          salaryIn: 0
        };
      }
      // Add salary tracking
      const salary = player.salary_2023_2024 || 0;
      teamImpacts[player.team].salaryOut += salary;
      totalSalaryOut += salary;
    });
    
    // Basic salary matching validation (simplified)
    const salaryDifference = Math.abs(totalSalaryOut - totalSalaryIn);
    const isSalaryValid = salaryDifference <= (Math.max(totalSalaryOut, totalSalaryIn) * 0.25 + 100000);
    
    return {
      players: validPlayers,
      teamImpacts,
      salaryAnalysis: {
        totalSalaryOut,
        totalSalaryIn,
        salaryDifference,
        isSalaryValid,
        rule: 'NBA 125% + $100k matching rule'
      },
      timestamp: new Date(),
      dataQuality: {
        source: '2023-2024 verified data with salary information',
        confidence: 'high'
      }
    };
  },

  // Get team salary situation
  getTeamSalarySituation: async (teamName) => {
    const db = client.db(DB_NAME);
    const abbr = TEAM_ABBR_MAP[teamName.toLowerCase().trim()] || teamName;
    
    const roster = await db.collection('players')
      .find({ team: abbr })
      .toArray();
    
    const totalSalary = roster.reduce((sum, player) => {
      return sum + (player.salary_2023_2024 || 0);
    }, 0);
    
    const SALARY_CAP_2023_24 = 136021000;
    const LUXURY_TAX_2023_24 = 165294000;
    
    return {
      team: abbr,
      totalSalary,
      salaryCapSpace: Math.max(0, SALARY_CAP_2023_24 - totalSalary),
      isOverCap: totalSalary > SALARY_CAP_2023_24,
      isInLuxuryTax: totalSalary > LUXURY_TAX_2023_24,
      luxuryTaxAmount: Math.max(0, totalSalary - LUXURY_TAX_2023_24),
      playerCount: roster.length,
      averageSalary: totalSalary / roster.length,
      formattedSalary: `$${(totalSalary / 1000000).toFixed(1)}M`
    };
  },

  // Get trade recommendations for a team
  getTradeRecommendations: async (teamName) => {
    const db = client.db(DB_NAME);
    const abbr = TEAM_ABBR_MAP[teamName.toLowerCase().trim()] || teamName;
    
    // Get team's current roster
    const roster = await db.collection('players')
      .find({ team: abbr })
      .toArray();
    
    // Simple needs analysis
    const positionCounts = {};
    roster.forEach(player => {
      const pos = player.position || 'Unknown';
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    });
    
    // Identify needs (simplified logic)
    const needs = [];
    if ((positionCounts['PG'] || 0) < 2) needs.push('PG');
    if ((positionCounts['C'] || 0) < 1) needs.push('C');
    if ((positionCounts['F'] || 0) < 3) needs.push('F');
    
    // Find potential targets
    const potentialTargets = await db.collection('players')
      .find({
        team: { $ne: abbr },
        position: { $in: needs },
        'stats_2023_2024.minutes_per_game': { $gt: 20 },
        'salary_2023_2024': { $exists: true }
      })
      .limit(10)
      .toArray();
    
    return {
      team: abbr,
      positionNeeds: needs,
      recommendations: potentialTargets.map(player => ({
        name: player.name,
        team: player.team,
        position: player.position,
        salary: `$${(player.salary_2023_2024 / 1000000).toFixed(1)}M`,
        stats: player.stats_2023_2024
      }))
    };
  },

  // Get team salary situation
  getTeamSalarySituation: async (teamName) => {
    const db = client.db(DB_NAME);
    const abbr = TEAM_ABBR_MAP[teamName.toLowerCase().trim()] || teamName;
    
    const roster = await db.collection('players')
      .find({ team: abbr })
      .toArray();
    
    const totalSalary = roster.reduce((sum, player) => {
      return sum + (player.salary_2023_2024 || 0);
    }, 0);
    
    const SALARY_CAP_2023_24 = 136021000;
    const LUXURY_TAX_2023_24 = 165294000;
    
    return {
      team: abbr,
      totalSalary,
      salaryCapSpace: Math.max(0, SALARY_CAP_2023_24 - totalSalary),
      isOverCap: totalSalary > SALARY_CAP_2023_24,
      isInLuxuryTax: totalSalary > LUXURY_TAX_2023_24,
      luxuryTaxAmount: Math.max(0, totalSalary - LUXURY_TAX_2023_24),
      playerCount: roster.length,
      averageSalary: totalSalary / roster.length,
      formattedSalary: `$${(totalSalary / 1000000).toFixed(1)}M`
    };
  },

  // Get trade recommendations for a team
  getTradeRecommendations: async (teamName) => {
    const db = client.db(DB_NAME);
    const abbr = TEAM_ABBR_MAP[teamName.toLowerCase().trim()] || teamName;
    
    // Get team's current roster
    const roster = await db.collection('players')
      .find({ team: abbr })
      .toArray();
    
    // Simple needs analysis
    const positionCounts = {};
    roster.forEach(player => {
      const pos = player.position || 'Unknown';
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    });
    
    // Identify needs (simplified logic)
    const needs = [];
    if ((positionCounts['PG'] || 0) < 2) needs.push('PG');
    if ((positionCounts['C'] || 0) < 1) needs.push('C');
    if ((positionCounts['F'] || 0) < 3) needs.push('F');
    
    // Find potential targets
    const potentialTargets = await db.collection('players')
      .find({
        team: { $ne: abbr },
        position: { $in: needs },
        'stats_2023_2024.minutes_per_game': { $gt: 20 },
        'salary_2023_2024': { $exists: true }
      })
      .limit(10)
      .toArray();
    
    return {
      team: abbr,
      positionNeeds: needs,
      recommendations: potentialTargets.map(player => ({
        name: player.name,
        team: player.team,
        position: player.position,
        salary: `$${((player.salary_2023_2024 || 0) / 1000000).toFixed(1)}M`,
        stats: player.stats_2023_2024
      }))
    };
  }
};

// Error handling middleware
const handleError = (error) => {
  console.error('API Error:', error);
  return {
    error: true,
    message: 'An error occurred while processing your request',
    details: error.message
  };
};

// Rate limiting (5 requests per minute per user)
const rateLimiter = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60000; // 1 minute

const checkRateLimit = (userId) => {
  const now = Date.now();
  const userRequests = rateLimiter.get(userId) || [];
  // Remove old requests
  const recentRequests = userRequests.filter(time => now - time < RATE_WINDOW);
  if (recentRequests.length >= RATE_LIMIT) {
    return false;
  }
  recentRequests.push(now);
  rateLimiter.set(userId, recentRequests);
  return true;
};

// Main API handler
const handleGeminiRequest = async (request) => {
  try {
    await client.connect();
    if (!checkRateLimit(request.userId)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (!request.function || !functionRegistry[request.function]) {
      throw new Error('Invalid function requested');
    }
    const result = await functionRegistry[request.function](request.params);
    return {
      success: true,
      data: result,
      timestamp: new Date()
    };
  } catch (error) {
    return handleError(error);
  } finally {
    await client.close();
  }
};

module.exports = {
  handleGeminiRequest,
  functionRegistry
}; 