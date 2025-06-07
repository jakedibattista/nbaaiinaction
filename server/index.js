const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nba_trade_consigliere');
    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Initialize database connection
connectDB();

// MongoDB Schemas (based on our playground schema)
const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  team: { type: String, required: true },
  position: { type: String, required: true },
  jersey_number: Number,
  age: Number,
  height: String,
  weight: Number,
  salary: Number,
  contract_years: Number,
  stats_2025: {
    regular_season: {
      games: Number,
      games_started: Number,
      minutes: Number,
      pts: Number,
      reb: Number,
      ast: Number,
      stl: Number,
      blk: Number,
      fg_pct: Number,
      fg3_pct: Number,
      ft_pct: Number,
      tov: Number,
      pf: Number,
      plus_minus: Number,
      usage_rate: Number,
      true_shooting: Number,
      effective_fg: Number,
      per: Number,
      win_shares: Number,
      box_plus_minus: Number,
      value_over_replacement: Number
    },
    playoffs: {
      games: Number,
      games_started: Number,
      minutes: Number,
      pts: Number,
      reb: Number,
      ast: Number,
      stl: Number,
      blk: Number,
      fg_pct: Number,
      fg3_pct: Number,
      ft_pct: Number,
      tov: Number,
      pf: Number,
      plus_minus: Number,
      usage_rate: Number,
      true_shooting: Number,
      effective_fg: Number,
      per: Number,
      win_shares: Number,
      box_plus_minus: Number,
      value_over_replacement: Number
    }
  },
  active: { type: Boolean, default: true },
  all_star: { type: Boolean, default: false },
  awards: [String],
  injuries: [{
    type: String,
    games_missed: Number,
    return_date: Date
  }]
}, { timestamps: true });

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  abbreviation: { type: String, required: true, unique: true },
  city: String,
  conference: { type: String, enum: ['Eastern', 'Western'] },
  division: String,
  arena: String,
  coach: String,
  stats_2025: {
    regular_season: {
      wins: Number,
      losses: Number,
      win_pct: Number,
      conf_rank: Number,
      playoff_seed: Number,
      pts_per_game: Number,
      opp_pts_per_game: Number,
      offensive_rating: Number,
      defensive_rating: Number,
      net_rating: Number,
      pace: Number,
      strength_of_schedule: Number,
      remaining_strength_of_schedule: Number,
      schedule_adjusted_rating: Number,
      consistency_rating: Number,
      adjusted_four_factors: Number,
      achievement_level: Number,
      current_streak: String,
      home_record: {
        wins: Number,
        losses: Number
      },
      away_record: {
        wins: Number,
        losses: Number
      },
      division_record: {
        wins: Number,
        losses: Number
      },
      conference_record: {
        wins: Number,
        losses: Number
      }
    },
    playoffs: {
      series_wins: Number,
      series_losses: Number,
      games_won: Number,
      games_lost: Number,
      rounds_reached: String,
      championship: Boolean,
      pts_per_game: Number,
      opp_pts_per_game: Number,
      offensive_rating: Number,
      defensive_rating: Number,
      net_rating: Number,
      home_record: {
        wins: Number,
        losses: Number
      },
      away_record: {
        wins: Number,
        losses: Number
      }
    }
  },
  roster_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  team_stats: {
    total_salary: Number,
    luxury_tax: Number,
    cap_space: Number,
    draft_picks: [{
      year: Number,
      round: Number,
      pick: Number,
      protected: Boolean
    }]
  }
}, { timestamps: true });

const userQuerySchema = new mongoose.Schema({
  user_query: { type: String, required: true },
  processed_query: {
    trade_type: String,
    teams: [String],
    players_out: [String],
    players_in: [String],
    context: String
  },
  gemini_response: String,
  related_trade_scenario: { type: mongoose.Schema.Types.ObjectId, ref: 'TradeScenario' },
  data_sources: [String],
  response_confidence: Number,
  processing_time_ms: Number,
  user_satisfaction: {
    rating: Number,
    feedback: String
  }
}, { timestamps: true });

// MongoDB Models
const Player = mongoose.model('Player', playerSchema);
const Team = mongoose.model('Team', teamSchema);
const UserQuery = mongoose.model('UserQuery', userQuerySchema);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'NBA Trade Consigliere API is running!',
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    endpoints: {
      query: 'POST /api/query',
      players: 'GET /api/players',
      teams: 'GET /api/teams',
      import: 'POST /api/import/players',
      'import-teams': 'POST /api/import/teams'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Import players from balldontlie.io
app.post('/api/import/players', async (req, res) => {
  try {
    console.log('🏀 Starting player data import from balldontlie.io...');
    
    // Get all players from balldontlie.io
    const playersResponse = await axios.get('https://www.balldontlie.io/api/v1/players', {
      params: {
        per_page: 100 // Adjust based on API limits
      }
    });

    const playersData = playersResponse.data.data;
    console.log(`📥 Fetched ${playersData.length} players from API`);

    let importedCount = 0;
    let skippedCount = 0;

    for (const playerData of playersData) {
      try {
        // Check if player already exists
        const existingPlayer = await Player.findOne({ 
          name: `${playerData.first_name} ${playerData.last_name}` 
        });

        if (existingPlayer) {
          skippedCount++;
          continue;
        }

        // Create new player with basic info (stats will be populated later)
        const newPlayer = new Player({
          name: `${playerData.first_name} ${playerData.last_name}`,
          team: playerData.team.abbreviation,
          position: playerData.position || 'G', // Default to Guard if no position
          height: `${playerData.height_feet}-${playerData.height_inches}`,
          weight: playerData.weight_pounds,
          active: true,
          stats_2025: {
            regular_season: {
              games: 0, minutes: 0, pts: 0, reb: 0, ast: 0,
              stl: 0, blk: 0, fg_pct: 0, fg3_pct: 0, ft_pct: 0,
              tov: 0, pf: 0, plus_minus: 0
            },
            playoffs: {
              games: 0, minutes: 0, pts: 0, reb: 0, ast: 0,
              stl: 0, blk: 0, fg_pct: 0, fg3_pct: 0, ft_pct: 0,
              tov: 0, pf: 0, plus_minus: 0
            }
          }
        });

        await newPlayer.save();
        importedCount++;

        if (importedCount % 50 === 0) {
          console.log(`✅ Imported ${importedCount} players so far...`);
        }

      } catch (playerError) {
        console.error(`Error importing player ${playerData.first_name} ${playerData.last_name}:`, playerError.message);
      }
    }

    console.log(`🎉 Import complete! ${importedCount} new players imported, ${skippedCount} skipped (already exist)`);
    
    res.json({
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      total: playersData.length,
      message: 'Player import completed successfully'
    });

  } catch (error) {
    console.error('Player import error:', error);
    res.status(500).json({ 
      error: 'Failed to import players',
      details: error.message 
    });
  }
});

// Import teams from balldontlie.io
app.post('/api/import/teams', async (req, res) => {
  try {
    console.log('🏀 Starting team data import from balldontlie.io...');
    
    const teamsResponse = await axios.get('https://www.balldontlie.io/api/v1/teams');
    const teamsData = teamsResponse.data.data;
    
    console.log(`📥 Fetched ${teamsData.length} teams from API`);

    let importedCount = 0;
    let skippedCount = 0;

    for (const teamData of teamsData) {
      try {
        const existingTeam = await Team.findOne({ abbreviation: teamData.abbreviation });

        if (existingTeam) {
          skippedCount++;
          continue;
        }

        const newTeam = new Team({
          name: teamData.full_name,
          abbreviation: teamData.abbreviation,
          city: teamData.city,
          conference: teamData.conference,
          division: teamData.division,
          stats_2025: {
            regular_season: {
              wins: 0, losses: 0, win_pct: 0, conf_rank: 0, playoff_seed: 0,
              pts_per_game: 0, opp_pts_per_game: 0, offensive_rating: 0,
              defensive_rating: 0, net_rating: 0, pace: 0
            },
            playoffs: {
              series_wins: 0, series_losses: 0, games_won: 0, games_lost: 0,
              rounds_reached: '', championship: false, pts_per_game: 0,
              opp_pts_per_game: 0, offensive_rating: 0, defensive_rating: 0, net_rating: 0
            }
          },
          roster_ids: []
        });

        await newTeam.save();
        importedCount++;

      } catch (teamError) {
        console.error(`Error importing team ${teamData.full_name}:`, teamError.message);
      }
    }

    console.log(`🎉 Team import complete! ${importedCount} new teams imported, ${skippedCount} skipped`);
    
    res.json({
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      total: teamsData.length,
      message: 'Team import completed successfully'
    });

  } catch (error) {
    console.error('Team import error:', error);
    res.status(500).json({ 
      error: 'Failed to import teams',
      details: error.message 
    });
  }
});

// Placeholder for Gemini AI query endpoint
app.post('/api/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Save user query to database
    const userQuery = new UserQuery({
      user_query: query,
      processed_query: {
        trade_type: 'unknown',
        teams: [],
        players_out: [],
        players_in: [],
        context: '2025_season'
      },
      gemini_response: `This is a placeholder response for: "${query}". Coming soon: Real Gemini AI analysis with MongoDB data!`,
      data_sources: ['placeholder'],
      response_confidence: 0.5,
      processing_time_ms: 500
    });

    await userQuery.save();
    
    res.json({
      query,
      response: userQuery.gemini_response,
      timestamp: new Date().toISOString(),
      source: 'placeholder',
      query_id: userQuery._id
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get players with optional filtering
app.get('/api/players', async (req, res) => {
  try {
    const { team, position, search, limit = 50 } = req.query;
    
    let query = { active: true };
    
    if (team) query.team = team.toUpperCase();
    if (position) query.position = position.toUpperCase();
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const players = await Player.find(query)
      .limit(parseInt(limit))
      .sort({ name: 1 });
    
    res.json({ 
      players, 
      count: players.length,
      filters: { team, position, search }
    });
  } catch (error) {
    console.error('Players error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get teams with optional filtering
app.get('/api/teams', async (req, res) => {
  try {
    const { conference } = req.query;
    
    let query = {};
    if (conference) query.conference = conference;

    const teams = await Team.find(query)
      .populate('roster_ids', 'name position')
      .sort({ name: 1 });
    
    res.json({ 
      teams, 
      count: teams.length,
      filters: { conference }
    });
  } catch (error) {
    console.error('Teams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get database stats
app.get('/api/stats', async (req, res) => {
  try {
    const playerCount = await Player.countDocuments({ active: true });
    const teamCount = await Team.countDocuments();
    const queryCount = await UserQuery.countDocuments();
    
    res.json({
      database: {
        players: playerCount,
        teams: teamCount,
        queries: queryCount
      },
      status: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🏀 NBA Trade Consigliere server running on port ${PORT}`);
  console.log(`📊 API documentation available at http://localhost:${PORT}`);
  console.log(`🔗 MongoDB connection: ${process.env.MONGODB_URI ? 'Remote' : 'Local'}`);
}); 