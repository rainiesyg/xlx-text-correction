/**
 * 日志管理路由
 * 提供日志查看和错误统计功能
 */

const express = require('express');
const { logger } = require('../middleware/logger');
const { Logger } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// 获取错误统计信息
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = Logger.getErrorStats();
  
  res.json({
    success: true,
    data: {
      ...stats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  });
}));

// 获取日志文件列表
router.get('/files', asyncHandler(async (req, res) => {
  const files = logger.getLogFiles();
  
  res.json({
    success: true,
    data: files
  });
}));

// 读取指定日志文件内容
router.get('/files/:filename', asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const { lines = 100 } = req.query;
  
  // 验证文件名安全性
  if (!/^[\w\-\.]+\.log$/.test(filename)) {
    return res.status(400).json({
      success: false,
      error: '无效的文件名'
    });
  }
  
  try {
    const logs = logger.readLogFile(filename, parseInt(lines));
    
    res.json({
      success: true,
      data: {
        filename,
        lines: logs.length,
        logs
      }
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
}));

// 清除错误统计
router.delete('/stats', asyncHandler(async (req, res) => {
  Logger.clearErrorStats();
  
  res.json({
    success: true,
    message: '错误统计已清除'
  });
}));

// 获取实时日志（WebSocket或Server-Sent Events可以在这里扩展）
router.get('/realtime', asyncHandler(async (req, res) => {
  // 设置Server-Sent Events头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // 发送初始连接消息
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  // 保持连接活跃
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);

  // 客户端断开连接时清理
  req.on('close', () => {
    clearInterval(heartbeat);
  });
}));

module.exports = router;