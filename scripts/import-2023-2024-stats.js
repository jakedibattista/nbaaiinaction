const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
require('dotenv').config();

console.log('🏀 NBA Trade Consigliere - Importing 2023-2024 Player Stats');
console.log('================================================\n');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Player Schema - flexible to accommodate different data structures
const playerSchema = new mongoose.Schema({
    name: String,
    team: String,
    position: String,
    season: String,
    stats_2023_2024: {
        games_played: Number,
        minutes_per_game: Number,
        points_per_game: Number,
        rebounds_per_game: Number,
        assists_per_game: Number,
        steals_per_game: Number,
        blocks_per_game: Number,
        turnovers_per_game: Number,
        field_goal_percentage: Number,
        three_point_percentage: Number,
        free_throw_percentage: Number,
        field_goals_made: Number,
        field_goals_attempted: Number,
        three_pointers_made: Number,
        three_pointers_attempted: Number,
        free_throws_made: Number,
        free_throws_attempted: Number,
        total_points: Number,
        total_rebounds: Number,
        total_assists: Number
    },
    salary_estimate: Number,
    active: { type: Boolean, default: true }
}, { strict: false });

const Player = mongoose.model('Player', playerSchema);

async function importPlayerStats() {
    const csvFilePath = 'data/NBA Stats 202324 All Stats  NBA Player Props Tool (4).csv';
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
        console.error('❌ CSV file not found:', csvFilePath);
        console.log('📁 Available files in data folder:');
        fs.readdirSync('data').forEach(file => console.log('  -', file));
        process.exit(1);
    }

    console.log('📊 Reading CSV file:', csvFilePath);
    
    const players = [];
    let rowCount = 0;

    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                rowCount++;
                
                // Log first few rows to understand the data structure
                if (rowCount <= 5) {
                    console.log(`Row ${rowCount} data:`, {
                        NAME: row.NAME,
                        TEAM: row.TEAM,
                        POS: row.POS,
                        PPG: row.PPG
                    });
                }
                
                players.push(row);
            })
            .on('end', async () => {
                console.log(`\n✅ Successfully read ${players.length} player records from CSV`);
                
                if (players.length > 0) {
                    console.log('\n📋 CSV Column Headers:');
                    Object.keys(players[0]).forEach((key, index) => {
                        console.log(`  ${index + 1}. ${key}`);
                    });
                }
                
                await processPlayers(players);
                resolve();
            })
            .on('error', (error) => {
                console.error('❌ Error reading CSV:', error);
                reject(error);
            });
    });
}

async function processPlayers(players) {
    console.log('\n🔄 Processing and importing player data...\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < players.length; i++) {
        const playerRow = players[i];
        
        try {
            // Map CSV columns to our schema - using exact column names from CSV
            const playerData = {
                name: playerRow.NAME || playerRow.Player || playerRow.PLAYER,
                team: playerRow.TEAM || playerRow.Team || playerRow.Tm,
                position: playerRow.POS || playerRow.Position || playerRow.Pos,
                season: '2023-2024',
                stats_2023_2024: {
                    games_played: parseFloat(playerRow.GP) || parseFloat(playerRow.G) || 0,
                    minutes_per_game: parseFloat(playerRow.MPG) || parseFloat(playerRow.MP) || 0,
                    points_per_game: parseFloat(playerRow.PPG) || parseFloat(playerRow.PTS) || 0,
                    rebounds_per_game: parseFloat(playerRow.RPG) || parseFloat(playerRow.TRB) || 0,
                    assists_per_game: parseFloat(playerRow.APG) || parseFloat(playerRow.AST) || 0,
                    steals_per_game: parseFloat(playerRow.SPG) || parseFloat(playerRow.STL) || 0,
                    blocks_per_game: parseFloat(playerRow.BPG) || parseFloat(playerRow.BLK) || 0,
                    turnovers_per_game: parseFloat(playerRow.TPG) || parseFloat(playerRow.TOV) || 0,
                    field_goal_percentage: parseFloat(playerRow['FG%']) || parseFloat(playerRow.FG_PCT) || 0,
                    three_point_percentage: parseFloat(playerRow['3P%']) || parseFloat(playerRow.FG3_PCT) || 0,
                    free_throw_percentage: parseFloat(playerRow['FT%']) || parseFloat(playerRow.FT_PCT) || 0,
                    field_goals_made: parseFloat(playerRow.FGM) || parseFloat(playerRow.FG) || 0,
                    field_goals_attempted: parseFloat(playerRow.FGA) || 0,
                    three_pointers_made: parseFloat(playerRow['3PM']) || parseFloat(playerRow['3P']) || 0,
                    three_pointers_attempted: parseFloat(playerRow['3PA']) || 0,
                    free_throws_made: parseFloat(playerRow.FTM) || parseFloat(playerRow.FT) || 0,
                    free_throws_attempted: parseFloat(playerRow.FTA) || 0
                },
                active: true
            };

            // Skip if no player name
            if (!playerData.name || playerData.name.trim() === '') {
                if (i < 10) { // Only log first 10 for debugging
                    console.log(`⚠️  Skipping row ${i + 1}: No player name found (NAME='${playerRow.NAME}')`);
                }
                continue;
            }

            // Calculate totals if we have per-game stats and games played
            const games = playerData.stats_2023_2024.games_played;
            if (games > 0) {
                playerData.stats_2023_2024.total_points = playerData.stats_2023_2024.points_per_game * games;
                playerData.stats_2023_2024.total_rebounds = playerData.stats_2023_2024.rebounds_per_game * games;
                playerData.stats_2023_2024.total_assists = playerData.stats_2023_2024.assists_per_game * games;
            }

            // Update or insert player
            await Player.findOneAndUpdate(
                { 
                    name: playerData.name,
                    season: playerData.season 
                },
                playerData,
                { 
                    upsert: true, 
                    new: true,
                    setDefaultsOnInsert: true
                }
            );

            successCount++;
            
            // Show progress for first few and then every 50
            if (successCount <= 5 || successCount % 50 === 0) {
                console.log(`✅ Imported: ${playerData.name} (${playerData.team}) - ${successCount} total`);
            }

        } catch (error) {
            errorCount++;
            console.error(`❌ Error processing player ${playerRow.NAME || playerRow.Player || 'Unknown'}: ${error.message}`);
        }
    }

    console.log('\n📊 Import Summary:');
    console.log(`  ✅ Successfully imported: ${successCount} players`);
    console.log(`  ❌ Errors encountered: ${errorCount} players`);
    console.log(`  📈 Total processed: ${successCount + errorCount} players`);
    
    if (successCount > 0) {
        console.log('\n🎉 2023-2024 NBA player stats successfully imported!');
        
        // Show a sample of imported data
        const samplePlayer = await Player.findOne({ season: '2023-2024' });
        if (samplePlayer) {
            console.log('\n📋 Sample imported player:');
            console.log(`  Name: ${samplePlayer.name}`);
            console.log(`  Team: ${samplePlayer.team}`);
            console.log(`  Position: ${samplePlayer.position}`);
            console.log(`  PPG: ${samplePlayer.stats_2023_2024?.points_per_game || 'N/A'}`);
            console.log(`  RPG: ${samplePlayer.stats_2023_2024?.rebounds_per_game || 'N/A'}`);
            console.log(`  APG: ${samplePlayer.stats_2023_2024?.assists_per_game || 'N/A'}`);
        }
    }
}

// Run the import
importPlayerStats()
    .then(() => {
        console.log('\n🏁 Import process completed!');
        mongoose.connection.close();
    })
    .catch((error) => {
        console.error('\n💥 Import failed:', error);
        mongoose.connection.close();
        process.exit(1);
    }); 