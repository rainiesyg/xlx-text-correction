/**
 * 事件总线 - 实现模块间的松耦合通信
 */
class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
        this.middlewares = [];
        this.eventHistory = [];
        this.maxHistorySize = 100;
        this.debugMode = false;
        
        console.log('[EventBus] 事件总线已初始化');
    }
    
    /**
     * 订阅事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @param {Object} options - 选项
     * @returns {Function} 取消订阅函数
     */
    on(eventName, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('回调函数必须是一个函数');
        }
        
        const config = {
            priority: options.priority || 0,
            once: options.once || false,
            context: options.context || null,
            filter: options.filter || null,
            ...options
        };
        
        const listener = {
            callback,
            config,
            id: this.generateId()
        };
        
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        
        const listeners = this.events.get(eventName);
        listeners.push(listener);
        
        // 按优先级排序
        listeners.sort((a, b) => b.config.priority - a.config.priority);
        
        if (this.debugMode) {
            console.log(`[EventBus] 已订阅事件: ${eventName}`, config);
        }
        
        // 返回取消订阅函数
        return () => this.off(eventName, listener.id);
    }
    
    /**
     * 一次性订阅事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @param {Object} options - 选项
     * @returns {Function} 取消订阅函数
     */
    once(eventName, callback, options = {}) {
        return this.on(eventName, callback, { ...options, once: true });
    }
    
    /**
     * 取消订阅
     * @param {string} eventName - 事件名称
     * @param {string|Function} callbackOrId - 回调函数或监听器ID
     */
    off(eventName, callbackOrId) {
        if (!this.events.has(eventName)) {
            return;
        }
        
        const listeners = this.events.get(eventName);
        const index = listeners.findIndex(listener => {
            return typeof callbackOrId === 'string' 
                ? listener.id === callbackOrId
                : listener.callback === callbackOrId;
        });
        
        if (index !== -1) {
            listeners.splice(index, 1);
            
            if (this.debugMode) {
                console.log(`[EventBus] 已取消订阅事件: ${eventName}`);
            }
        }
        
        // 如果没有监听器了，删除事件
        if (listeners.length === 0) {
            this.events.delete(eventName);
        }
    }
    
    /**
     * 发布事件
     * @param {string} eventName - 事件名称
     * @param {*} data - 事件数据
     * @param {Object} options - 选项
     * @returns {Promise} 处理结果
     */
    async emit(eventName, data = null, options = {}) {
        const config = {
            async: options.async !== false, // 默认异步
            stopOnError: options.stopOnError || false,
            timeout: options.timeout || 5000,
            ...options
        };
        
        const eventData = {
            name: eventName,
            data,
            timestamp: Date.now(),
            source: config.source || 'unknown',
            id: this.generateId()
        };
        
        // 记录事件历史
        this.addToHistory(eventData);
        
        if (this.debugMode) {
            console.log(`[EventBus] 发布事件: ${eventName}`, eventData);
        }
        
        // 执行中间件
        for (const middleware of this.middlewares) {
            try {
                const result = await middleware(eventData);
                if (result === false) {
                    if (this.debugMode) {
                        console.log(`[EventBus] 事件被中间件拦截: ${eventName}`);
                    }
                    return { intercepted: true };
                }
            } catch (error) {
                console.error(`[EventBus] 中间件执行失败:`, error);
                if (config.stopOnError) {
                    throw error;
                }
            }
        }
        
        const listeners = this.events.get(eventName) || [];
        const results = [];
        const errors = [];
        
        for (const listener of listeners) {
            try {
                // 检查过滤器
                if (listener.config.filter && !listener.config.filter(eventData)) {
                    continue;
                }
                
                let result;
                
                if (config.async) {
                    // 异步执行
                    const promise = listener.config.context
                        ? listener.callback.call(listener.config.context, eventData)
                        : listener.callback(eventData);
                    
                    // 设置超时
                    result = await Promise.race([
                        promise,
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('事件处理超时')), config.timeout)
                        )
                    ]);
                } else {
                    // 同步执行
                    result = listener.config.context
                        ? listener.callback.call(listener.config.context, eventData)
                        : listener.callback(eventData);
                }
                
                results.push({ listenerId: listener.id, result });
                
                // 一次性监听器处理
                if (listener.config.once) {
                    this.off(eventName, listener.id);
                }
                
            } catch (error) {
                console.error(`[EventBus] 事件处理器执行失败 (${eventName}):`, error);
                errors.push({ listenerId: listener.id, error });
                
                if (config.stopOnError) {
                    throw error;
                }
            }
        }
        
        return {
            eventId: eventData.id,
            results,
            errors,
            listenerCount: listeners.length
        };
    }
    
    /**
     * 同步发布事件
     * @param {string} eventName - 事件名称
     * @param {*} data - 事件数据
     * @param {Object} options - 选项
     */
    emitSync(eventName, data = null, options = {}) {
        return this.emit(eventName, data, { ...options, async: false });
    }
    
    /**
     * 添加中间件
     * @param {Function} middleware - 中间件函数
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('中间件必须是一个函数');
        }
        
        this.middlewares.push(middleware);
        
        if (this.debugMode) {
            console.log('[EventBus] 已添加中间件');
        }
    }
    
    /**
     * 移除中间件
     * @param {Function} middleware - 中间件函数
     */
    removeMiddleware(middleware) {
        const index = this.middlewares.indexOf(middleware);
        if (index !== -1) {
            this.middlewares.splice(index, 1);
            
            if (this.debugMode) {
                console.log('[EventBus] 已移除中间件');
            }
        }
    }
    
    /**
     * 等待事件
     * @param {string} eventName - 事件名称
     * @param {Object} options - 选项
     * @returns {Promise} 事件数据
     */
    waitFor(eventName, options = {}) {
        const timeout = options.timeout || 10000;
        const filter = options.filter || null;
        
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.off(eventName, listener);
                reject(new Error(`等待事件 '${eventName}' 超时`));
            }, timeout);
            
            const listener = (eventData) => {
                if (filter && !filter(eventData)) {
                    return; // 继续等待
                }
                
                clearTimeout(timeoutId);
                resolve(eventData);
            };
            
            this.once(eventName, listener);
        });
    }
    
    /**
     * 获取事件监听器数量
     * @param {string} eventName - 事件名称
     * @returns {number} 监听器数量
     */
    listenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }
    
    /**
     * 获取所有事件名称
     * @returns {Array} 事件名称数组
     */
    eventNames() {
        return Array.from(this.events.keys());
    }
    
    /**
     * 清除所有监听器
     * @param {string} eventName - 事件名称（可选）
     */
    clear(eventName = null) {
        if (eventName) {
            this.events.delete(eventName);
            if (this.debugMode) {
                console.log(`[EventBus] 已清除事件监听器: ${eventName}`);
            }
        } else {
            this.events.clear();
            if (this.debugMode) {
                console.log('[EventBus] 已清除所有事件监听器');
            }
        }
    }
    
    /**
     * 设置调试模式
     * @param {boolean} enabled - 是否启用
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`[EventBus] 调试模式: ${enabled ? '已启用' : '已禁用'}`);
    }
    
    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 添加到事件历史
     * @param {Object} eventData - 事件数据
     */
    addToHistory(eventData) {
        this.eventHistory.unshift(eventData);
        
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.pop();
        }
    }
    
    /**
     * 获取事件历史
     * @param {number} limit - 限制数量
     * @returns {Array} 事件历史
     */
    getHistory(limit = 10) {
        return this.eventHistory.slice(0, limit);
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const eventStats = {};
        for (const [eventName, listeners] of this.events) {
            eventStats[eventName] = listeners.length;
        }
        
        return {
            totalEvents: this.events.size,
            totalListeners: Array.from(this.events.values()).reduce((sum, listeners) => sum + listeners.length, 0),
            eventStats,
            middlewareCount: this.middlewares.length,
            historySize: this.eventHistory.length
        };
    }
}

// 创建全局事件总线实例
const eventBus = new EventBus();

// 导出事件总线
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventBus, eventBus };
} else {
    window.EventBus = EventBus;
    window.eventBus = eventBus;
}