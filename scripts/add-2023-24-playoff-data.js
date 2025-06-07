const mongoose = require('mongoose');

// Connect to NBA Trade Consigliere database
const mongoUri = 'mongodb+srv://jakeadibattista:E7ghUWhWzJMHhNEc@aiinaction.1ey4ypo.mongodb.net/nba-trade-consigliere?retryWrites=true&w=majority&appName=Aiinaction';

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define schemas
const playoffSeriesSchema = new mongoose.Schema({
    series_id: { type: String, required: true, unique: true },
    season: { type: String, default: '2023-24' },
    round: { type: String, required: true }, // 'First Round', 'Conference Semifinals', 'Conference Finals', 'NBA Finals'
    conference: { type: String }, // 'Eastern', 'Western', null for Finals
    
    // Teams
    team1: {
        name: String,
        abbreviation: String,
        seed: Number,
        conference: String
    },
    team2: {
        name: String, 
        abbreviation: String,
        seed: Number,
        conference: String
    },
    
    // Series Result
    winner: {
        name: String,
        abbreviation: String,
        games_won: Number
    },
    loser: {
        name: String,
        abbreviation: String, 
        games_won: Number
    },
    
    // Betting Information
    betting_odds: {
        team1_moneyline: Number, // Pre-series moneyline odds
        team2_moneyline: Number,
        team1_spread: Number,    // Game spread favorite
        team2_spread: Number,
        over_under: Number,      // Total games in series
        favorite: String         // Team abbreviation of betting favorite
    },
    
    // Additional Context
    upset: { type: Boolean, default: false }, // Lower seed beat higher seed
    sweep: { type: Boolean, default: false }, // 4-0 series
    created_at: { type: Date, default: Date.now }
});

const PlayoffSeries = mongoose.model('PlayoffSeries', playoffSeriesSchema);

// 2023-24 NBA Playoff Data (based on actual results)
const playoff2024Data = [
    // EASTERN CONFERENCE FIRST ROUND
    {
        series_id: 'east-first-celtics-heat',
        round: 'First Round',
        conference: 'Eastern',
        team1: { name: 'Boston Celtics', abbreviation: 'BOS', seed: 1, conference: 'Eastern' },
        team2: { name: 'Miami Heat', abbreviation: 'MIA', seed: 8, conference: 'Eastern' },
        winner: { name: 'Boston Celtics', abbreviation: 'BOS', games_won: 4 },
        loser: { name: 'Miami Heat', abbreviation: 'MIA', games_won: 1 },
        betting_odds: {
            team1_moneyline: -450,  // Celtics heavy favorites
            team2_moneyline: +350,  // Heat big underdogs
            team1_spread: -8.5,
            team2_spread: +8.5,
            over_under: 5.5,
            favorite: 'BOS'
        },
        upset: false,
        sweep: false
    },
    {
        series_id: 'east-first-knicks-sixers',
        round: 'First Round', 
        conference: 'Eastern',
        team1: { name: 'New York Knicks', abbreviation: 'NYK', seed: 2, conference: 'Eastern' },
        team2: { name: 'Philadelphia 76ers', abbreviation: 'PHI', seed: 7, conference: 'Eastern' },
        winner: { name: 'New York Knicks', abbreviation: 'NYK', games_won: 4 },
        loser: { name: 'Philadelphia 76ers', abbreviation: 'PHI', games_won: 2 },
        betting_odds: {
            team1_moneyline: -180,
            team2_moneyline: +155,
            team1_spread: -3.5,
            team2_spread: +3.5,
            over_under: 6.5,
            favorite: 'NYK'
        },
        upset: false,
        sweep: false
    },
    {
        series_id: 'east-first-bucks-pacers',
        round: 'First Round',
        conference: 'Eastern', 
        team1: { name: 'Milwaukee Bucks', abbreviation: 'MIL', seed: 3, conference: 'Eastern' },
        team2: { name: 'Indiana Pacers', abbreviation: 'IND', seed: 6, conference: 'Eastern' },
        winner: { name: 'Indiana Pacers', abbreviation: 'IND', games_won: 4 },
        loser: { name: 'Milwaukee Bucks', abbreviation: 'MIL', games_won: 2 },
        betting_odds: {
            team1_moneyline: -220,
            team2_moneyline: +185,
            team1_spread: -4.5,
            team2_spread: +4.5,
            over_under: 6.5,
            favorite: 'MIL'
        },
        upset: true, // 6 seed beat 3 seed
        sweep: false
    },
    {
        series_id: 'east-first-cavs-magic',
        round: 'First Round',
        conference: 'Eastern',
        team1: { name: 'Cleveland Cavaliers', abbreviation: 'CLE', seed: 4, conference: 'Eastern' },
        team2: { name: 'Orlando Magic', abbreviation: 'ORL', seed: 5, conference: 'Eastern' },
        winner: { name: 'Cleveland Cavaliers', abbreviation: 'CLE', games_won: 4 },
        loser: { name: 'Orlando Magic', abbreviation: 'ORL', games_won: 3 },
        betting_odds: {
            team1_moneyline: -140,
            team2_moneyline: +120,
            team1_spread: -2.5,
            team2_spread: +2.5,
            over_under: 6.5,
            favorite: 'CLE'
        },
        upset: false,
        sweep: false
    },

    // WESTERN CONFERENCE FIRST ROUND  
    {
        series_id: 'west-first-thunder-pelicans',
        round: 'First Round',
        conference: 'Western',
        team1: { name: 'Oklahoma City Thunder', abbreviation: 'OKC', seed: 1, conference: 'Western' },
        team2: { name: 'New Orleans Pelicans', abbreviation: 'NOP', seed: 8, conference: 'Western' },
        winner: { name: 'Oklahoma City Thunder', abbreviation: 'OKC', games_won: 4 },
        loser: { name: 'New Orleans Pelicans', abbreviation: 'NOP', games_won: 0 },
        betting_odds: {
            team1_moneyline: -400,
            team2_moneyline: +320,
            team1_spread: -7.5,
            team2_spread: +7.5,
            over_under: 5.5,
            favorite: 'OKC'
        },
        upset: false,
        sweep: true // Thunder swept Pelicans
    },
    {
        series_id: 'west-first-nuggets-lakers',
        round: 'First Round',
        conference: 'Western',
        team1: { name: 'Denver Nuggets', abbreviation: 'DEN', seed: 2, conference: 'Western' },
        team2: { name: 'Los Angeles Lakers', abbreviation: 'LAL', seed: 7, conference: 'Western' },
        winner: { name: 'Denver Nuggets', abbreviation: 'DEN', games_won: 4 },
        loser: { name: 'Los Angeles Lakers', abbreviation: 'LAL', games_won: 1 },
        betting_odds: {
            team1_moneyline: -200,
            team2_moneyline: +170,
            team1_spread: -4.5,
            team2_spread: +4.5,
            over_under: 6.5,
            favorite: 'DEN'
        },
        upset: false,
        sweep: false
    },
    {
        series_id: 'west-first-wolves-suns',
        round: 'First Round',
        conference: 'Western',
        team1: { name: 'Minnesota Timberwolves', abbreviation: 'MIN', seed: 3, conference: 'Western' },
        team2: { name: 'Phoenix Suns', abbreviation: 'PHX', seed: 6, conference: 'Western' },
        winner: { name: 'Minnesota Timberwolves', abbreviation: 'MIN', games_won: 4 },
        loser: { name: 'Phoenix Suns', abbreviation: 'PHX', games_won: 0 }, 
        betting_odds: {
            team1_moneyline: -160,
            team2_moneyline: +140,
            team1_spread: -3.5,
            team2_spread: +3.5,
            over_under: 6.5,
            favorite: 'MIN'
        },
        upset: false,
        sweep: true // Wolves swept Suns
    },
    {
        series_id: 'west-first-clippers-mavs',
        round: 'First Round',
        conference: 'Western',
        team1: { name: 'LA Clippers', abbreviation: 'LAC', seed: 4, conference: 'Western' },
        team2: { name: 'Dallas Mavericks', abbreviation: 'DAL', seed: 5, conference: 'Western' },
        winner: { name: 'Dallas Mavericks', abbreviation: 'DAL', games_won: 4 },
        loser: { name: 'LA Clippers', abbreviation: 'LAC', games_won: 2 },
        betting_odds: {
            team1_moneyline: -130,
            team2_moneyline: +110,
            team1_spread: -2.5,
            team2_spread: +2.5,
            over_under: 6.5,
            favorite: 'LAC'
        },
        upset: true, // 5 seed beat 4 seed
        sweep: false
    },

    // EASTERN CONFERENCE SEMIFINALS
    {
        series_id: 'east-semis-celtics-cavs',
        round: 'Conference Semifinals',
        conference: 'Eastern',
        team1: { name: 'Boston Celtics', abbreviation: 'BOS', seed: 1, conference: 'Eastern' },
        team2: { name: 'Cleveland Cavaliers', abbreviation: 'CLE', seed: 4, conference: 'Eastern' },
        winner: { name: 'Boston Celtics', abbreviation: 'BOS', games_won: 4 },
        loser: { name: 'Cleveland Cavaliers', abbreviation: 'CLE', games_won: 1 },
        betting_odds: {
            team1_moneyline: -350,
            team2_moneyline: +280,
            team1_spread: -6.5,
            team2_spread: +6.5,
            over_under: 5.5,
            favorite: 'BOS'
        },
        upset: false,
        sweep: false
    },
    {
        series_id: 'east-semis-knicks-pacers',
        round: 'Conference Semifinals',
        conference: 'Eastern',
        team1: { name: 'New York Knicks', abbreviation: 'NYK', seed: 2, conference: 'Eastern' },
        team2: { name: 'Indiana Pacers', abbreviation: 'IND', seed: 6, conference: 'Eastern' },
        winner: { name: 'Indiana Pacers', abbreviation: 'IND', games_won: 4 },
        loser: { name: 'New York Knicks', abbreviation: 'NYK', games_won: 3 },
        betting_odds: {
            team1_moneyline: -150,
            team2_moneyline: +130,
            team1_spread: -3.0,
            team2_spread: +3.0,
            over_under: 6.5,
            favorite: 'NYK'
        },
        upset: true, // 6 seed beat 2 seed
        sweep: false
    },

    // WESTERN CONFERENCE SEMIFINALS
    {
        series_id: 'west-semis-thunder-mavs',
        round: 'Conference Semifinals',
        conference: 'Western',
        team1: { name: 'Oklahoma City Thunder', abbreviation: 'OKC', seed: 1, conference: 'Western' },
        team2: { name: 'Dallas Mavericks', abbreviation: 'DAL', seed: 5, conference: 'Western' },
        winner: { name: 'Dallas Mavericks', abbreviation: 'DAL', games_won: 4 },
        loser: { name: 'Oklahoma City Thunder', abbreviation: 'OKC', games_won: 2 },
        betting_odds: {
            team1_moneyline: -180,
            team2_moneyline: +155,
            team1_spread: -3.5,
            team2_spread: +3.5,
            over_under: 6.5,
            favorite: 'OKC'
        },
        upset: true, // 5 seed beat 1 seed - MAJOR upset
        sweep: false
    },
    {
        series_id: 'west-semis-nuggets-wolves',
        round: 'Conference Semifinals', 
        conference: 'Western',
        team1: { name: 'Denver Nuggets', abbreviation: 'DEN', seed: 2, conference: 'Western' },
        team2: { name: 'Minnesota Timberwolves', abbreviation: 'MIN', seed: 3, conference: 'Western' },
        winner: { name: 'Minnesota Timberwolves', abbreviation: 'MIN', games_won: 4 },
        loser: { name: 'Denver Nuggets', abbreviation: 'DEN', games_won: 3 },
        betting_odds: {
            team1_moneyline: -120,
            team2_moneyline: +100,
            team1_spread: -1.5,
            team2_spread: +1.5,
            over_under: 6.5,
            favorite: 'DEN'
        },
        upset: true, // 3 seed beat 2 seed (defending champs)
        sweep: false
    },

    // CONFERENCE FINALS
    {
        series_id: 'east-finals-celtics-pacers',
        round: 'Conference Finals',
        conference: 'Eastern',
        team1: { name: 'Boston Celtics', abbreviation: 'BOS', seed: 1, conference: 'Eastern' },
        team2: { name: 'Indiana Pacers', abbreviation: 'IND', seed: 6, conference: 'Eastern' },
        winner: { name: 'Boston Celtics', abbreviation: 'BOS', games_won: 4 },
        loser: { name: 'Indiana Pacers', abbreviation: 'IND', games_won: 0 },
        betting_odds: {
            team1_moneyline: -280,
            team2_moneyline: +230,
            team1_spread: -5.5,
            team2_spread: +5.5,
            over_under: 5.5,
            favorite: 'BOS'
        },
        upset: false,
        sweep: true // Celtics swept Pacers
    },
    {
        series_id: 'west-finals-mavs-wolves',
        round: 'Conference Finals',
        conference: 'Western',
        team1: { name: 'Dallas Mavericks', abbreviation: 'DAL', seed: 5, conference: 'Western' },
        team2: { name: 'Minnesota Timberwolves', abbreviation: 'MIN', seed: 3, conference: 'Western' },
        winner: { name: 'Dallas Mavericks', abbreviation: 'DAL', games_won: 4 },
        loser: { name: 'Minnesota Timberwolves', abbreviation: 'MIN', games_won: 1 },
        betting_odds: {
            team1_moneyline: -110,
            team2_moneyline: -110,
            team1_spread: -0.5,
            team2_spread: +0.5,
            over_under: 6.5,
            favorite: 'DAL' // Slight favorite
        },
        upset: false, // Close matchup
        sweep: false
    },

    // NBA FINALS
    {
        series_id: 'finals-celtics-mavs',
        round: 'NBA Finals',
        conference: null,
        team1: { name: 'Boston Celtics', abbreviation: 'BOS', seed: 1, conference: 'Eastern' },
        team2: { name: 'Dallas Mavericks', abbreviation: 'DAL', seed: 5, conference: 'Western' },
        winner: { name: 'Boston Celtics', abbreviation: 'BOS', games_won: 4 },
        loser: { name: 'Dallas Mavericks', abbreviation: 'DAL', games_won: 1 },
        betting_odds: {
            team1_moneyline: -210,  // Celtics favored in Finals
            team2_moneyline: +175,
            team1_spread: -4.0,
            team2_spread: +4.0,
            over_under: 6.5,
            favorite: 'BOS'
        },
        upset: false,
        sweep: false
    }
];

async function addPlayoffData() {
    console.log('🏀 Adding 2023-24 NBA Playoff Data to NBA Trade Consigliere Database\n');
    
    try {
        // Clear existing playoff data 
        await PlayoffSeries.deleteMany({ season: '2023-24' });
        console.log('🧹 Cleared existing 2023-24 playoff data\n');
        
        // Insert new playoff data
        const insertedSeries = await PlayoffSeries.insertMany(playoff2024Data);
        console.log(`✅ Successfully added ${insertedSeries.length} playoff series!\n`);
        
        // Display summary
        console.log('📊 2023-24 NBA Playoff Series Summary:');
        console.log('─'.repeat(70));
        
        const rounds = ['First Round', 'Conference Semifinals', 'Conference Finals', 'NBA Finals'];
        
        for (const round of rounds) {
            console.log(`\n🎯 ${round.toUpperCase()}:`);
            const roundSeries = insertedSeries.filter(s => s.round === round);
            
            roundSeries.forEach(series => {
                const winnerGames = series.winner.games_won;
                const loserGames = series.loser.games_won;
                const seriesLength = winnerGames + loserGames;
                const upsetEmoji = series.upset ? '🚨' : '';
                const sweepEmoji = series.sweep ? '🧹' : '';
                
                console.log(`  ${series.winner.name} beat ${series.loser.name} ${winnerGames}-${loserGames} ${upsetEmoji}${sweepEmoji}`);
                console.log(`    Betting: ${series.betting_odds.favorite} favored (${series.betting_odds.team1_moneyline > 0 ? '+' : ''}${series.betting_odds.team1_moneyline})`);
            });
        }
        
        // Stats summary
        const totalUpsets = insertedSeries.filter(s => s.upset).length;
        const totalSweeps = insertedSeries.filter(s => s.sweep).length;
        
        console.log('\n📈 PLAYOFF HIGHLIGHTS:');
        console.log(`🚨 Major Upsets: ${totalUpsets}`);
        console.log(`🧹 Sweeps: ${totalSweeps}`);
        console.log(`🏆 Champion: Boston Celtics (64-18 regular season)`);
        console.log(`🥈 Runner-up: Dallas Mavericks (5th seed Cinderella run)`);
        
        console.log('\n🔥 Notable Stories:');
        console.log('• Dallas Mavericks (5th seed) made Finals run');
        console.log('• Oklahoma City Thunder (1st seed) upset in Round 2');
        console.log('• Denver Nuggets (defending champs) eliminated in Round 2');
        console.log('• Indiana Pacers (6th seed) made Conference Finals');
        
        return insertedSeries;
        
    } catch (error) {
        console.error('❌ Error adding playoff data:', error.message);
        throw error;
    }
}

async function createPlayoffIndexes() {
    console.log('\n🚀 Creating playoff data indexes for lightning-fast queries...\n');
    
    try {
        const indexes = [
            { round: 1 },
            { conference: 1 },
            { 'team1.abbreviation': 1 },
            { 'team2.abbreviation': 1 },
            { 'winner.abbreviation': 1 },
            { upset: 1 },
            { sweep: 1 },
            { series_id: 1 }
        ];
        
        for (const index of indexes) {
            await PlayoffSeries.collection.createIndex(index);
            const indexName = Object.keys(index)[0];
            console.log(`✅ Created index: ${indexName}_1`);
        }
        
        console.log('\n⚡ Playoff indexes created! Trade simulation queries will be instant!');
        
    } catch (error) {
        console.error('❌ Error creating indexes:', error.message);
    }
}

async function main() {
    try {
        const playoffSeries = await addPlayoffData();
        await createPlayoffIndexes();
        
        console.log('\n🎉 2023-24 NBA Playoff Data Integration Complete!');
        console.log('🤖 Ready for AI-powered "what if" trade scenarios:');
        console.log('   • "What if Lakers traded for Damian Lillard?"');
        console.log('   • "Could the Warriors have beaten the Celtics?"'); 
        console.log('   • "How would trading Jayson Tatum change the Finals?"');
        console.log('\n🚀 NBA Trade Consigliere database is fully loaded!');
        
    } catch (error) {
        console.error('❌ Fatal error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔐 Database connection closed');
    }
}

if (require.main === module) {
    main();
} 