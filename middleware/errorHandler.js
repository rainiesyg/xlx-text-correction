/**
 * 统一错误处理中间件
 */

const { logger } = require('./logger');

// 错误类型枚举
const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR'
};

// 错误代码枚举
const ErrorCodes = {
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  API_CALL_FAILED: 'API_CALL_FAILED',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND'
};

// 自定义错误类
class AppError extends Error {
  constructor(message, type = ErrorTypes.INTERNAL_ERROR, code = ErrorCodes.SERVER_ERROR, statusCode = 500, details = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // 保持堆栈跟踪
    Error.captureStackTrace(this, AppError);
  }
}

// 使用增强的日志系统
class Logger {
  static log(level, message, meta = {}) {
    logger.log(level, message, meta);
  }
  
  static error(message, meta = {}) {
    logger.error(message, meta);
  }
  
  static warn(message, meta = {}) {
    logger.warn(message, meta);
  }
  
  static info(message, meta = {}) {
    logger.info(message, meta);
  }
  
  static debug(message, meta = {}) {
    logger.debug(message, meta);
  }
  
  static getErrorStats() {
    return logger.getErrorStats();
  }
  
  static clearErrorStats() {
    return logger.clearErrorStats();
  }
}

// 错误处理中间件
function errorHandler(err, req, res, next) {
  const timestamp = new Date().toISOString();
  
  // 如果响应已经发送，则交给默认错误处理器
  if (res.headersSent) {
    return next(err);
  }

  let error = err;
  
  // 如果不是自定义错误，则转换为AppError
  if (!(err instanceof AppError)) {
    // 处理常见的错误类型
    if (err.name === 'ValidationError') {
      error = new AppError('输入验证失败', ErrorTypes.VALIDATION_ERROR, err.message);
    } else if (err.code === 'ECONNABORTED') {
      error = new AppError('请求超时', ErrorTypes.NETWORK_ERROR, '网络连接超时，请稍后重试');
    } else if (err.code === 'ENOTFOUND') {
      error = new AppError('网络连接失败', ErrorTypes.NETWORK_ERROR, '无法连接到服务器');
    } else if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        error = new AppError('文件过大', ErrorTypes.FILE_ERROR, '文件大小超过限制');
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        error = new AppError('文件类型不支持', ErrorTypes.FILE_ERROR, '不支持的文件类型');
      } else {
        error = new AppError('文件上传失败', ErrorTypes.FILE_ERROR, err.message);
      }
    } else {
      error = new AppError(
        err.message || '服务器内部错误',
        ErrorTypes.INTERNAL_ERROR,
        process.env.NODE_ENV === 'development' ? err.stack : null
      );
    }
  }

  // 记录错误日志
  Logger.error('Request error occurred', {
    error: {
      message: error.message,
      type: error.type,
      statusCode: error.statusCode,
      stack: error.stack
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    timestamp: error.timestamp
  });

  // 构建错误响应
  const errorResponse = {
    success: false,
    error: {
      message: error.message,
      type: error.type,
      code: error.code,
      status: error.statusCode,
      timestamp: error.timestamp
    }
  };

  // 在开发环境中包含更多调试信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = error.details;
    errorResponse.error.stack = error.stack;
  }

  // 发送错误响应
  res.status(error.statusCode).json(errorResponse);
}

// 404处理中间件
function notFoundHandler(req, res, next) {
  const error = new AppError(
    `路径 ${req.originalUrl} 不存在`,
    ErrorTypes.NOT_FOUND,
    'RESOURCE_NOT_FOUND',
    404
  );
  next(error);
}

// 异步错误包装器
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  ErrorTypes,
  ErrorCodes,
  Logger,
  errorHandler,
  notFoundHandler,
  asyncHandler
};