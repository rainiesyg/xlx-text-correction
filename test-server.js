const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting server...');
console.log('📦 Node.js version:', process.version);
console.log('🔧 PORT environment variable:', process.env.PORT || 'not set');
console.log('🎯 Will listen on port:', PORT);
console.log('🌐 Process platform:', process.platform);
console.log('💾 Memory usage:', process.memoryUsage());

// 基础中间件
app.use(express.json());

// 添加请求日志中间件
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// 健康检查端点
app.get('/health', (req, res) => {
  console.log('📍 Health check requested');
  const healthData = {
    status: 'ok',
    message: 'Test server is running',
    timestamp: new Date().toISOString(),
    port: PORT,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
      PORT: process.env.PORT || 'not set'
    }
  };
  console.log('📍 Health check response:', JSON.stringify(healthData, null, 2));
  res.status(200).json(healthData);
});

// 根路径
app.get('/', (req, res) => {
  console.log('🌐 Root endpoint requested');
  const rootData = {
    message: 'Zeabur Test Server - Enhanced Debug',
    status: 'running',
    version: '1.1.0',
    endpoints: ['/health', '/debug'],
    port: PORT,
    node_version: process.version,
    env: process.env.NODE_ENV || 'production',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
  console.log('🌐 Root response:', JSON.stringify(rootData, null, 2));
  res.status(200).json(rootData);
});

// 调试端点
app.get('/debug', (req, res) => {
  console.log('🔧 Debug endpoint requested');
  const debugData = {
    environment: process.env,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    platform: process.platform,
    version: process.version,
    pid: process.pid,
    cwd: process.cwd(),
    timestamp: new Date().toISOString()
  };
  console.log('🔧 Debug info collected');
  res.status(200).json(debugData);
});

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`📍 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🌐 Root endpoint: http://0.0.0.0:${PORT}/`);
  console.log(`🔧 Debug endpoint: http://0.0.0.0:${PORT}/debug`);
  console.log(`🔧 Node.js version: ${process.version}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🆔 Process ID: ${process.pid}`);
  console.log(`📂 Working directory: ${process.cwd()}`);
  console.log('🎉 Server started successfully!');
  
  // 测试服务器是否真的在监听
  setTimeout(() => {
    console.log('🔍 Server listening check - Address:', server.address());
  }, 1000);
});

// 错误处理
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else if (error.code === 'EACCES') {
    console.error(`❌ Permission denied for port ${PORT}`);
  }
  console.error('❌ Full error details:', JSON.stringify(error, null, 2));
  process.exit(1);
});

server.on('listening', () => {
  console.log('🎯 Server is now listening!');
  console.log('🎯 Server address:', server.address());
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

// 捕获未处理的异常
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});