const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting server...');
console.log('📦 Node.js version:', process.version);
console.log('🔧 PORT environment variable:', process.env.PORT || 'not set');
console.log('🎯 Will listen on port:', PORT);

// 基础中间件
app.use(express.json());

// 健康检查端点
app.get('/health', (req, res) => {
  console.log('📍 Health check requested');
  res.status(200).json({
    status: 'ok',
    message: 'Test server is running',
    timestamp: new Date().toISOString(),
    port: PORT,
    uptime: process.uptime()
  });
});

// 根路径
app.get('/', (req, res) => {
  console.log('🌐 Root endpoint requested');
  res.status(200).json({
    message: 'Zeabur Test Server - Simplified',
    status: 'running',
    version: '1.0.0',
    endpoints: ['/health'],
    port: PORT,
    node_version: process.version,
    env: process.env.NODE_ENV || 'production',
    uptime: process.uptime()
  });
});

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Root endpoint: http://localhost:${PORT}/`);
  console.log(`🔧 Node.js version: ${process.version}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log('🎉 Server started successfully!');
});

// 错误处理
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});