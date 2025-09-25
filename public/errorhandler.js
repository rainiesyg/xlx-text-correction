// 错误处理模块 - 提供统一的错误处理和用户友好的错误提示
class ErrorHandler {
    constructor() {
        this.errorCounts = new Map();
        this.lastErrors = [];
        this.maxErrorHistory = 10;
    }

    /**
     * 处理错误并显示用户友好的提示
     * @param {Error|string} error - 错误对象或错误消息
     * @param {string} context - 错误上下文
     * @param {Object} options - 处理选项
     */
    handleError(error, context = 'UNKNOWN', options = {}) {
        const errorInfo = this.parseError(error, context);
        
        // 记录错误
        this.logError(errorInfo);
        
        // 显示用户提示
        if (!options.silent) {
            this.showUserMessage(errorInfo);
        }
        
        // 执行重试逻辑
        if (options.retry && this.shouldRetry(errorInfo)) {
            return this.scheduleRetry(options.retryCallback, errorInfo);
        }
        
        return errorInfo;
    }

    /**
     * 解析错误信息
     */
    parseError(error, context) {
        const timestamp = new Date().toISOString();
        let errorInfo = {
            timestamp,
            context,
            type: 'UNKNOWN',
            message: '未知错误',
            userMessage: '操作失败，请稍后重试',
            severity: 'error',
            retryable: false
        };

        if (typeof error === 'string') {
            errorInfo.message = error;
            errorInfo.userMessage = this.getUserFriendlyMessage(error, context);
        } else if (error instanceof Error) {
            errorInfo.message = error.message;
            errorInfo.stack = error.stack;
            errorInfo.userMessage = this.getUserFriendlyMessage(error.message, context);
            
            // 根据错误类型设置属性
            if (error.name === 'NetworkError' || error.message.includes('网络')) {
                errorInfo.type = 'NETWORK';
                errorInfo.retryable = true;
                errorInfo.userMessage = CONFIG.MESSAGES.ERRORS.NETWORK_ERROR;
            } else if (error.message.includes('API')) {
                errorInfo.type = 'API';
                errorInfo.retryable = true;
                errorInfo.userMessage = CONFIG.MESSAGES.ERRORS.API_ERROR;
            } else if (error.message.includes('解析')) {
                errorInfo.type = 'PARSE';
                errorInfo.userMessage = CONFIG.MESSAGES.ERRORS.PARSE_ERROR;
            }
        }

        // 根据上下文调整错误信息
        switch (context) {
            case 'TEXT_CORRECTION':
                if (errorInfo.type === 'UNKNOWN') {
                    errorInfo.userMessage = '文本纠错失败，请检查输入内容';
                }
                break;
            case 'FILE_UPLOAD':
                if (errorInfo.message.includes('大小')) {
                    errorInfo.userMessage = CONFIG.MESSAGES.ERRORS.FILE_TOO_LARGE;
                } else if (errorInfo.message.includes('格式')) {
                    errorInfo.userMessage = CONFIG.MESSAGES.ERRORS.UNSUPPORTED_FORMAT;
                }
                break;
            case 'VALIDATION':
                errorInfo.severity = 'warning';
                break;
        }

        return errorInfo;
    }

    /**
     * 获取用户友好的错误消息
     */
    getUserFriendlyMessage(message, context) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('network') || lowerMessage.includes('网络')) {
            return CONFIG.MESSAGES.ERRORS.NETWORK_ERROR;
        }
        if (lowerMessage.includes('timeout') || lowerMessage.includes('超时')) {
            return '请求超时，请稍后重试';
        }
        if (lowerMessage.includes('400')) {
            return '请求参数错误，请检查输入内容';
        }
        if (lowerMessage.includes('401') || lowerMessage.includes('403')) {
            return '认证失败，请联系管理员';
        }
        if (lowerMessage.includes('500')) {
            return '服务器内部错误，请稍后重试';
        }
        
        return '操作失败，请稍后重试';
    }

    /**
     * 记录错误信息
     */
    logError(errorInfo) {
        // 更新错误计数
        const key = `${errorInfo.context}_${errorInfo.type}`;
        this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
        
        // 添加到错误历史
        this.lastErrors.unshift(errorInfo);
        if (this.lastErrors.length > this.maxErrorHistory) {
            this.lastErrors.pop();
        }
        

    }

    /**
     * 显示用户消息
     */
    showUserMessage(errorInfo) {
        // 如果有用户友好的消息，显示给用户
        const message = errorInfo.userMessage || errorInfo.message;
        const type = this.getSeverityType(errorInfo.severity);
        
        // 使用UI管理器显示消息
        if (window.uiManager && typeof window.uiManager.displayMessage === 'function') {
            window.uiManager.displayMessage(message, type);
        } else {
            // 降级处理：创建简单的消息提示
            this.createSimpleMessage(message, type);
        }
        
        // 记录到控制台
        console.log(`[ErrorHandler] ${type.toUpperCase()}: ${message}`);
    }
    
    /**
     * 获取严重程度对应的类型
     */
    getSeverityType(severity) {
        switch (severity) {
            case 'critical':
            case 'high':
                return 'error';
            case 'medium':
                return 'warning';
            case 'low':
                return 'info';
            default:
                return 'info';
        }
    }
    
    /**
     * 创建简单的消息提示
     */
    createSimpleMessage(message, type) {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: opacity 0.3s ease;
        `;
        
        // 设置背景色
        switch (type) {
            case 'error':
                messageEl.style.backgroundColor = '#f56565';
                break;
            case 'warning':
                messageEl.style.backgroundColor = '#ed8936';
                break;
            case 'success':
                messageEl.style.backgroundColor = '#48bb78';
                break;
            default:
                messageEl.style.backgroundColor = '#4299e1';
        }
        
        messageEl.textContent = message;
        
        // 添加到页面
        document.body.appendChild(messageEl);
        
        // 3秒后自动移除
        setTimeout(() => {
            messageEl.style.opacity = '0';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 判断是否应该重试
     */
    shouldRetry(errorInfo) {
        if (!errorInfo.retryable) return false;
        
        const key = `${errorInfo.context}_${errorInfo.type}`;
        const count = this.errorCounts.get(key) || 0;
        
        return count <= CONFIG.API.RETRY_ATTEMPTS;
    }

    /**
     * 安排重试
     */
    scheduleRetry(retryCallback, errorInfo) {
        if (typeof retryCallback !== 'function') return false;
        
        const delay = CONFIG.API.RETRY_DELAY * Math.pow(2, this.errorCounts.get(`${errorInfo.context}_${errorInfo.type}`) || 0);
        
        setTimeout(() => {

            retryCallback();
        }, delay);
        
        return true;
    }

    /**
     * 获取错误统计
     */
    getErrorStats() {
        return {
            totalErrors: this.lastErrors.length,
            errorCounts: Object.fromEntries(this.errorCounts),
            recentErrors: this.lastErrors.slice(0, 5)
        };
    }

    /**
     * 清除错误历史
     */
    clearErrorHistory() {
        this.errorCounts.clear();
        this.lastErrors = [];
    }

    /**
     * 验证输入
     */
    validateInput(text, context = 'TEXT_INPUT') {
        const errors = [];
        
        if (!text || typeof text !== 'string') {
            errors.push({
                field: 'text',
                message: CONFIG.MESSAGES.ERRORS.EMPTY_TEXT,
                code: 'REQUIRED'
            });
        } else {
            if (text.trim().length === 0) {
                errors.push({
                    field: 'text',
                    message: CONFIG.MESSAGES.ERRORS.EMPTY_TEXT,
                    code: 'EMPTY'
                });
            }
            
            if (text.length > CONFIG.UI.MAX_TEXT_LENGTH) {
                errors.push({
                    field: 'text',
                    message: CONFIG.MESSAGES.ERRORS.TEXT_TOO_LONG,
                    code: 'TOO_LONG'
                });
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * 验证文件
     */
    validateFile(file) {
        const errors = [];
        const allowedTypes = ['.txt', '.doc', '.docx', '.pdf'];
        
        if (!file) {
            errors.push({
                field: 'file',
                message: '请选择要上传的文件',
                code: 'REQUIRED'
            });
        } else {
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            
            if (!allowedTypes.includes(ext)) {
                errors.push({
                    field: 'file',
                    message: CONFIG.MESSAGES.ERRORS.UNSUPPORTED_FORMAT,
                    code: 'INVALID_TYPE'
                });
            }
            
            if (file.size > 10 * 1024 * 1024) { // 10MB
                errors.push({
                    field: 'file',
                    message: CONFIG.MESSAGES.ERRORS.FILE_TOO_LARGE,
                    code: 'TOO_LARGE'
                });
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// 创建全局错误处理器实例
const errorHandler = new ErrorHandler();

// 导出错误处理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
} else {
    window.ErrorHandler = ErrorHandler;
    window.errorHandler = errorHandler;
}