// 最简化的测试服务器 - 用于验证Zeabur部署环境
const http = require('http');

// 获取端口 - Zeabur会自动设置PORT环境变量
const PORT = process.env.PORT || 3000;

// 创建最简单的HTTP服务器
const server = http.createServer((req, res) => {
  console.log(`📥 收到请求: ${req.method} ${req.url}`);
  
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // 健康检查端点
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Test server is running',
      timestamp: new Date().toISOString(),
      port: PORT,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        PORT: process.env.PORT || 'not set'
      }
    }));
    return;
  }
  
  // 根路径
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Zeabur Test Server',
      status: 'running',
      endpoints: ['/health', '/api/health'],
      port: PORT
    }));
    return;
  }
  
  // 404处理
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// 启动服务器
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test server running on port: ${PORT}`);
  console.log(`📦 Node.js version: ${process.version}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔧 PORT env var: ${process.env.PORT || 'not set'}`);
  console.log(`✅ Server started successfully!`);
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