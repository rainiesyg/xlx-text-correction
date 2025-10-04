const express = require('express');
const app = express();
const PORT = 3000;

console.log('Starting simple server...');
console.log('Fixed PORT:', PORT);

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

app.listen(PORT, () => {
  console.log(`Server running on fixed port ${PORT}`);
  console.log('No dynamic port binding - using port 3000 only');
});