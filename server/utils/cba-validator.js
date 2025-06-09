const { MongoClient } = require('mongodb');
require('dotenv').config();

// CBA Constants (2023-24 Season)
const CBA_RULES = {
  SALARY_CAP: 136021000,
  LUXURY_TAX: 165294000,
  FIRST_APRON: 172300000,
  SECOND_APRON: 182800000,
  MINIMUM_SALARY: 953859,
  MAXIMUM_SALARY: 47600000,
  TRADE_MATCHING: {
    OVER_CAP: 1.25, // 125% + $100k
    UNDER_CAP: 1.0  // 100% matching
  }
};

// Agent Roles
const AGENT_ROLES = {
  COORDINATOR: 'coordinator',
  SALARY_ANALYST: 'salary_analyst',
  ROSTER_VALIDATOR: 'roster_validator',
  CBA_RULE_ENFORCER: 'cba_rule_enforcer'
};

class CBAValidator {
  constructor() {
    this.client = null;
    this.dbName = 'nba-trade-consigliere';
    this.agents = this.initializeAgents();
  }

  initializeAgents() {
    return {
      [AGENT_ROLES.COORDINATOR]: {
        role: AGENT_ROLES.COORDINATOR,
        capabilities: ['coordinate_agents', 'aggregate_results'],
        state: {}
      },
      [AGENT_ROLES.SALARY_ANALYST]: {
        role: AGENT_ROLES.SALARY_ANALYST,
        capabilities: ['calculate_salaries', 'analyze_cap_space'],
        state: {}
      },
      [AGENT_ROLES.ROSTER_VALIDATOR]: {
        role: AGENT_ROLES.ROSTER_VALIDATOR,
        capabilities: ['validate_roster_size', 'check_roster_limits'],
        state: {}
      },
      [AGENT_ROLES.CBA_RULE_ENFORCER]: {
        role: AGENT_ROLES.CBA_RULE_ENFORCER,
        capabilities: ['enforce_cba_rules', 'validate_trade_rules'],
        state: {}
      }
    };
  }

  async connect() {
    if (!this.client) {
      this.client = new MongoClient(process.env.MONGODB_URI);
      await this.client.connect();
    }
    return this.client.db(this.dbName);
  }

  async validateTrade(tradeDetails) {
    const db = await this.connect();
    
    try {
      // 1. Coordinator Agent: Initialize validation process
      const coordinator = this.agents[AGENT_ROLES.COORDINATOR];
      coordinator.state = { tradeDetails, startTime: Date.now() };

      // 2. Salary Analyst Agent: Calculate salary implications
      const salaryAnalyst = this.agents[AGENT_ROLES.SALARY_ANALYST];
      const salaryAnalysis = await this.analyzeSalaries(tradeDetails, db);
      salaryAnalyst.state = { analysis: salaryAnalysis };

      // 3. Roster Validator Agent: Check roster sizes
      const rosterValidator = this.agents[AGENT_ROLES.ROSTER_VALIDATOR];
      const rosterValidation = await this.validateRosterSizes(tradeDetails, db);
      rosterValidator.state = { validation: rosterValidation };

      // 4. CBA Rule Enforcer Agent: Validate against CBA rules
      const ruleEnforcer = this.agents[AGENT_ROLES.CBA_RULE_ENFORCER];
      const ruleValidation = await this.validateCBARules(salaryAnalysis, rosterValidation);
      ruleEnforcer.state = { validation: ruleValidation };

      // 5. Coordinator Agent: Aggregate results
      const finalResult = this.aggregateResults(
        salaryAnalysis,
        rosterValidation,
        ruleValidation
      );

      // 6. Update coordinator state with final result
      coordinator.state = {
        ...coordinator.state,
        endTime: Date.now(),
        result: finalResult
      };

      return finalResult;
    } catch (error) {
      console.error('CBA Validation Error:', error);
      throw error;
    }
  }

  async analyzeSalaries(tradeDetails, db) {
    const salaryAnalyst = this.agents[AGENT_ROLES.SALARY_ANALYST];
    
    try {
      const teamSituations = await this.getTeamSalarySituations(tradeDetails.teams, db);
      const salaryChanges = this.calculateSalaryChanges(tradeDetails, teamSituations);
      
      salaryAnalyst.state.analysis = {
        teamSituations,
        salaryChanges,
        timestamp: new Date()
      };
      
      return salaryAnalyst.state.analysis;
    } catch (error) {
      console.error('Salary Analysis Error:', error);
      throw error;
    }
  }

  async validateRosterSizes(tradeDetails, db) {
    const rosterValidator = this.agents[AGENT_ROLES.ROSTER_VALIDATOR];
    
    try {
      const results = {
        isValid: true,
        details: {}
      };
      
      for (const team of tradeDetails.teams) {
        const playersOut = tradeDetails.playersOut[team] || [];
        const playersIn = tradeDetails.playersIn[team] || [];
        
        const roster = await db.collection('players')
          .find({ team: team })
          .toArray();
        
        const newRosterSize = roster.length - playersOut.length + playersIn.length;
        
        results.details[team] = {
          currentSize: roster.length,
          playersOut: playersOut.length,
          playersIn: playersIn.length,
          newSize: newRosterSize,
          isValid: newRosterSize >= 0 && newRosterSize <= 15
        };
        
        if (!results.details[team].isValid) {
          results.isValid = false;
        }
      }
      
      rosterValidator.state.validation = results;
      return results;
    } catch (error) {
      console.error('Roster Validation Error:', error);
      throw error;
    }
  }

  async validateCBARules(salaryAnalysis, rosterValidation) {
    const ruleEnforcer = this.agents[AGENT_ROLES.CBA_RULE_ENFORCER];
    
    try {
      const results = {
        isValid: true,
        rules: []
      };
      
      // Validate that we have salary analysis data
      if (!salaryAnalysis.salaryChanges || !salaryAnalysis.teamSituations) {
        throw new Error('Invalid salary analysis data');
      }
      
      for (const [team, change] of Object.entries(salaryAnalysis.salaryChanges)) {
        const situation = salaryAnalysis.teamSituations[team];
        
        if (!situation) {
          console.warn(`No team situation found for ${team}`);
          continue;
        }
        
        const newTotalSalary = change.newTotalSalary;
        
        // Second Apron check
        if (newTotalSalary > CBA_RULES.SECOND_APRON) {
          results.rules.push({
            team,
            rule: 'Second Apron',
            status: 'violated',
            message: 'Team cannot aggregate salaries over Second Apron'
          });
          results.isValid = false;
        }
        
        // First Apron check
        if (newTotalSalary > CBA_RULES.FIRST_APRON) {
          if (change.salaryIn > change.salaryOut) {
            results.rules.push({
              team,
              rule: 'First Apron',
              status: 'violated',
              message: 'Team cannot take back more salary than sent out'
            });
            results.isValid = false;
          }
        }
        
        // Salary matching rules
        if (situation.isOverCap) {
          const maxSalaryIn = change.salaryOut * CBA_RULES.TRADE_MATCHING.OVER_CAP + 100000;
          if (change.salaryIn > maxSalaryIn) {
            results.rules.push({
              team,
              rule: 'Salary Matching',
              status: 'violated',
              message: `Team can only take back ${maxSalaryIn.toLocaleString()} in salary`
            });
            results.isValid = false;
          }
        }
      }
      
      ruleEnforcer.state.validation = results;
      return results;
    } catch (error) {
      console.error('CBA Rule Validation Error:', error);
      throw error;
    }
  }

  aggregateResults(salaryAnalysis, rosterValidation, ruleValidation) {
    const coordinator = this.agents[AGENT_ROLES.COORDINATOR];
    
    const result = {
      isValid: rosterValidation.isValid && ruleValidation.isValid,
      details: {
        salaryAnalysis,
        rosterValidation,
        ruleValidation
      },
      timestamp: new Date(),
      processingTime: Date.now() - coordinator.state.startTime
    };
    
    coordinator.state.result = result;
    return result;
  }

  async getTeamSalarySituations(teams, db) {
    const situations = {};
    
    for (const team of teams) {
      try {
        const roster = await db.collection('players')
          .find({ team: team })
          .toArray();
        
        if (roster.length === 0) {
          console.warn(`No players found for team: ${team}`);
        }
        
        const totalSalary = roster.reduce((sum, player) => 
          sum + (player.salary_2023_2024 || 0), 0);
        
        situations[team] = {
          team,
          totalSalary,
          isOverCap: totalSalary > CBA_RULES.SALARY_CAP,
          isInLuxuryTax: totalSalary > CBA_RULES.LUXURY_TAX,
          isOverFirstApron: totalSalary > CBA_RULES.FIRST_APRON,
          isOverSecondApron: totalSalary > CBA_RULES.SECOND_APRON,
          rosterSize: roster.length,
          players: roster.map(p => ({
            name: p.name,
            salary: p.salary_2023_2024
          }))
        };
      } catch (error) {
        console.error(`Error getting salary situation for team ${team}:`, error);
        throw error;
      }
    }
    
    return situations;
  }

  calculateSalaryChanges(tradeDetails, teamSituations) {
    const changes = {};
    
    for (const team of tradeDetails.teams) {
      const teamSituation = teamSituations[team];
      
      if (!teamSituation) {
        console.warn(`No team situation found for ${team} in salary calculation`);
        continue;
      }
      
      const playersOut = tradeDetails.playersOut[team] || [];
      const playersIn = tradeDetails.playersIn[team] || [];
      
      const salaryOut = playersOut.reduce((sum, player) => 
        sum + (player.salary_2023_2024 || 0), 0);
      
      const salaryIn = playersIn.reduce((sum, player) => 
        sum + (player.salary_2023_2024 || 0), 0);
      
      changes[team] = {
        salaryOut,
        salaryIn,
        netChange: salaryIn - salaryOut,
        newTotalSalary: teamSituation.totalSalary + (salaryIn - salaryOut)
      };
    }
    
    return changes;
  }
}

module.exports = new CBAValidator(); 