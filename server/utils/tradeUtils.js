// NBA Trade Salary Cap Utilities with 2023 CBA Rules

const SALARY_CAP_2023_24 = 136021000; // $136,021,000
const LUXURY_TAX_2023_24 = 165294000; // $165,294,000
const FIRST_APRON_2023_24 = 172346000; // $172,346,000
const SECOND_APRON_2023_24 = 182794000; // $182,794,000

/**
 * Validates if a trade meets NBA salary matching rules
 * @param {Object} tradeDetails - Trade details with players and teams
 * @param {Object} db - Database connection
 * @returns {Object} Validation result with isValid boolean and details
 */
async function validateTrade(tradeDetails, db) {
  try {
    const { players, teams } = tradeDetails;
    
    // Get player salary information
    const playerSalaries = await Promise.all(
      players.map(async (playerId) => {
        const player = await db.collection('players').findOne({ _id: playerId });
        return {
          id: playerId,
          name: player?.name || 'Unknown',
          team: player?.team || 'Unknown',
          salary: player?.salary_2023_2024 || 0
        };
      })
    );

    // Group players by team
    const teamTrades = {};
    playerSalaries.forEach(player => {
      if (!teamTrades[player.team]) {
        teamTrades[player.team] = {
          playersOut: [],
          playersIn: [],
          salaryOut: 0,
          salaryIn: 0
        };
      }
    });

    // Calculate salary exchanges for each team
    playerSalaries.forEach(player => {
      const currentTeam = player.team;
      const destinationTeam = teams.find(t => t !== currentTeam);
      
      teamTrades[currentTeam].playersOut.push(player);
      teamTrades[currentTeam].salaryOut += player.salary;
      
      if (teamTrades[destinationTeam]) {
        teamTrades[destinationTeam].playersIn.push(player);
        teamTrades[destinationTeam].salaryIn += player.salary;
      }
    });

    // Validate salary matching rules
    const validationResults = [];
    for (const [team, trade] of Object.entries(teamTrades)) {
      const result = validateSalaryMatching(trade.salaryOut, trade.salaryIn);
      validationResults.push({
        team,
        ...result,
        salaryOut: trade.salaryOut,
        salaryIn: trade.salaryIn
      });
    }

    const isValid = validationResults.every(result => result.isValid);
    
    return {
      isValid,
      results: validationResults,
      summary: {
        totalTeams: Object.keys(teamTrades).length,
        validTeams: validationResults.filter(r => r.isValid).length
      }
    };

  } catch (error) {
    return {
      isValid: false,
      error: error.message,
      results: []
    };
  }
}

/**
 * Validates salary matching between outgoing and incoming salaries
 * @param {number} salaryOut - Outgoing salary
 * @param {number} salaryIn - Incoming salary
 * @returns {Object} Validation result
 */
function validateSalaryMatching(salaryOut, salaryIn, teamPayroll = 0) {
  const FIRST_APRON_2023_24 = 172346000;
  const SECOND_APRON_2023_24 = 182794000;
  
  // Check team apron status
  const isFirstApronTeam = teamPayroll >= FIRST_APRON_2023_24 && teamPayroll < SECOND_APRON_2023_24;
  const isSecondApronTeam = teamPayroll >= SECOND_APRON_2023_24;
  
  let isValid = true;
  let violations = [];
  
  // First Apron Rule: Cannot take back more salary than sent out
  if (isFirstApronTeam && salaryIn > salaryOut) {
    isValid = false;
    violations.push("First Apron teams cannot take back more salary than they send out");
  }
  
  // Second Apron Rule: Cannot aggregate salaries (simplified for MVP)
  if (isSecondApronTeam && salaryIn > salaryOut) {
    isValid = false;
    violations.push("Second Apron teams have severe trade restrictions");
  }
  
  // Standard salary matching for non-apron teams
  if (!isFirstApronTeam && !isSecondApronTeam) {
    const salaryDiff = Math.abs(salaryOut - salaryIn);
    const maxDiff = Math.max(salaryOut, salaryIn) * 0.25 + 100000; // 125% + $100k rule
    
    if (salaryDiff > maxDiff) {
      isValid = false;
      violations.push("Salary matching: difference exceeds 125% + $100k rule");
    }
  }
  
  return {
    isValid,
    violations,
    salaryDifference: Math.abs(salaryOut - salaryIn),
    teamApronStatus: isSecondApronTeam ? 'Second Apron' : 
                   isFirstApronTeam ? 'First Apron' : 'Below Apron',
    rule: isSecondApronTeam ? 'Second Apron restrictions' :
          isFirstApronTeam ? 'First Apron restrictions' :
          'Standard 125% + $100k rule'
  };
}

/**
 * Calculates team salary and cap situation
 * @param {string} teamAbbreviation - Team abbreviation (e.g., 'BOS')
 * @param {Object} db - Database connection
 * @returns {Object} Team salary information
 */
async function getTeamSalarySituation(teamAbbreviation, db) {
  try {
    // Try to get team salary from teams collection first (more accurate)
    const teamData = await db.collection('teams').findOne({ _id: teamAbbreviation });
    let totalSalary = teamData?.total_payroll || 0;
    
    // If not found, calculate from players collection
    if (!totalSalary) {
      const roster = await db.collection('players')
        .find({ team: teamAbbreviation })
        .toArray();
      
      totalSalary = roster.reduce((sum, player) => {
        return sum + (player.salary_2023_2024 || 0);
      }, 0);
    }
    
    const FIRST_APRON_2023_24 = 172346000;
    const SECOND_APRON_2023_24 = 182794000;
    
    const capSpace = Math.max(0, SALARY_CAP_2023_24 - totalSalary);
    const luxuryTaxAmount = Math.max(0, totalSalary - LUXURY_TAX_2023_24);
    const firstApronAmount = Math.max(0, totalSalary - FIRST_APRON_2023_24);
    const secondApronAmount = Math.max(0, totalSalary - SECOND_APRON_2023_24);
    
    return {
      team: teamAbbreviation,
      totalSalary,
      salaryCapSpace: capSpace,
      isOverCap: totalSalary > SALARY_CAP_2023_24,
      isInLuxuryTax: totalSalary > LUXURY_TAX_2023_24,
      isFirstApron: totalSalary >= FIRST_APRON_2023_24,
      isSecondApron: totalSalary >= SECOND_APRON_2023_24,
      luxuryTaxAmount,
      firstApronAmount,
      secondApronAmount,
      apronStatus: totalSalary >= SECOND_APRON_2023_24 ? 'Second Apron' :
                  totalSalary >= FIRST_APRON_2023_24 ? 'First Apron' :
                  totalSalary > LUXURY_TAX_2023_24 ? 'Luxury Tax' :
                  totalSalary > SALARY_CAP_2023_24 ? 'Over Cap' : 'Under Cap',
      luxuryTaxStatus: teamData?.luxury_tax_status || 'Unknown',
      playerCount: roster?.length || 0,
      averageSalary: totalSalary / (roster?.length || 1)
    };
    
  } catch (error) {
    throw new Error(`Error calculating team salary: ${error.message}`);
  }
}

/**
 * Analyzes team needs based on current roster and stats
 * @param {Object} team - Team information
 * @param {Array} roster - Array of player objects
 * @returns {Object} Team needs analysis
 */
function calculateTeamNeeds(team, roster) {
  const positionCounts = {};
  const totalStats = {
    points: 0,
    rebounds: 0,
    assists: 0,
    games: 0
  };
  
  roster.forEach(player => {
    // Count positions
    const pos = player.position || 'Unknown';
    positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    
    // Aggregate stats
    if (player.stats_2023_2024) {
      const stats = player.stats_2023_2024;
      totalStats.points += stats.points_per_game || 0;
      totalStats.rebounds += stats.rebounds_per_game || 0;
      totalStats.assists += stats.assists_per_game || 0;
      totalStats.games += stats.games_played || 0;
    }
  });
  
  // Identify position needs (simplified logic)
  const needs = {
    positions: [],
    stats: [],
    priority: 'medium'
  };
  
  // Check for position gaps
  if ((positionCounts['PG'] || 0) < 2) needs.positions.push('PG');
  if ((positionCounts['C'] || 0) < 1) needs.positions.push('C');
  if ((positionCounts['F'] || 0) < 3) needs.positions.push('F');
  
  // Check for statistical needs
  if (totalStats.points < 110) needs.stats.push('scoring');
  if (totalStats.rebounds < 45) needs.stats.push('rebounding');
  if (totalStats.assists < 25) needs.stats.push('playmaking');
  
  return needs;
}

/**
 * Formats salary for display
 * @param {number} salary - Salary amount
 * @returns {string} Formatted salary string
 */
function formatSalary(salary) {
  if (salary >= 1000000) {
    return `$${(salary / 1000000).toFixed(1)}M`;
  } else if (salary >= 1000) {
    return `$${(salary / 1000).toFixed(0)}K`;
  } else {
    return `$${salary.toLocaleString()}`;
  }
}

module.exports = {
  validateTrade,
  validateSalaryMatching,
  getTeamSalarySituation,
  calculateTeamNeeds,
  formatSalary,
  SALARY_CAP_2023_24,
  LUXURY_TAX_2023_24
}; 