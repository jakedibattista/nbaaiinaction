const cbaValidator = require('./cba-validator');
require('dotenv').config();

// Test trade scenarios
const testTrades = [
  {
    name: 'Legal 1-for-1 Trade',
    details: {
      teams: ['BOS', 'OKC'],
      playersOut: {
        'BOS': [{ name: 'Jayson Tatum', salary_2023_2024: 32600000 }],
        'OKC': [{ name: 'Shai Gilgeous-Alexander', salary_2023_2024: 33390000 }]
      },
      playersIn: {
        'BOS': [{ name: 'Shai Gilgeous-Alexander', salary_2023_2024: 33390000 }],
        'OKC': [{ name: 'Jayson Tatum', salary_2023_2024: 32600000 }]
      }
    },
    expected: {
      isValid: false,
      reason: 'BOS is over second apron'
    }
  },
  {
    name: 'Illegal Salary Matching',
    details: {
      teams: ['LAL', 'GSW'],
      playersOut: {
        'LAL': [{ name: 'LeBron James', salary_2023_2024: 47600000 }],
        'GSW': [{ name: 'Stephen Curry', salary_2023_2024: 51900000 }]
      },
      playersIn: {
        'LAL': [{ name: 'Stephen Curry', salary_2023_2024: 51900000 }],
        'GSW': [{ name: 'LeBron James', salary_2023_2024: 47600000 }]
      }
    },
    expected: {
      isValid: false,
      reason: 'Salary matching rule violation'
    }
  },
  {
    name: 'Legal Multi-team Trade',
    details: {
      teams: ['OKC', 'SAS', 'ORL'],
      playersOut: {
        'OKC': [{ name: 'Josh Giddey', salary_2023_2024: 6500000 }],
        'SAS': [{ name: 'Devin Vassell', salary_2023_2024: 5000000 }],
        'ORL': [{ name: 'Cole Anthony', salary_2023_2024: 5500000 }]
      },
      playersIn: {
        'OKC': [{ name: 'Cole Anthony', salary_2023_2024: 5500000 }],
        'SAS': [{ name: 'Josh Giddey', salary_2023_2024: 6500000 }],
        'ORL': [{ name: 'Devin Vassell', salary_2023_2024: 5000000 }]
      }
    },
    expected: {
      isValid: true,
      reason: 'All teams under salary cap'
    }
  }
];

async function runTests() {
  console.log('🧪 Starting CBA Validator Agent Tests\n');
  console.log('🔧 Multi-Agent Architecture:');
  console.log('   • Coordinator Agent: Orchestrates validation');
  console.log('   • Salary Analyst Agent: Calculates salary impacts');
  console.log('   • Roster Validator Agent: Validates roster sizes');
  console.log('   • CBA Rule Enforcer Agent: Enforces NBA rules\n');

  let passed = 0;
  let failed = 0;

  for (const test of testTrades) {
    console.log(`\n📋 Testing: ${test.name}`);
    console.log('━'.repeat(50));
    
    try {
      const startTime = Date.now();
      const result = await cbaValidator.validateTrade(test.details);
      const duration = Date.now() - startTime;
      
      // Verify result
      const testPassed = result.isValid === test.expected.isValid;
      
      if (testPassed) {
        passed++;
        console.log(`✅ Test PASSED (${duration}ms)`);
      } else {
        failed++;
        console.log(`❌ Test FAILED (${duration}ms)`);
        console.log(`   Expected: ${test.expected.isValid}, Got: ${result.isValid}`);
      }
      
      // Log agent performance
      console.log('\n🤖 Agent Performance:');
      const agents = cbaValidator.agents;
      console.log(`   Coordinator: ${JSON.stringify(agents.coordinator.state.result?.processingTime || 'N/A')}ms`);
      console.log(`   Salary Analyst: Active`);
      console.log(`   Roster Validator: ${agents.roster_validator.state.validation?.isValid ? 'Valid' : 'Invalid'}`);
      console.log(`   CBA Rule Enforcer: ${agents.cba_rule_enforcer.state.validation?.rules?.length || 0} rules checked`);
      
      if (!result.isValid && result.details.ruleValidation.rules.length > 0) {
        console.log('\n⚠️  CBA Violations:');
        result.details.ruleValidation.rules.forEach(rule => {
          console.log(`   • ${rule.team}: ${rule.message}`);
        });
      }
      
    } catch (error) {
      failed++;
      console.error(`❌ Test Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Test Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Agent system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
  }
}

// Only run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testTrades }; 