const express = require('express');
const app = express();

// 使用Zeabur的PORT环境变量，但有固定默认值
const PORT = process.env.PORT || 3000;

console.log('Starting simple server...');
console.log('PORT from env:', process.env.PORT);
console.log('Using PORT:', PORT);

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
  console.log(`✅ Simple server running on port ${PORT}`);
  console.log(`🌐 Server ready to accept connections`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});