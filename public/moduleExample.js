// 模块解耦架构使用示例
// 本文件展示了如何使用依赖注入容器和事件总线来实现松耦合的模块架构

/**
 * 示例：创建一个新的功能模块
 * 该模块展示了如何正确地与现有架构集成
 */
class ExampleFeatureModule {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus;
        this.config = dependencies.config;
        this.logger = dependencies.logger || console;
        
        this.state = {
            isActive: false,
            data: null
        };
        
        this.setupEventListeners();
        this.logger.log('[ExampleFeature] 模块已初始化');
    }
    
    /**
     * 设置事件监听器
     * 展示了如何监听和响应系统事件
     */
    setupEventListeners() {
        if (!this.eventBus) return;
        
        // 监听应用就绪事件
        this.eventBus.on('app:ready', (event) => {
            this.logger.log('[ExampleFeature] 应用已就绪，开始激活功能');
            this.activate();
        });
        
        // 监听文本变更事件
        this.eventBus.on('ui:text:changed', (event) => {
            this.handleTextChange(event.data);
        });
        
        // 监听纠错完成事件
        this.eventBus.on('result:processed', (event) => {
            this.handleResultProcessed(event.data);
        });
        
        // 监听自定义事件
        this.eventBus.on('example:feature:toggle', (event) => {
            this.toggle(event.data.enabled);
        });
    }
    
    /**
     * 激活功能
     */
    activate() {
        this.state.isActive = true;
        this.logger.log('[ExampleFeature] 功能已激活');
        
        // 发布功能激活事件
        if (this.eventBus) {
            this.eventBus.emit('example:feature:activated', {
                timestamp: Date.now(),
                module: 'ExampleFeature'
            });
        }
    }
    
    /**
     * 处理文本变更
     */
    handleTextChange(data) {
        if (!this.state.isActive) return;
        
        const { text, length } = data;
        this.logger.log(`[ExampleFeature] 文本已变更，长度: ${length}`);
        
        // 执行一些处理逻辑
        this.processText(text);
    }
    
    /**
     * 处理纠错结果
     */
    handleResultProcessed(data) {
        if (!this.state.isActive) return;
        
        this.logger.log('[ExampleFeature] 纠错结果已处理');
        
        // 可以对结果进行额外的分析或处理
        this.analyzeResult(data.processedResult);
    }
    
    /**
     * 处理文本
     */
    processText(text) {
        // 示例：简单的文本分析
        const analysis = {
            wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
            charCount: text.length,
            hasNumbers: /\d/.test(text),
            hasPunctuation: /[.,!?;:]/.test(text)
        };
        
        this.state.data = analysis;
        
        // 发布分析结果
        if (this.eventBus) {
            this.eventBus.emit('example:text:analyzed', {
                analysis,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * 分析纠错结果
     */
    analyzeResult(result) {
        // 示例：分析纠错的改进情况
        const improvements = {
            errorsFixed: result.errors?.length || 0,
            confidenceAverage: this.calculateAverageConfidence(result.errors),
            mostCommonErrorType: this.findMostCommonErrorType(result.errors)
        };
        
        this.logger.log('[ExampleFeature] 纠错分析完成:', improvements);
        
        // 发布分析结果
        if (this.eventBus) {
            this.eventBus.emit('example:result:analyzed', {
                improvements,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * 计算平均置信度
     */
    calculateAverageConfidence(errors) {
        if (!errors || errors.length === 0) return 0;
        
        const total = errors.reduce((sum, error) => {
            return sum + (error.confidence || 0);
        }, 0);
        
        return total / errors.length;
    }
    
    /**
     * 找出最常见的错误类型
     */
    findMostCommonErrorType(errors) {
        if (!errors || errors.length === 0) return null;
        
        const typeCounts = {};
        errors.forEach(error => {
            const type = error.type || 'unknown';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        
        return Object.keys(typeCounts).reduce((a, b) => 
            typeCounts[a] > typeCounts[b] ? a : b
        );
    }
    
    /**
     * 切换功能状态
     */
    toggle(enabled) {
        this.state.isActive = enabled;
        this.logger.log(`[ExampleFeature] 功能${enabled ? '已启用' : '已禁用'}`);
        
        // 发布状态变更事件
        if (this.eventBus) {
            this.eventBus.emit('example:feature:toggled', {
                enabled,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * 获取当前状态
     */
    getStatus() {
        return {
            isActive: this.state.isActive,
            hasData: !!this.state.data,
            lastUpdate: this.state.lastUpdate
        };
    }
    
    /**
     * 清理资源
     */
    destroy() {
        if (this.eventBus) {
            // 移除所有事件监听器
            this.eventBus.off('app:ready');
            this.eventBus.off('ui:text:changed');
            this.eventBus.off('result:processed');
            this.eventBus.off('example:feature:toggle');
        }
        
        this.state = null;
        this.logger.log('[ExampleFeature] 模块已销毁');
    }
}

/**
 * 如何在主应用中注册这个模块的示例
 */
function registerExampleFeature(container, eventBus) {
    container.register('exampleFeature', (container) => {
        const config = container.get('config');
        return new ExampleFeatureModule({
            eventBus,
            config,
            logger: console
        });
    });
}

/**
 * 使用示例
 */
function exampleUsage() {
    // 假设我们有一个应用实例
    const app = new TextCorrectionApp();
    
    // 在应用初始化后注册新功能
    app.init().then(() => {
        // 注册示例功能模块
        registerExampleFeature(app.container, app.eventBus);
        
        // 初始化模块
        const exampleFeature = app.container.get('exampleFeature');
        
        // 通过事件总线与模块交互
        app.eventBus.emit('example:feature:toggle', { enabled: true });
        
        // 监听模块事件
        app.eventBus.on('example:text:analyzed', (event) => {
            console.log('文本分析结果:', event.data.analysis);
        });
        
        app.eventBus.on('example:result:analyzed', (event) => {
            console.log('纠错分析结果:', event.data.improvements);
        });
    });
}

// 导出模块
if (typeof window !== 'undefined') {
    window.ExampleFeatureModule = ExampleFeatureModule;
    window.registerExampleFeature = registerExampleFeature;
}

// 模块解耦的最佳实践总结：
//
// 1. 依赖注入：
//    - 通过构造函数接收依赖，而不是直接访问全局变量
//    - 使用依赖注入容器管理服务的创建和生命周期
//    - 支持可选依赖，提供降级处理
//
// 2. 事件驱动：
//    - 使用事件总线进行模块间通信
//    - 发布/订阅模式实现松耦合
//    - 避免直接方法调用
//
// 3. 接口隔离：
//    - 每个模块只依赖它需要的接口
//    - 通过事件定义清晰的模块边界
//    - 支持模块的独立测试和开发
//
// 4. 生命周期管理：
//    - 明确的初始化和销毁流程
//    - 资源清理和内存管理
//    - 错误处理和恢复机制
//
// 5. 配置驱动：
//    - 通过配置控制模块行为
//    - 支持运行时配置变更
//    - 环境特定的配置管理