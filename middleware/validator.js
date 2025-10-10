/**
 * 输入验证中间件
 * 提供统一的参数验证和数据清理功能
 */

const { AppError, ErrorTypes } = require('./errorHandler');

// 验证规则
const ValidationRules = {
  // 文本验证
  text: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 2000,
    trim: true
  },
  
  // 文件验证
  file: {
    required: true,
    allowedTypes: ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 10 * 1024 * 1024 // 10MB
  }
};

// 验证器类
class Validator {
  /**
   * 验证字符串
   */
  static validateString(value, rules = {}) {
    const {
      required = false,
      minLength = 0,
      maxLength = Infinity,
      pattern = null,
      trim = false
    } = rules;

    // 处理空值
    if (value === null || value === undefined) {
      if (required) {
        throw new AppError('必填字段不能为空', ErrorTypes.VALIDATION_ERROR);
      }
      return null;
    }

    // 类型检查
    if (typeof value !== 'string') {
      throw new AppError('字段必须是字符串类型', ErrorTypes.VALIDATION_ERROR);
    }

    // 去除空格
    let processedValue = trim ? value.trim() : value;

    // 检查是否为空（在trim后）
    if (required && processedValue.length === 0) {
      throw new AppError('必填字段不能为空', ErrorTypes.VALIDATION_ERROR);
    }

    // 长度检查
    if (processedValue.length < minLength) {
      throw new AppError(`字段长度不能少于${minLength}个字符`, ErrorTypes.VALIDATION_ERROR);
    }

    if (processedValue.length > maxLength) {
      throw new AppError(`字段长度不能超过${maxLength}个字符`, ErrorTypes.VALIDATION_ERROR);
    }

    // 正则表达式验证
    if (pattern && !pattern.test(processedValue)) {
      throw new AppError('字段格式不正确', ErrorTypes.VALIDATION_ERROR);
    }

    return processedValue;
  }

  /**
   * 验证文件
   */
  static validateFile(file, rules = {}) {
    const {
      required = false,
      allowedTypes = [],
      maxSize = Infinity,
      minSize = 0
    } = rules;

    // 检查文件是否存在
    if (!file) {
      if (required) {
        throw new AppError('请选择要上传的文件', ErrorTypes.VALIDATION_ERROR);
      }
      return null;
    }

    // 检查文件类型
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      throw new AppError(
        `不支持的文件类型，仅支持: ${allowedTypes.join(', ')}`,
        ErrorTypes.FILE_ERROR
      );
    }

    // 检查文件大小
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      throw new AppError(
        `文件大小不能超过${maxSizeMB}MB`,
        ErrorTypes.FILE_ERROR
      );
    }

    if (file.size < minSize) {
      throw new AppError('文件不能为空', ErrorTypes.FILE_ERROR);
    }

    return file;
  }

  /**
   * 验证请求体
   */
  static validateBody(body, schema) {
    const validatedData = {};
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      try {
        const value = body[field];
        
        if (rules.type === 'string') {
          validatedData[field] = this.validateString(value, rules);
        } else if (rules.type === 'number') {
          validatedData[field] = this.validateNumber(value, rules);
        } else if (rules.type === 'boolean') {
          validatedData[field] = this.validateBoolean(value, rules);
        }
      } catch (error) {
        errors.push(`${field}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      throw new AppError(
        '输入验证失败',
        ErrorTypes.VALIDATION_ERROR,
        errors
      );
    }

    return validatedData;
  }

  /**
   * 验证数字
   */
  static validateNumber(value, rules = {}) {
    const {
      required = false,
      min = -Infinity,
      max = Infinity,
      integer = false
    } = rules;

    if (value === null || value === undefined) {
      if (required) {
        throw new AppError('必填字段不能为空', ErrorTypes.VALIDATION_ERROR);
      }
      return null;
    }

    const numValue = Number(value);
    
    if (isNaN(numValue)) {
      throw new AppError('字段必须是数字类型', ErrorTypes.VALIDATION_ERROR);
    }

    if (integer && !Number.isInteger(numValue)) {
      throw new AppError('字段必须是整数', ErrorTypes.VALIDATION_ERROR);
    }

    if (numValue < min) {
      throw new AppError(`数值不能小于${min}`, ErrorTypes.VALIDATION_ERROR);
    }

    if (numValue > max) {
      throw new AppError(`数值不能大于${max}`, ErrorTypes.VALIDATION_ERROR);
    }

    return numValue;
  }

  /**
   * 验证布尔值
   */
  static validateBoolean(value, rules = {}) {
    const { required = false } = rules;

    if (value === null || value === undefined) {
      if (required) {
        throw new AppError('必填字段不能为空', ErrorTypes.VALIDATION_ERROR);
      }
      return null;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true' || lowerValue === '1') {
        return true;
      }
      if (lowerValue === 'false' || lowerValue === '0') {
        return false;
      }
    }

    throw new AppError('字段必须是布尔类型', ErrorTypes.VALIDATION_ERROR);
  }
}

// 验证中间件工厂函数
function createValidator(schema) {
  return (req, res, next) => {
    try {
      req.validatedData = Validator.validateBody(req.body, schema);
      next();
    } catch (error) {
      next(error);
    }
  };
}

// 文本纠错验证中间件
const validateTextCorrection = createValidator({
  text: ValidationRules.text
});

// 文件上传验证中间件
function validateFileUpload(req, res, next) {
  try {
    Validator.validateFile(req.file, ValidationRules.file);
    next();
  } catch (error) {
    next(error);
  }
}

// 数据清理函数
function sanitizeInput(input) {
  if (typeof input === 'string') {
    // 移除潜在的恶意字符
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除script标签
      .replace(/javascript:/gi, '') // 移除javascript协议
      .replace(/on\w+\s*=/gi, '') // 移除事件处理器
      .trim();
  }
  return input;
}

module.exports = {
  Validator,
  ValidationRules,
  createValidator,
  validateTextCorrection,
  validateFileUpload,
  sanitizeInput
};