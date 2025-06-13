#!/usr/bin/env node

const { spawn } = require('child_process');

// Get environment variables
const port = process.env.PORT || 8765;
const connectionString = process.env.MCP_CONNECTION_STRING;
const database = 'nba-trade-consigliere';

if (!connectionString) {
  console.error('ERROR: MCP_CONNECTION_STRING environment variable is required');
  process.exit(1);
}

console.log(`Starting MongoDB MCP Server on port ${port}`);
console.log(`Database: ${database}`);
console.log(`Connection String: ${connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials

// Start the MongoDB MCP server with proper environment variables
const args = [
  '@mongodb-js/mongodb-mcp-server'
];

console.log('Executing:', 'npx', args.join(' '));

const child = spawn('npx', args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port,
    HOST: '0.0.0.0',
    MDB_MCP_CONNECTION_STRING: connectionString,
    MDB_MCP_DEFAULT_DATABASE: database
  }
});

child.on('error', (error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`MCP server exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  child.kill('SIGINT');
}); 