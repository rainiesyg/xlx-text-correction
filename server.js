const express = require('express');
const multer = require('multer');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 科大讯飞API配置
const XUNFEI_CONFIG = {
  APPID: 'a4fe0d69',
  APISecret: 'NzVmMjAyOTg3ODUxNGU5MjdjZWE2NmY4',
  APIKey: '3dc6961e01940585f3a7bb55dcef9b34',
  HOST: 'api.xf-yun.com',
  URI: '/v1/private/s9a87e3ec'
};

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

// 请求日志中间件
app.use((req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`\n[${timestamp}] 📥 ${req.method} ${req.url}`);
  console.log(`[${timestamp}] 🌐 客户端IP: ${req.ip || req.connection.remoteAddress}`);
  console.log(`[${timestamp}] 📋 User-Agent: ${req.get('User-Agent') || 'Unknown'}`);
  
  if (req.method === 'POST' && req.url.includes('/api/')) {
    console.log(`[${timestamp}] 📦 请求头:`, JSON.stringify(req.headers, null, 2));
  }
  
  // 记录响应
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const responseTimestamp = new Date().toISOString();
    
    console.log(`[${responseTimestamp}] 📤 响应状态: ${res.statusCode}`);
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
async function correctText(text) {
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[${timestamp}] 🔧 开始构建科大讯飞API请求`);
    console.log(`[${timestamp}] 📝 输入文本长度: ${text.length} 字符`);
    
    // 生成认证信息
    const { date, authorization } = generateXunfeiAuth();
    console.log(`[${timestamp}] 🔐 生成认证信息完成`);
    console.log(`[${timestamp}] 📅 请求时间: ${date}`);
    
    // 按照官方文档要求，构建请求体JSON格式
    const textBase64 = Buffer.from(text, 'utf8').toString('base64');
    console.log(`[${timestamp}] 🔄 文本Base64编码完成，长度: ${textBase64.length}`);
    
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
    
    console.log(`[${timestamp}] 📦 请求体构建完成`);
    console.log(`[${timestamp}] 🏷️  APP_ID: ${XUNFEI_CONFIG.APPID}`);

    // 构建完整的URL，包含认证参数（按照官方文档格式）
    const url = `https://${XUNFEI_CONFIG.HOST}${XUNFEI_CONFIG.URI}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${XUNFEI_CONFIG.HOST}`;
    
    console.log(`[${timestamp}] 🌐 请求URL: ${XUNFEI_CONFIG.HOST}${XUNFEI_CONFIG.URI}`);
    console.log(`[${timestamp}] 🚀 发送API请求...`);
    
    const startTime = Date.now();
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
    
    const apiDuration = Date.now() - startTime;
    console.log(`[${timestamp}] ⏱️  API响应时间: ${apiDuration}ms`);
    console.log(`[${timestamp}] 📊 响应状态: ${response.status} ${response.statusText}`);
    console.log(`[${timestamp}] 📋 响应头:`, JSON.stringify(response.headers, null, 2));

    if (response.data) {
      console.log(`[${timestamp}] 📄 响应数据结构:`, {
        hasHeader: !!response.data.header,
        hasPayload: !!response.data.payload,
        headerCode: response.data.header?.code,
        headerMessage: response.data.header?.message
      });
      
      // 如果有错误码，返回错误信息
      if (response.data.header && response.data.header.code && response.data.header.code !== 0) {
        console.log(`[${timestamp}] ❌ API返回错误码: ${response.data.header.code}`);
        console.log(`[${timestamp}] ❌ 错误信息: ${response.data.header.message}`);
        return { 
          error: `API错误 ${response.data.header.code}: ${response.data.header.message || '未知错误'}`,
          code: response.data.header.code
        };
      }
      
      // 对返回的text字段进行base64解码
      if (response.data.payload && response.data.payload.result && response.data.payload.result.text) {
        try {
          const decodedText = Buffer.from(response.data.payload.result.text, 'base64').toString('utf8');
          response.data.payload.result.text = decodedText;
          console.log(`[${timestamp}] 🔄 响应文本Base64解码完成，长度: ${decodedText.length}`);
        } catch (decodeError) {
          console.log(`[${timestamp}] ❌ Base64解码失败:`, decodeError.message);
        }
      }
      
      console.log(`[${timestamp}] ✅ 科大讯飞API调用成功`);
      return response.data;
    }
    
    console.log(`[${timestamp}] ❌ API响应数据为空`);
    return { error: '纠错服务暂时不可用' };
  } catch (error) {
    console.log(`[${timestamp}] 💥 科大讯飞API调用异常:`, error.message);
    
    if (error.response) {
      console.log(`[${timestamp}] 📊 错误响应状态: ${error.response.status}`);
      console.log(`[${timestamp}] 📄 错误响应数据:`, error.response.data);
      console.log(`[${timestamp}] 📋 错误响应头:`, error.response.headers);
      return { 
        error: `API调用失败 ${error.response.status}: ${error.response.statusText}`,
        details: error.response.data
      };
    }
    
    if (error.code === 'ECONNABORTED') {
      console.log(`[${timestamp}] ⏰ 请求超时`);
      return { error: '请求超时，请稍后重试' };
    }
    
    console.log(`[${timestamp}] 🌐 网络连接错误:`, error.code);
    return { error: '网络连接失败: ' + error.message };
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
app.post('/api/correct-text', async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    const { text } = req.body;
    
    console.log(`[${timestamp}] 🔤 开始文本纠错`);
    console.log(`[${timestamp}] 📝 文本长度: ${text ? text.length : 0} 字符`);
    console.log(`[${timestamp}] 📄 文本预览: ${text ? text.substring(0, 100) + (text.length > 100 ? '...' : '') : 'null'}`);
    
    if (!text || text.trim().length === 0) {
      console.log(`[${timestamp}] ❌ 验证失败: 文本为空`);
      return res.status(400).json({ error: '请输入要纠错的文本' });
    }
    
    if (text.length > 2000) {
      console.log(`[${timestamp}] ❌ 验证失败: 文本过长 (${text.length} > 2000)`);
      return res.status(400).json({ error: '文本长度不能超过2000字符' });
    }
    
    console.log(`[${timestamp}] 🚀 调用科大讯飞API...`);
    const result = await correctText(text);
    
    if (result.error) {
      console.log(`[${timestamp}] ❌ API调用失败:`, result.error);
      return res.status(500).json({ error: result.error });
    }
    
    console.log(`[${timestamp}] ✅ 文本纠错完成`);
    console.log(`[${timestamp}] 📊 返回数据大小: ${JSON.stringify(result).length} 字符`);
    
    res.json({ success: true, result });
  } catch (error) {
    console.log(`[${timestamp}] 💥 服务器异常:`, error.message);
    console.log(`[${timestamp}] 📚 错误堆栈:`, error.stack);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 文件上传和纠错接口
app.post('/api/correct-file', upload.single('file'), async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[${timestamp}] 📁 开始文件纠错`);
    
    if (!req.file) {
      console.log(`[${timestamp}] ❌ 验证失败: 未上传文件`);
      return res.status(400).json({ error: '请选择要上传的文件' });
    }
    
    console.log(`[${timestamp}] 📋 文件信息:`);
    console.log(`[${timestamp}]   - 文件名: ${req.file.originalname}`);
    console.log(`[${timestamp}]   - 文件大小: ${req.file.size} 字节`);
    console.log(`[${timestamp}]   - 文件类型: ${req.file.mimetype}`);
    console.log(`[${timestamp}]   - 保存路径: ${req.file.path}`);
    
    console.log(`[${timestamp}] 🔍 开始提取文件文本...`);
    const text = await extractTextFromFile(req.file.path, req.file.originalname);
    
    console.log(`[${timestamp}] 📝 提取的文本长度: ${text.length} 字符`);
    console.log(`[${timestamp}] 📄 文本预览: ${text.substring(0, 100) + (text.length > 100 ? '...' : '')}`);
    
    if (text.length > 2000) {
      console.log(`[${timestamp}] ❌ 验证失败: 文件内容过长 (${text.length} > 2000)`);
      console.log(`[${timestamp}] 📄 文件纠错失败`);
      return res.status(400).json({ error: '文件内容过长，请确保文本不超过2000字符' });
    }
    
    console.log(`[${timestamp}] 🚀 调用科大讯飞API进行文件纠错...`);
    const result = await correctText(text);
    
    // 清理上传的文件
    console.log(`[${timestamp}] 🗑️  清理临时文件: ${req.file.path}`);
    fs.unlinkSync(req.file.path);
    
    if (result.error) {
      console.log(`[${timestamp}] ❌ API调用失败:`, result.error);
      return res.status(500).json({ error: result.error });
    }
    
    console.log(`[${timestamp}] ✅ 文件纠错完成`);
    console.log(`[${timestamp}] 📊 返回数据大小: ${JSON.stringify(result).length} 字符`);
    
    res.json({ 
      success: true, 
      originalText: text,
      result 
    });
  } catch (error) {
    console.log(`[${timestamp}] 💥 文件处理异常:`, error.message);
    console.log(`[${timestamp}] 📚 错误堆栈:`, error.stack);
    
    // 清理上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      console.log(`[${timestamp}] 🗑️  清理异常文件: ${req.file.path}`);
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message || '文件处理失败' });
  }
});

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
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  console.error('❌ 错误堆栈:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  console.error('❌ Promise:', promise);
  process.exit(1);
});

// 监听服务器错误
server.on('error', (error) => {
  console.error('❌ 服务器错误:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ 端口 ${PORT} 已被占用`);
  }
});

// 添加启动超时检测
setTimeout(() => {
  console.log('⏰ 服务器启动超时检测 - 如果看到此消息说明服务器已运行超过5秒');
}, 5000);