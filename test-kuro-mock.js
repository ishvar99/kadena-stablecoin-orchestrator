const WebSocket = require('ws');

// Test Kuro mock service
const ws = new WebSocket('ws://localhost:8080/events');

ws.on('open', () => {
  console.log('Connected to Kuro mock service');
});

ws.on('message', (data) => {
  try {
    const event = JSON.parse(data.toString());
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    if (event.userAddress) {
      console.log('KYCApproved event received:');
      console.log('- User:', event.userAddress);
      console.log('- Token Name:', event.tokenName);
      console.log('- Token Symbol:', event.tokenSymbol);
      console.log('- Timestamp:', new Date(event.timestamp));
      console.log('- Block Number:', event.blockNumber);
      console.log('- Transaction Hash:', event.transactionHash);
    }
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

ws.on('close', () => {
  console.log('Connection closed');
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Keep the script running
setTimeout(() => {
  console.log('Test completed');
  ws.close();
  process.exit(0);
}, 120000); // Run for 2 minutes
