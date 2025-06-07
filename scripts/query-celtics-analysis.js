const mongoose = require('mongoose');

// Connect to NBA Trade Consigliere database
const mongoUri = 'mongodb+srv://jakeadibattista:E7ghUWhWzJMHhNEc@aiinaction.1ey4ypo.mongodb.net/nba-trade-consigliere?retryWrites=true&w=majority&appName=Aiinaction';

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const playerSchema = new mongoose.Schema({}, { strict: false });
const playoffSeriesSchema = new mongoose.Schema({}, { strict: false });

const Player = mongoose.model('Player', playerSchema);
const PlayoffSeries = mongoose.model('PlayoffSeries', playoffSeriesSchema);

async function queryCelticsAnalysis() {
    console.log('🏀 NBA Trade Consigliere: Boston Celtics Analysis\n');
    
    try {
        // 1. Find highest scoring Celtics player
        console.log('🎯 HIGHEST SCORING BOSTON CELTICS PLAYER (2023-24):');
        console.log('─'.repeat(60));
        
        const celticsPlayers = await Player.find({ 
            team: 'Bos' 
        }).sort({ 'stats_2023_2024.points_per_game': -1 });

        if (celticsPlayers.length > 0) {
            const topScorer = celticsPlayers[0];
            console.log(`🌟 Leading Scorer: ${topScorer.name}`);
            console.log(`📊 Points Per Game: ${topScorer.stats_2023_2024?.points_per_game || 'N/A'} PPG`);
            console.log(`🏀 Rebounds Per Game: ${topScorer.stats_2023_2024?.rebounds_per_game || 'N/A'} RPG`);
            console.log(`🎯 Assists Per Game: ${topScorer.stats_2023_2024?.assists_per_game || 'N/A'} APG`);
            console.log(`⚡ Position: ${topScorer.position || 'N/A'}`);
            
            // Show top 3 scorers for context
            console.log('\n📈 Top 3 Celtics Scorers:');
            celticsPlayers.slice(0, 3).forEach((player, index) => {
                const ppg = player.stats_2023_2024?.points_per_game || 0;
                console.log(`  ${index + 1}. ${player.name} - ${ppg} PPG`);
            });
        }

        // 2. Find Celtics second round matchup
        console.log('\n\n🏆 BOSTON CELTICS 2023-24 PLAYOFF PATH:');
        console.log('─'.repeat(60));
        
        const celticsPlayoffSeries = await PlayoffSeries.find({
            $or: [
                { 'team1.abbreviation': 'BOS' },
                { 'team2.abbreviation': 'BOS' }
            ]
        }).sort({ round: 1 });

        if (celticsPlayoffSeries.length > 0) {
            celticsPlayoffSeries.forEach((series, index) => {
                const opponent = series.team1.abbreviation === 'BOS' 
                    ? series.team2.name 
                    : series.team1.name;
                
                const result = series.winner.abbreviation === 'BOS' 
                    ? `✅ WON ${series.winner.games_won}-${series.loser.games_won}`
                    : `❌ LOST ${series.loser.games_won}-${series.winner.games_won}`;
                
                const roundEmoji = {
                    'First Round': '🥇',
                    'Conference Semifinals': '🥈', 
                    'Conference Finals': '🥉',
                    'NBA Finals': '🏆'
                };
                
                console.log(`${roundEmoji[series.round] || '⚽'} ${series.round}: vs ${opponent} - ${result}`);
                
                // Highlight second round
                if (series.round === 'Conference Semifinals') {
                    console.log(`\n🎯 SECOND ROUND OPPONENT: ${opponent}`);
                    console.log(`📊 Series Result: ${result}`);
                    console.log(`🎲 Betting Favorite: ${series.betting_odds?.favorite || 'N/A'}`);
                    if (series.betting_odds?.team1_moneyline) {
                        console.log(`💰 Moneyline: ${series.betting_odds.team1_moneyline > 0 ? '+' : ''}${series.betting_odds.team1_moneyline}`);
                    }
                }
            });
            
            // Championship context
            const finalsSeries = celticsPlayoffSeries.find(s => s.round === 'NBA Finals');
            if (finalsSeries && finalsSeries.winner.abbreviation === 'BOS') {
                console.log('\n🏆 CHAMPIONSHIP RESULT: Boston Celtics - 2023-24 NBA Champions!');
                console.log(`🥇 Finals: Beat ${finalsSeries.loser.name} ${finalsSeries.winner.games_won}-${finalsSeries.loser.games_won}`);
            }
        }

        // 3. Trade simulation context
        console.log('\n\n💡 TRADE SIMULATION INSIGHTS:');
        console.log('─'.repeat(60));
        console.log('🤔 What if questions for our NBA Trade Consigliere:');
        console.log('   • "What if Celtics traded Jayson Tatum before playoffs?"');
        console.log('   • "How would trading Jaylen Brown affect the championship run?"');
        console.log('   • "Could the Celtics have won without their top scorer?"');
        console.log('\n🚀 Our database is ready to simulate these scenarios!');

    } catch (error) {
        console.error('❌ Error querying Celtics data:', error.message);
    }
}

async function main() {
    try {
        await queryCelticsAnalysis();
        
        console.log('\n✅ Query completed successfully!');
        console.log('🏀 Ready to build trade simulation engine with this data.');
        
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