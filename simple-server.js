const express = require('express');
const app = express();

// 使用Zeabur的PORT环境变量，但有固定默认值
const PORT = process.env.PORT || 3000;

console.log('Starting simple server...');
console.log('PORT from env:', process.env.PORT);
console.log('Using PORT:', PORT);

// 添加中间件处理JSON和URL编码
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 添加请求日志中间件
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  const response = {
    message: 'Simple server is working!',
    port: PORT,
    timestamp: new Date().toISOString(),
    status: 'healthy'
  };
  console.log('📤 Sending response:', response);
  res.json(response);
});

app.get('/health', (req, res) => {
  const healthResponse = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    port: PORT,
    memory: process.memoryUsage()
  };
  console.log('🏥 Health check response:', healthResponse);
  res.json(healthResponse);
});

// 添加通用错误处理
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// 添加404处理
app.use((req, res) => {
  console.log('❓ 404 Not Found:', req.url);
  res.status(404).json({ error: 'Not Found', path: req.url });
});

app.listen(PORT, () => {
  console.log(`✅ Simple server running on port ${PORT}`);
  console.log(`🌐 Server ready to accept connections`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Available endpoints:`);
  console.log(`   GET / - Main endpoint`);
  console.log(`   GET /health - Health check`);
});