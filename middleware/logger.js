/**
 * 增强的日志系统
 * 支持文件输出、日志轮转和不同级别的日志记录
 */

const fs = require('fs');
const path = require('path');

// 日志级别
const LogLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// 日志级别名称
const LogLevelNames = {
  [LogLevels.ERROR]: 'ERROR',
  [LogLevels.WARN]: 'WARN',
  [LogLevels.INFO]: 'INFO',
  [LogLevels.DEBUG]: 'DEBUG'
};

// 日志颜色
const LogColors = {
  ERROR: '\x1b[31m', // 红色
  WARN: '\x1b[33m',  // 黄色
  INFO: '\x1b[36m',  // 青色
  DEBUG: '\x1b[35m', // 紫色
  RESET: '\x1b[0m'   // 重置
};

class EnhancedLogger {
  constructor(options = {}) {
    this.logLevel = this.parseLogLevel(options.level || process.env.LOG_LEVEL || 'INFO');
    this.enableFileLogging = options.enableFileLogging !== false;
    this.logDir = options.logDir || path.join(process.cwd(), 'logs');
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 5;
    this.enableConsole = options.enableConsole !== false;
    
    // 确保日志目录存在
    if (this.enableFileLogging) {
      this.ensureLogDirectory();
    }
    
    // 错误统计
    this.errorStats = {
      total: 0,
      byType: {},
      byHour: {}
    };
  }

  parseLogLevel(level) {
    if (typeof level === 'string') {
      return LogLevels[level.toUpperCase()] || LogLevels.INFO;
    }
    return level;
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  shouldLog(level) {
    return level <= this.logLevel;
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const levelName = LogLevelNames[level];
    
    const logEntry = {
      timestamp,
      level: levelName,
      message,
      ...meta
    };

    return {
      console: this.formatConsoleMessage(timestamp, levelName, message, meta),
      file: JSON.stringify(logEntry)
    };
  }

  formatConsoleMessage(timestamp, level, message, meta) {
    const color = LogColors[level] || '';
    const reset = LogColors.RESET;
    const emoji = this.getLevelEmoji(level);
    
    let formatted = `${color}[${timestamp}] ${emoji} ${level}: ${message}${reset}`;
    
    if (Object.keys(meta).length > 0) {
      formatted += `\n${color}Meta: ${JSON.stringify(meta, null, 2)}${reset}`;
    }
    
    return formatted;
  }

  getLevelEmoji(level) {
    const emojis = {
      ERROR: '❌',
      WARN: '⚠️',
      INFO: 'ℹ️',
      DEBUG: '🐛'
    };
    return emojis[level] || '📝';
  }

  writeToFile(level, content) {
    if (!this.enableFileLogging) return;

    const levelName = LogLevelNames[level].toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    const filename = `${levelName}-${date}.log`;
    const filepath = path.join(this.logDir, filename);

    try {
      // 检查文件大小，如果超过限制则轮转
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        if (stats.size > this.maxFileSize) {
          this.rotateLogFile(filepath);
        }
      }

      fs.appendFileSync(filepath, content + '\n', 'utf8');
    } catch (error) {
      console.error('写入日志文件失败:', error.message);
    }
  }

  rotateLogFile(filepath) {
    try {
      const dir = path.dirname(filepath);
      const basename = path.basename(filepath, '.log');
      
      // 移动现有文件
      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldFile = path.join(dir, `${basename}.${i}.log`);
        const newFile = path.join(dir, `${basename}.${i + 1}.log`);
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldFile); // 删除最老的文件
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
      
      // 重命名当前文件
      const rotatedFile = path.join(dir, `${basename}.1.log`);
      fs.renameSync(filepath, rotatedFile);
    } catch (error) {
      console.error('日志文件轮转失败:', error.message);
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formatted = this.formatMessage(level, message, meta);

    // 控制台输出
    if (this.enableConsole) {
      const output = level === LogLevels.ERROR ? console.error : console.log;
      output(formatted.console);
    }

    // 文件输出
    this.writeToFile(level, formatted.file);

    // 错误统计
    if (level === LogLevels.ERROR) {
      this.updateErrorStats(meta);
    }
  }

  updateErrorStats(meta) {
    this.errorStats.total++;
    
    // 按类型统计
    const errorType = meta.type || 'UNKNOWN';
    this.errorStats.byType[errorType] = (this.errorStats.byType[errorType] || 0) + 1;
    
    // 按小时统计
    const hour = new Date().getHours();
    this.errorStats.byHour[hour] = (this.errorStats.byHour[hour] || 0) + 1;
  }

  error(message, meta = {}) {
    this.log(LogLevels.ERROR, message, meta);
  }

  warn(message, meta = {}) {
    this.log(LogLevels.WARN, message, meta);
  }

  info(message, meta = {}) {
    this.log(LogLevels.INFO, message, meta);
  }

  debug(message, meta = {}) {
    this.log(LogLevels.DEBUG, message, meta);
  }

  // 获取错误统计
  getErrorStats() {
    return { ...this.errorStats };
  }

  // 清除错误统计
  clearErrorStats() {
    this.errorStats = {
      total: 0,
      byType: {},
      byHour: {}
    };
  }

  // 获取日志文件列表
  getLogFiles() {
    if (!this.enableFileLogging || !fs.existsSync(this.logDir)) {
      return [];
    }

    try {
      return fs.readdirSync(this.logDir)
        .filter(file => file.endsWith('.log'))
        .map(file => {
          const filepath = path.join(this.logDir, file);
          const stats = fs.statSync(filepath);
          return {
            name: file,
            path: filepath,
            size: stats.size,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.modified - a.modified);
    } catch (error) {
      this.error('获取日志文件列表失败', { error: error.message });
      return [];
    }
  }

  // 读取日志文件内容
  readLogFile(filename, lines = 100) {
    const filepath = path.join(this.logDir, filename);
    
    if (!fs.existsSync(filepath)) {
      throw new Error(`日志文件不存在: ${filename}`);
    }

    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const logLines = content.trim().split('\n');
      
      // 返回最后N行
      const startIndex = Math.max(0, logLines.length - lines);
      return logLines.slice(startIndex).map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line, timestamp: null, level: 'UNKNOWN' };
        }
      });
    } catch (error) {
      throw new Error(`读取日志文件失败: ${error.message}`);
    }
  }
}

// 创建默认日志实例
const logger = new EnhancedLogger({
  level: process.env.LOG_LEVEL || 'INFO',
  enableFileLogging: process.env.ENABLE_FILE_LOGGING !== 'false',
  logDir: process.env.LOG_DIR || path.join(process.cwd(), 'logs')
});

module.exports = {
  EnhancedLogger,
  LogLevels,
  logger
};