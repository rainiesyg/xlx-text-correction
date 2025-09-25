/**
 * 缓存管理器 - 提供高效的数据缓存和检索功能
 */
class CacheManager {
    constructor(config = {}) {
        this.enabled = config.enabled !== false;
        this.ttl = config.ttl || 300000; // 默认5分钟
        this.maxSize = config.maxSize || 1000;
        this.cache = new Map();
        this.timers = new Map();
        

    }
    
    /**
     * 生成缓存键
     * @param {string} prefix - 前缀
     * @param {*} data - 数据
     * @returns {string} 缓存键
     */
    generateKey(prefix, data) {
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
        return `${prefix}:${this.hashCode(dataStr)}`;
    }
    
    /**
     * 简单哈希函数
     * @param {string} str - 字符串
     * @returns {string} 哈希值
     */
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(36);
    }
    
    /**
     * 设置缓存
     * @param {string} key - 缓存键
     * @param {*} value - 缓存值
     * @param {number} customTtl - 自定义TTL
     */
    set(key, value, customTtl = null) {
        if (!this.enabled) return;
        
        // 检查缓存大小限制
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        
        const ttl = customTtl || this.ttl;
        const item = {
            value,
            timestamp: Date.now(),
            ttl
        };
        
        this.cache.set(key, item);
        
        // 设置过期定时器
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }
        
        const timer = setTimeout(() => {
            this.delete(key);
        }, ttl);
        
        this.timers.set(key, timer);
        

    }
    
    /**
     * 获取缓存
     * @param {string} key - 缓存键
     * @returns {*} 缓存值或null
     */
    get(key) {
        if (!this.enabled) return null;
        
        const item = this.cache.get(key);
        if (!item) return null;
        
        // 检查是否过期
        if (Date.now() - item.timestamp > item.ttl) {
            this.delete(key);
            return null;
        }
        
        
        return item.value;
    }
    
    /**
     * 删除缓存
     * @param {string} key - 缓存键
     */
    delete(key) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
    
        }
        
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
    }
    
    /**
     * 清空缓存
     */
    clear() {
        this.cache.clear();
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();

    }
    
    /**
     * 驱逐最旧的缓存项
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, item] of this.cache.entries()) {
            if (item.timestamp < oldestTime) {
                oldestTime = item.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.delete(oldestKey);

        }
    }
    
    /**
     * 获取缓存统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            enabled: this.enabled,
            ttl: this.ttl,
            keys: Array.from(this.cache.keys())
        };
    }
    
    /**
     * 批量设置缓存
     * @param {Array} items - 缓存项数组 [{key, value, ttl?}]
     */
    setBatch(items) {
        items.forEach(item => {
            this.set(item.key, item.value, item.ttl);
        });
    }
    
    /**
     * 批量获取缓存
     * @param {Array} keys - 缓存键数组
     * @returns {Object} 键值对对象
     */
    getBatch(keys) {
        const result = {};
        keys.forEach(key => {
            const value = this.get(key);
            if (value !== null) {
                result[key] = value;
            }
        });
        return result;
    }
}

// 导出缓存管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CacheManager;
} else {
    window.CacheManager = CacheManager;
}