const express = require('express');
const WebSocket = require('ws');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// REST API
app.get('/api/mint-requests/pending', (req, res) => {
  // Return empty array for pending requests
  res.json([]);
});

app.post('/api/mint-requests', (req, res) => {
  // Simulate creating a mint request
  const requestId = crypto.randomUUID();
  res.json({ requestId, status: 'created' });
});

// Start REST server
const restServer = app.listen(8080, () => {
  console.log('Kuro mock REST server running on port 8080');
});

// WebSocket server on the same port
const wss = new WebSocket.Server({ server: restServer });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to Kuro mock service'
  }));

  // Simulate sending mint events every 30 seconds
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const mintEvent = {
        requestId: crypto.randomUUID(),
        user: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
        amount: '1000000000000000000', // 1 ETH
        fiatRef: `REF-${Date.now()}`,
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(mintEvent));
      console.log('Sent mock mint event:', mintEvent.requestId);
    } else {
      clearInterval(interval);
    }
  }, 30000);

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    clearInterval(interval);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clearInterval(interval);
  });
});

console.log('Kuro mock WebSocket server running on port 8080');

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down Kuro mock service...');
  restServer.close();
  wss.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down Kuro mock service...');
  restServer.close();
  wss.close();
  process.exit(0);
});
