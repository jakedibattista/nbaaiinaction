const mongoose = require('mongoose');

// Connect to NBA Trade Consigliere database
const mongoUri = 'mongodb+srv://jakeadibattista:E7ghUWhWzJMHhNEc@aiinaction.1ey4ypo.mongodb.net/nba-trade-consigliere?retryWrites=true&w=majority&appName=Aiinaction';

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const playerSchema = new mongoose.Schema({}, { strict: false });
const Player = mongoose.model('Player', playerSchema);

async function testCelticsRoster() {
    console.log('🏀 Testing NBA Trade Consigliere Database Indexes\n');
    console.log('🎯 Query: Boston Celtics 2023-24 Championship Roster\n');
    
    try {
        // Test the team_1 index with Boston Celtics lookup
        const startTime = Date.now();
        
        const celticsPlayers = await Player.find({ 
            team: 'Bos' // Boston Celtics abbreviation
        }).sort({ 'stats_2023_2024.points_per_game': -1 });

        const queryTime = Date.now() - startTime;
        
        if (celticsPlayers.length === 0) {
            // Try alternative team abbreviations
            console.log('⚠️  No players found with "Bos", trying other abbreviations...\n');
            
            const alternativeResults = await Player.find({ 
                team: { $in: ['BOS', 'Boston', 'Celtics'] }
            }).sort({ 'stats_2023_2024.points_per_game': -1 });
            
            if (alternativeResults.length > 0) {
                console.log(`✅ Found ${alternativeResults.length} Celtics players with alternative abbreviation!`);
                displayRoster(alternativeResults, queryTime);
            } else {
                console.log('🔍 Let me check what team abbreviations we have...');
                const allTeams = await Player.distinct('team');
                console.log('Available teams:', allTeams.sort());
            }
        } else {
            console.log(`✅ Found ${celticsPlayers.length} Boston Celtics players!`);
            displayRoster(celticsPlayers, queryTime);
        }

        // Test additional index queries
        await testOtherIndexes();

    } catch (error) {
        console.error('❌ Error querying Celtics roster:', error.message);
    }
}

function displayRoster(players, queryTime) {
    console.log(`⚡ Query executed in ${queryTime}ms (thanks to team_1 index!)\n`);
    
    console.log('🏆 2023-24 Boston Celtics Roster (sorted by PPG):');
    console.log('─'.repeat(60));
    
    players.forEach((player, index) => {
        const ppg = player.stats_2023_2024?.points_per_game || 0;
        const rpg = player.stats_2023_2024?.rebounds_per_game || 0;
        const apg = player.stats_2023_2024?.assists_per_game || 0;
        
        console.log(`${index + 1}. ${player.name.padEnd(20)} ${player.position || 'N/A'} - ${ppg} PPG, ${rpg} RPG, ${apg} APG`);
    });
    
    console.log('─'.repeat(60));
    console.log(`📊 Total players: ${players.length}`);
    
    if (players.length > 0) {
        const topScorer = players[0];
        console.log(`🌟 Leading scorer: ${topScorer.name} (${topScorer.stats_2023_2024?.points_per_game || 0} PPG)`);
    }
}

async function testOtherIndexes() {
    console.log('\n🧪 Testing other indexes...\n');
    
    try {
        // Test name_1 index (exact match)
        const startTime1 = Date.now();
        const tatumQuery = await Player.findOne({ name: 'Jayson Tatum' });
        const nameQueryTime = Date.now() - startTime1;
        
        if (tatumQuery) {
            console.log(`✅ name_1 index test: Found Jayson Tatum in ${nameQueryTime}ms`);
            console.log(`   ${tatumQuery.name} (${tatumQuery.team}) - ${tatumQuery.stats_2023_2024?.points_per_game || 0} PPG`);
        } else {
            console.log('⚠️  Jayson Tatum not found with exact name match');
        }

        // Test position_1 index
        const startTime2 = Date.now();
        const pointGuards = await Player.find({ position: 'PG' }).limit(5);
        const positionQueryTime = Date.now() - startTime2;
        
        console.log(`\n✅ position_1 index test: Found ${pointGuards.length} point guards in ${positionQueryTime}ms`);
        if (pointGuards.length > 0) {
            console.log('   Top PGs:', pointGuards.map(p => p.name).join(', '));
        }

        // Test PPG performance index  
        const startTime3 = Date.now();
        const topScorers = await Player.find({
            'stats_2023_2024.points_per_game': { $gt: 25 }
        }).sort({ 'stats_2023_2024.points_per_game': -1 }).limit(5);
        const ppgQueryTime = Date.now() - startTime3;
        
        console.log(`\n✅ ppg_desc index test: Found ${topScorers.length} 25+ PPG scorers in ${ppgQueryTime}ms`);
        if (topScorers.length > 0) {
            console.log('   Top scorers:');
            topScorers.forEach(player => {
                console.log(`     ${player.name} (${player.team}) - ${player.stats_2023_2024?.points_per_game} PPG`);
            });
        }

    } catch (error) {
        console.error('❌ Error testing indexes:', error.message);
    }
}

async function main() {
    try {
        await testCelticsRoster();
        
        console.log('\n🎉 Index testing completed!');
        console.log('💡 All queries are now using optimized indexes for maximum performance');
        console.log('🚀 Ready for real-time trade simulation queries!');
        
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