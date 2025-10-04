const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('Starting simple server...');
console.log('PORT:', PORT);

app.get('/', (req, res) => {
  res.json({ 
    message: 'Simple server is working!',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});