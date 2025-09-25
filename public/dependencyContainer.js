/**
 * 依赖注入容器 - 管理模块间的依赖关系，实现松耦合架构
 */
class DependencyContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.factories = new Map();
        this.dependencies = new Map();
        this.initialized = new Set();
        
        // 生命周期钩子
        this.hooks = {
            beforeCreate: new Map(),
            afterCreate: new Map(),
            beforeDestroy: new Map()
        };
        
        console.log('[DI Container] 依赖注入容器已初始化');
    }
    
    /**
     * 注册服务
     * @param {string} name - 服务名称
     * @param {Function|Object} service - 服务构造函数或实例
     * @param {Object} options - 配置选项
     */
    register(name, service, options = {}) {
        const config = {
            singleton: options.singleton !== false, // 默认单例
            dependencies: options.dependencies || [],
            factory: options.factory || false,
            lazy: options.lazy !== false, // 默认懒加载
            ...options
        };
        
        this.services.set(name, {
            service,
            config
        });
        
        this.dependencies.set(name, config.dependencies);
        
        console.log(`[DI Container] 已注册服务: ${name}`, config);
        return this;
    }
    
    /**
     * 注册工厂函数
     * @param {string} name - 服务名称
     * @param {Function} factory - 工厂函数
     * @param {Object} options - 配置选项
     */
    registerFactory(name, factory, options = {}) {
        return this.register(name, factory, {
            ...options,
            factory: true
        });
    }
    
    /**
     * 获取服务实例
     * @param {string} name - 服务名称
     * @returns {*} 服务实例
     */
    get(name) {
        if (!this.services.has(name)) {
            throw new Error(`服务 '${name}' 未注册`);
        }
        
        const { service, config } = this.services.get(name);
        
        // 单例模式检查
        if (config.singleton && this.singletons.has(name)) {
            return this.singletons.get(name);
        }
        
        // 创建实例
        const instance = this.createInstance(name, service, config);
        
        // 缓存单例
        if (config.singleton) {
            this.singletons.set(name, instance);
        }
        
        return instance;
    }
    
    /**
     * 创建服务实例
     * @param {string} name - 服务名称
     * @param {Function|Object} service - 服务
     * @param {Object} config - 配置
     * @returns {*} 实例
     */
    createInstance(name, service, config) {
        // 执行创建前钩子
        this.executeHook('beforeCreate', name);
        
        let instance;
        
        try {
            if (config.factory) {
                // 工厂模式
                const dependencies = this.resolveDependencies(config.dependencies);
                instance = service(...dependencies);
            } else if (typeof service === 'function') {
                // 构造函数模式
                const dependencies = this.resolveDependencies(config.dependencies);
                instance = new service(...dependencies);
            } else {
                // 直接实例
                instance = service;
            }
            
            // 执行创建后钩子
            this.executeHook('afterCreate', name, instance);
            
            console.log(`[DI Container] 已创建服务实例: ${name}`);
            return instance;
            
        } catch (error) {
            console.error(`[DI Container] 创建服务 '${name}' 失败:`, error);
            throw error;
        }
    }
    
    /**
     * 解析依赖
     * @param {Array} dependencies - 依赖列表
     * @returns {Array} 依赖实例数组
     */
    resolveDependencies(dependencies) {
        return dependencies.map(dep => {
            if (typeof dep === 'string') {
                return this.get(dep);
            } else if (typeof dep === 'object' && dep.name) {
                // 支持配置对象 { name: 'serviceName', optional: true }
                try {
                    return this.get(dep.name);
                } catch (error) {
                    if (dep.optional) {
                        return null;
                    }
                    throw error;
                }
            }
            return dep;
        });
    }
    
    /**
     * 检查循环依赖
     * @param {string} name - 服务名称
     * @param {Set} visited - 已访问的服务
     * @param {Set} visiting - 正在访问的服务
     */
    checkCircularDependency(name, visited = new Set(), visiting = new Set()) {
        if (visiting.has(name)) {
            throw new Error(`检测到循环依赖: ${Array.from(visiting).join(' -> ')} -> ${name}`);
        }
        
        if (visited.has(name)) {
            return;
        }
        
        visiting.add(name);
        
        const dependencies = this.dependencies.get(name) || [];
        dependencies.forEach(dep => {
            const depName = typeof dep === 'string' ? dep : dep.name;
            if (depName && this.services.has(depName)) {
                this.checkCircularDependency(depName, visited, visiting);
            }
        });
        
        visiting.delete(name);
        visited.add(name);
    }
    
    /**
     * 验证所有依赖
     */
    validateDependencies() {
        for (const [name] of this.services) {
            this.checkCircularDependency(name);
        }
        console.log('[DI Container] 依赖验证通过');
    }
    
    /**
     * 批量初始化服务
     * @param {Array} serviceNames - 服务名称列表
     */
    async initializeServices(serviceNames = []) {
        const toInitialize = serviceNames.length > 0 
            ? serviceNames 
            : Array.from(this.services.keys());
            
        for (const name of toInitialize) {
            if (!this.initialized.has(name)) {
                try {
                    this.get(name);
                    this.initialized.add(name);
                } catch (error) {
                    console.error(`[DI Container] 初始化服务 '${name}' 失败:`, error);
                }
            }
        }
    }
    
    /**
     * 添加生命周期钩子
     * @param {string} hook - 钩子类型
     * @param {string} serviceName - 服务名称
     * @param {Function} callback - 回调函数
     */
    addHook(hook, serviceName, callback) {
        if (!this.hooks[hook]) {
            throw new Error(`未知的钩子类型: ${hook}`);
        }
        
        if (!this.hooks[hook].has(serviceName)) {
            this.hooks[hook].set(serviceName, []);
        }
        
        this.hooks[hook].get(serviceName).push(callback);
    }
    
    /**
     * 执行钩子
     * @param {string} hook - 钩子类型
     * @param {string} serviceName - 服务名称
     * @param {...*} args - 参数
     */
    executeHook(hook, serviceName, ...args) {
        const callbacks = this.hooks[hook].get(serviceName) || [];
        callbacks.forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`[DI Container] 执行钩子 ${hook}:${serviceName} 失败:`, error);
            }
        });
    }
    
    /**
     * 销毁服务
     * @param {string} name - 服务名称
     */
    destroy(name) {
        if (this.singletons.has(name)) {
            const instance = this.singletons.get(name);
            
            // 执行销毁前钩子
            this.executeHook('beforeDestroy', name, instance);
            
            // 如果实例有 destroy 方法，调用它
            if (instance && typeof instance.destroy === 'function') {
                instance.destroy();
            }
            
            this.singletons.delete(name);
            this.initialized.delete(name);
            
            console.log(`[DI Container] 已销毁服务: ${name}`);
        }
    }
    
    /**
     * 清理所有服务
     */
    clear() {
        // 销毁所有单例
        for (const name of this.singletons.keys()) {
            this.destroy(name);
        }
        
        // 清理注册信息
        this.services.clear();
        this.dependencies.clear();
        this.initialized.clear();
        
        console.log('[DI Container] 已清理所有服务');
    }
    
    /**
     * 获取容器状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            registeredServices: Array.from(this.services.keys()),
            singletonInstances: Array.from(this.singletons.keys()),
            initializedServices: Array.from(this.initialized),
            dependencyGraph: Object.fromEntries(this.dependencies)
        };
    }
}

// 创建全局容器实例
const container = new DependencyContainer();

// 导出容器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DependencyContainer, container };
} else {
    window.DependencyContainer = DependencyContainer;
    window.container = container;
}