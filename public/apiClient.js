// API客户端模块 - 提供统一的API通信接口
class APIClient {
    constructor() {
        this.baseURL = window.location.origin;
        this.timeout = CONFIG.API.TIMEOUT;
        this.retryAttempts = CONFIG.API.RETRY_ATTEMPTS;
        this.retryDelay = CONFIG.API.RETRY_DELAY;
    }

    /**
     * 发送HTTP请求
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @returns {Promise} 请求结果
     */
    async request(url, options = {}) {
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: this.timeout,
            ...options
        };

        // 添加请求ID用于追踪
        const requestId = this.generateRequestId();
        config.headers['X-Request-ID'] = requestId;

        // 记录请求信息
        console.log(`[API] 发送请求 [${requestId}]:`, {
            url,
            method: config.method,
            headers: config.headers,
            body: config.body ? (config.body instanceof FormData ? '[FormData]' : config.body) : undefined
        });

        try {
            const response = await this.fetchWithTimeout(url, config);
            
            if (!response.ok) {
                console.error(`[API] 请求失败 [${requestId}]:`, {
                    status: response.status,
                    statusText: response.statusText,
                    url
                });
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // 记录响应信息
            console.log(`[API] 收到响应 [${requestId}]:`, {
                status: response.status,
                statusText: response.statusText,
                data: data,
                responseTime: Date.now() - parseInt(requestId, 36)
            });

            return data;
        } catch (error) {
            console.error(`[API] 请求异常 [${requestId}]:`, {
                error: error.message,
                stack: error.stack,
                url
            });
            throw error;
        }
    }

    /**
     * 带超时的fetch请求
     */
    async fetchWithTimeout(url, config) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        try {
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请稍后重试');
            }
            throw error;
        }
    }

    /**
     * 带重试的请求
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @param {number} attempt - 当前尝试次数
     * @returns {Promise} 请求结果
     */
    async requestWithRetry(url, options = {}, attempt = 1) {
        try {
            return await this.request(url, options);
        } catch (error) {
            if (attempt < this.retryAttempts && this.isRetryableError(error)) {
                const delay = this.retryDelay * Math.pow(2, attempt - 1);

                console.warn(`[API] 请求重试 (${attempt}/${this.retryAttempts}):`, {
                    url,
                    error: error.message,
                    delay: `${delay}ms`,
                    nextAttempt: attempt + 1
                });
                
                await this.sleep(delay);
                return this.requestWithRetry(url, options, attempt + 1);
            }
            
            console.error(`[API] 请求最终失败:`, {
                url,
                attempts: attempt,
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * 判断错误是否可重试
     */
    isRetryableError(error) {
        const retryableErrors = [
            '请求超时',
            'NetworkError',
            'Failed to fetch',
            'HTTP 500',
            'HTTP 502',
            'HTTP 503',
            'HTTP 504'
        ];
        
        return retryableErrors.some(pattern => 
            error.message.includes(pattern)
        );
    }

    /**
     * 文本纠错API
     * @param {string} text - 要纠错的文本
     * @returns {Promise} 纠错结果
     */
    async correctText(text) {
        console.log('[API] 开始文本纠错:', {
            textLength: text.length,
            textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
        });
        
        // 输入验证
        const validation = errorHandler.validateInput(text, 'TEXT_CORRECTION');
        if (!validation.isValid) {
            console.error('[API] 文本验证失败:', validation.errors);
            const error = new Error(validation.errors[0].message);
            error.name = 'ValidationError';
            throw error;
        }

        const url = `${this.baseURL}/api/correct-text`;
        const options = {
            method: 'POST',
            body: JSON.stringify({ text })
        };

        try {
            const response = await this.requestWithRetry(url, options);
            
            if (!response.success) {
                console.error('[API] 文本纠错API返回失败:', response);
                throw new Error(response.error || '纠错失败');
            }
            
            console.log('[API] 文本纠错成功:', {
                errorsFound: response.result?.length || 0,
                result: response.result
            });
            
            return response.result;
        } catch (error) {
            console.error('[API] 文本纠错异常:', error);
            errorHandler.handleError(error, 'TEXT_CORRECTION');
            throw error;
        }
    }

    /**
     * 文件纠错API
     * @param {File} file - 要纠错的文件
     * @returns {Promise} 纠错结果
     */
    async correctFile(file) {
        console.log('[API] 开始文件纠错:', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            lastModified: new Date(file.lastModified).toISOString()
        });
        
        // 文件验证
        const validation = errorHandler.validateFile(file);
        if (!validation.isValid) {
            console.error('[API] 文件验证失败:', validation.errors);
            const error = new Error(validation.errors[0].message);
            error.name = 'ValidationError';
            throw error;
        }

        const url = `${this.baseURL}/api/correct-file`;
        const formData = new FormData();
        formData.append('file', file);

        const options = {
            method: 'POST',
            body: formData,
            headers: {} // 让浏览器自动设置Content-Type
        };

        try {
            const response = await this.requestWithRetry(url, options);
            
            if (!response.success) {
                console.error('[API] 文件纠错API返回失败:', response);
                throw new Error(response.error || '文件纠错失败');
            }
            
            console.log('[API] 文件纠错成功:', {
                fileName: file.name,
                errorsFound: response.result?.length || 0,
                originalTextLength: response.originalText?.length || 0,
                result: response.result
            });
            
            return {
                result: response.result,
                originalText: response.originalText
            };
        } catch (error) {
            console.error('[API] 文件纠错异常:', {
                fileName: file.name,
                error: error.message,
                stack: error.stack
            });
            errorHandler.handleError(error, 'FILE_CORRECTION');
            throw error;
        }
    }

    /**
     * 健康检查API
     * @returns {Promise} 健康状态
     */
    async healthCheck() {
        console.log('[API] 开始健康检查');
        
        const url = `${this.baseURL}/api/health`;
        
        try {
            const response = await this.request(url);
            
            console.log('[API] 健康检查成功:', {
                status: response.status,
                timestamp: response.timestamp,
                version: response.version
            });
            
            return response;
        } catch (error) {
            console.error('[API] 健康检查失败:', {
                error: error.message,
                url
            });
            errorHandler.handleError(error, 'HEALTH_CHECK', { silent: true });
            throw error;
        }
    }

    /**
     * 生成请求ID
     */
    generateRequestId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 延迟函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 取消所有进行中的请求
     */
    cancelAllRequests() {
        // 这里可以实现请求取消逻辑

    }

    /**
     * 获取API统计信息
     */
    getStats() {
        return {
            baseURL: this.baseURL,
            timeout: this.timeout,
            retryAttempts: this.retryAttempts,
            retryDelay: this.retryDelay
        };
    }
}

// 创建全局API客户端实例
const apiClient = new APIClient();

// 导出API客户端
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIClient;
} else {
    window.APIClient = APIClient;
    window.apiClient = apiClient;
}