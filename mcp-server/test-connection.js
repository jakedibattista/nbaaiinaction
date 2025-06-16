const fetch = require('node-fetch');

async function testMCP() {
    try {
        // Test initialization
        console.log('Testing MCP initialization...');
        const initResponse = await fetch('http://localhost:8765/mcp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'initialize',
                params: {}
            })
        });
        const initData = await initResponse.json();
        console.log('✅ Initialization response:', initData);

        // Test player query
        console.log('\nTesting player query...');
        const queryResponse = await fetch('http://localhost:8765/mcp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'tools/execute',
                params: {
                    name: 'query',
                    parameters: {
                        type: 'player',
                        query: 'LeBron'
                    }
                }
            })
        });
        const queryData = await queryResponse.json();
        console.log('✅ Query response:', queryData);

        // Test health endpoint
        console.log('\nTesting health endpoint...');
        const healthResponse = await fetch('http://localhost:8765/health');
        const healthData = await healthResponse.json();
        console.log('✅ Health check response:', healthData);

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testMCP(); 