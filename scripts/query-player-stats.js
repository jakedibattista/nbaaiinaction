const mongoose = require('mongoose');
require('dotenv').config();

console.log('🏀 NBA Trade Consigliere - Player Stats Query');
console.log('=============================================\n');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const playerSchema = new mongoose.Schema({}, { strict: false });
const Player = mongoose.model('Player', playerSchema);

async function queryPlayerStats(playerName) {
    try {
        console.log(`🔍 Searching for: ${playerName}\n`);
        
        // Search for player by name (case insensitive)
        const players = await Player.find({
            name: new RegExp(playerName, 'i')
        });

        if (players.length === 0) {
            console.log(`❌ No players found matching "${playerName}"`);
            
            // Show some sample player names for reference
            console.log('\n📋 Sample player names in database:');
            const samplePlayers = await Player.find({}).limit(10).select('name team season');
            samplePlayers.forEach(player => {
                console.log(`  • ${player.name} (${player.team}) - ${player.season || 'Unknown season'}`);
            });
            
            return;
        }

        console.log(`✅ Found ${players.length} record(s) for "${playerName}":\n`);

        players.forEach((player, index) => {
            console.log(`📊 Record ${index + 1}:`);
            console.log(`  Name: ${player.name}`);
            console.log(`  Team: ${player.team}`);
            console.log(`  Position: ${player.position}`);
            console.log(`  Season: ${player.season || 'Unknown'}`);
            
            // Check for 2023-2024 stats
            if (player.stats_2023_2024) {
                console.log(`  \n  📈 2023-2024 Stats:`);
                console.log(`    Games: ${player.stats_2023_2024.games_played || 'N/A'}`);
                console.log(`    PPG: ${player.stats_2023_2024.points_per_game || 'N/A'}`);
                console.log(`    RPG: ${player.stats_2023_2024.rebounds_per_game || 'N/A'}`);
                console.log(`    APG: ${player.stats_2023_2024.assists_per_game || 'N/A'}`);
                console.log(`    FG%: ${player.stats_2023_2024.field_goal_percentage || 'N/A'}`);
                console.log(`    3P%: ${player.stats_2023_2024.three_point_percentage || 'N/A'}`);
                console.log(`    FT%: ${player.stats_2023_2024.free_throw_percentage || 'N/A'}`);
            }
            
            // Check for other season stats (like 2024-2025)
            if (player.stats_2025) {
                console.log(`  \n  📈 2024-2025 Stats:`);
                console.log(`    Games: ${player.stats_2025.regular_season?.games || 'N/A'}`);
                console.log(`    PPG: ${player.stats_2025.regular_season?.pts || 'N/A'}`);
                console.log(`    RPG: ${player.stats_2025.regular_season?.reb || 'N/A'}`);
                console.log(`    APG: ${player.stats_2025.regular_season?.ast || 'N/A'}`);
            }
            
            console.log(`  \n  🆔 ObjectId: ${player._id}`);
            console.log('  ─────────────────────────────────────\n');
        });

    } catch (error) {
        console.error('❌ Error querying player stats:', error);
    }
}

// Get player name from command line or use default
const playerName = process.argv[2] || 'Anthony Edwards';

queryPlayerStats(playerName)
    .then(() => {
        console.log('\n🏁 Query completed!');
        mongoose.connection.close();
    })
    .catch((error) => {
        console.error('\n💥 Query failed:', error);
        mongoose.connection.close();
        process.exit(1);
    }); 