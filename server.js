const express = require('express');
const multer = require('multer');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// 导入错误处理和验证中间件
const { 
  AppError, 
  ErrorTypes, 
  Logger, 
  errorHandler, 
  notFoundHandler, 
  asyncHandler 
} = require('./middleware/errorHandler');
const { 
  validateTextCorrection, 
  validateFileUpload, 
  sanitizeInput 
} = require('./middleware/validator');
const logsRouter = require('./routes/logs');

const app = express();
const PORT = process.env.PORT || 3003;

// 科大讯飞API配置
const XUNFEI_CONFIG = {
  APPID: process.env.IFLYTEK_APPID,
  APISecret: process.env.IFLYTEK_API_SECRET,
  APIKey: process.env.IFLYTEK_API_KEY,
  HOST: 'api.xf-yun.com',
  URI: '/v1/private/s9a87e3ec'
};

// 启动前强校验：必须提供讯飞API密钥环境变量
(() => {
  const requiredEnv = ['IFLYTEK_APPID', 'IFLYTEK_API_SECRET', 'IFLYTEK_API_KEY'];
  const missing = requiredEnv.filter(k => !process.env[k] || String(process.env[k]).trim() === '');
  if (missing.length > 0) {
    console.error('❌ 缺少必要环境变量：' + missing.join(', '));
    console.error('请通过环境变量提供 IFLYTEK_APPID / IFLYTEK_API_SECRET / IFLYTEK_API_KEY 后再启动。');
    process.exit(1);
  }
})();

// 直接使用APISecret（不需要Base64解码）
function getAPISecret() {
  return XUNFEI_CONFIG.APISecret;
}

// 生成RFC1123格式的时间戳
function getRFC1123Time() {
  return new Date().toUTCString();
}

// 生成Authorization头（按照官方文档格式）
function generateAuthHeader(method, uri, host, date) {
  // 1. 构建signature原始字段
  const signatureOrigin = `host: ${host}\ndate: ${date}\n${method} ${uri} HTTP/1.1`;
  
  // 2. 使用HMAC-SHA256算法和APISecret对signature_origin签名
  const signatureSha = crypto.createHmac('sha256', getAPISecret()).update(signatureOrigin).digest('base64');
  
  // 3. 构建authorization_origin字符串
  const authorizationOrigin = `api_key="${XUNFEI_CONFIG.APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;
  
  // 4. 对authorization_origin进行base64编码
  const authorization = Buffer.from(authorizationOrigin).toString('base64');
  
  return authorization;
}

// 请求日志中间件（附加 traceId/requestId）
app.use((req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  const traceId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  req.traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);
  
  console.log(`\n[${timestamp}] 📥 ${req.method} ${req.url} traceId=${traceId}`);
  console.log(`[${timestamp}] 🌐 客户端IP: ${req.ip || req.connection.remoteAddress}`);
  console.log(`[${timestamp}] 📋 User-Agent: ${req.get('User-Agent') || 'Unknown'}`);
  
  if (req.method === 'POST' && req.url.includes('/api/')) {
    const lvl = (process.env.LOG_LEVEL || 'INFO').toUpperCase();
    if (lvl === 'DEBUG') {
      console.log(`[${timestamp}] 📦 请求头:`, JSON.stringify(req.headers, null, 2));
    }
  }
  
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const responseTimestamp = new Date().toISOString();
    
    console.log(`[${responseTimestamp}] 📤 响应状态: ${res.statusCode} traceId=${traceId}`);
    console.log(`[${responseTimestamp}] ⏱️  处理时间: ${duration}ms`);
    
    if (res.statusCode >= 400) {
      console.log(`[${responseTimestamp}] ❌ 错误响应:`, data);
    } else {
      console.log(`[${responseTimestamp}] ✅ 响应成功`);
    }
    
    console.log(`[${responseTimestamp}] ${'='.repeat(60)}`);
    
    originalSend.call(this, data);
  };
  
  next();
});

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// 处理浏览器自动请求的站点图标，避免 404 噪音
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 日志管理路由
app.use('/api/logs', logsRouter);

// 文件上传配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.doc', '.docx', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// 生成科大讯飞API签名（新版本）
function generateXunfeiAuth() {
  const date = getRFC1123Time();
  const authorization = generateAuthHeader('POST', XUNFEI_CONFIG.URI, XUNFEI_CONFIG.HOST, date);
  
  return {
    date,
    authorization
  };
}

// 调用科大讯飞文本纠错API
async function correctText(text, traceId) {
  const timestamp = new Date().toISOString();
  
  try {
    Logger.debug('开始构建科大讯飞API请求', {
      textLength: text.length
    });
    
    // 生成认证信息
    const { date, authorization } = generateXunfeiAuth();
    Logger.debug('生成认证信息完成', { date });
    
    // 按照官方文档要求，构建请求体JSON格式
    const textBase64 = Buffer.from(text, 'utf8').toString('base64');
    Logger.debug('文本Base64编码完成', { encodedLength: textBase64.length });
    
    const requestBody = {
      "header": {
        "app_id": XUNFEI_CONFIG.APPID,
        "uid": "user_001",
        "status": 3
      },
      "parameter": {
        "s9a87e3ec": {
          "result": {
            "encoding": "utf8",
            "compress": "raw",
            "format": "json"
          }
        }
      },
      "payload": {
        "input": {
          "encoding": "utf8",
          "compress": "raw",
          "format": "json",
          "status": 3,
          "text": textBase64
        }
      }
    };

    // 构建完整的URL，包含认证参数（按照官方文档格式）
    const url = `https://${XUNFEI_CONFIG.HOST}${XUNFEI_CONFIG.URI}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${XUNFEI_CONFIG.HOST}`;
    
    Logger.debug('发送API请求', { 
      host: XUNFEI_CONFIG.HOST,
      uri: XUNFEI_CONFIG.URI,
      appId: XUNFEI_CONFIG.APPID,
      traceId: traceId
    });
    
    const startTime = Date.now();
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
    
    const apiDuration = Date.now() - startTime;
    Logger.info('API响应接收完成', {
      duration: apiDuration,
      status: response.status,
      statusText: response.statusText
    });

    if (response.data) {
      Logger.debug('响应数据结构检查', {
        hasHeader: !!response.data.header,
        hasPayload: !!response.data.payload,
        headerCode: response.data.header?.code,
        headerMessage: response.data.header?.message
      });
      
      // 如果有错误码，返回错误信息
      if (response.data.header && response.data.header.code && response.data.header.code !== 0) {
        const errorMessage = `API错误 ${response.data.header.code}: ${response.data.header.message || '未知错误'}`;
        Logger.error('科大讯飞API返回错误', {
          code: response.data.header.code,
          message: response.data.header.message
        });
        
        throw new AppError(errorMessage, ErrorTypes.API_ERROR, {
          code: response.data.header.code,
          message: response.data.header.message
        });
      }
      
      // 对返回的text字段进行base64解码
      if (response.data.payload && response.data.payload.result && response.data.payload.result.text) {
        try {
          const decodedText = Buffer.from(response.data.payload.result.text, 'base64').toString('utf8');
          response.data.payload.result.text = decodedText;
          Logger.debug('响应文本Base64解码完成', { decodedLength: decodedText.length });
        } catch (decodeError) {
          Logger.error('Base64解码失败', { error: decodeError.message });
          throw new AppError('响应数据解码失败', ErrorTypes.API_ERROR, decodeError.message);
        }
      }
      
      Logger.info('科大讯飞API调用成功');
      return response.data;
    }
    
    Logger.error('API响应数据为空');
    throw new AppError('纠错服务暂时不可用', ErrorTypes.API_ERROR);
  } catch (error) {
    // 如果已经是AppError，直接抛出
    if (error instanceof AppError) {
      throw error;
    }
    
    Logger.error('科大讯飞API调用异常', {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null
    });
    
    if (error.response) {
      throw new AppError(
        `API调用失败 ${error.response.status}: ${error.response.statusText}`,
        ErrorTypes.API_ERROR,
        error.response.data
      );
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new AppError('请求超时，请稍后重试', ErrorTypes.NETWORK_ERROR);
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new AppError('网络连接失败', ErrorTypes.NETWORK_ERROR, error.message);
    }
    
    throw new AppError('网络连接失败: ' + error.message, ErrorTypes.NETWORK_ERROR);
  }
}

// 从文件中提取文本
async function extractTextFromFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  
  try {
    switch (ext) {
      case '.txt':
        return fs.readFileSync(filePath, 'utf8');
      
      case '.doc':
      case '.docx':
        const docResult = await mammoth.extractRawText({ path: filePath });
        return docResult.value;
      
      case '.pdf':
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfResult = await pdfParse(pdfBuffer);
        return pdfResult.text;
      
      default:
        throw new Error('不支持的文件格式');
    }
  } catch (error) {
    throw new Error('文件解析失败: ' + error.message);
  }
}

// API路由

// 文本纠错接口
// 文本纠错接口
app.post('/api/correct-text', validateTextCorrection, asyncHandler(async (req, res) => {
  const timestamp = new Date().toISOString();
  
  Logger.info('开始文本纠错', {
    textLength: req.validatedData.text ? req.validatedData.text.length : 0,
    ip: req.ip
  });
  
  const text = sanitizeInput(req.validatedData.text);
  
  Logger.debug('调用科大讯飞API', { textPreview: text.substring(0, 100) });
  const result = await correctText(text, req.traceId);
  
  if (result.error) {
    throw new AppError(result.error, ErrorTypes.API_ERROR, result.details);
  }
  
  Logger.info('文本纠错完成', { 
    resultSize: JSON.stringify(result).length 
  });
  
  res.json({ success: true, result });
}));

// 文件上传和纠错接口
app.post('/api/correct-file', upload.single('file'), validateFileUpload, asyncHandler(async (req, res) => {
  const timestamp = new Date().toISOString();
  
  Logger.info('开始文件纠错', {
    fileName: req.file.originalname,
    fileSize: req.file.size,
    fileType: req.file.mimetype,
    ip: req.ip
  });
  
  let text;
  try {
    Logger.debug('开始提取文件文本');
    text = await extractTextFromFile(req.file.path, req.file.originalname);
    
    Logger.debug('文件文本提取完成', {
      textLength: text.length,
      textPreview: text.substring(0, 100)
    });
    
    if (text.length > 2000) {
      throw new AppError(
        '文件内容过长，请确保文本不超过2000字符',
        ErrorTypes.VALIDATION_ERROR
      );
    }
    
    const sanitizedText = sanitizeInput(text);
    const result = await correctText(sanitizedText, req.traceId);
    
    if (result.error) {
      throw new AppError(result.error, ErrorTypes.API_ERROR, result.details);
    }
    
    Logger.info('文件纠错完成', {
      resultSize: JSON.stringify(result).length
    });
    
    res.json({ 
      success: true, 
      originalText: text,
      result 
    });
  } catch (error) {
    // 确保清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      Logger.debug('清理临时文件', { filePath: req.file.path });
      fs.unlinkSync(req.file.path);
    }
    throw error;
  } finally {
    // 清理上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      Logger.debug('清理上传文件', { filePath: req.file.path });
      fs.unlinkSync(req.file.path);
    }
  }
}));

// 健康检查接口
app.get('/api/health', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 💓 健康检查请求`);
  
  const healthData = { 
    status: 'ok', 
    message: '心连心文本纠错小程序运行正常',
    timestamp: timestamp,
    port: PORT,
    uptime: process.uptime()
  };
  console.log(`[${timestamp}] ✅ 健康检查响应:`, healthData);
  
  res.json(healthData);
});

// 根路径健康检查
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '心连心文本纠错服务',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/api/health',
            status: '/api/status',
            correct_text: '/api/correct-text',
            correct_file: '/api/correct-file'
        }
    });
});

// API状态端点
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        message: '文本纠错服务运行正常',
        features: {
            text_correction: true,
            file_upload: true,
            supported_formats: ['.txt', '.doc', '.docx', '.pdf']
        }
    });
});



// 添加错误处理中间件
app.use(errorHandler);

// 404处理
app.use(notFoundHandler);

// 启动服务器 - 确保监听所有网络接口
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 服务器运行在端口: ${PORT}`);
    console.log(`📦 Node.js版本: ${process.version}`);
    console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 内存使用: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    console.log('📁 支持的文件格式: .txt, .doc, .docx, .pdf');
    console.log(`🔗 健康检查: /api/health`);
    console.log(`📊 状态检查: /api/status`);
    console.log('✅ 服务器启动成功！监听所有网络接口');
    
    // 输出重要的环境信息用于调试
    console.log('🔧 调试信息:');
    console.log(`   - PORT环境变量: ${process.env.PORT || '未设置'}`);
    console.log(`   - 实际监听端口: ${PORT}`);
    console.log(`   - 监听地址: 0.0.0.0`);
});

// 优雅关闭处理
process.on('SIGTERM', () => {
    console.log('📴 收到SIGTERM信号，正在优雅关闭服务器...');
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 收到SIGINT信号，正在优雅关闭服务器...');
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});

// 错误处理 - 添加更详细的错误日志
// 全局进程错误处理
process.on('uncaughtException', (error) => {
  Logger.error('未捕获的异常', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('未处理的Promise拒绝', {
    reason: reason,
    promise: promise
  });
  process.exit(1);
});

// 监听服务器错误
server.on('error', (error) => {
  Logger.error('服务器错误', {
    error: error.message,
    code: error.code
  });
  
  if (error.code === 'EADDRINUSE') {
    Logger.error(`端口 ${PORT} 已被占用`);
  }
});

// 添加启动超时检测
setTimeout(() => {
  console.log('⏰ 服务器启动超时检测 - 如果看到此消息说明服务器已运行超过5秒');
}, 5000);