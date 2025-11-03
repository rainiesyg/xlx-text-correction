// 模块化文本纠错应用
// 依赖: config.js, errorHandler.js, apiClient.js, textProcessor.js, uiManager.js, dependencyContainer.js, eventBus.js

// 应用主类
class TextCorrectionApp {
    constructor() {
        this.initialized = false;
        this.version = '2.0.0';
        this.container = null;
        this.eventBus = null;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    async init() {
        try {
            console.log('[App] 开始初始化应用...');
            await this.initializeInfrastructure();
            this.registerServices();
            this.container.validateDependencies();
            await this.container.initializeServices(['config', 'errorHandler', 'eventBus']);
            this.setupEventListeners();
            await this.initializeUIComponents();
            this.setupGlobalErrorHandling();
            this.performHealthCheck();
            this.initialized = true;
            this.eventBus.emit('app:initialized', { version: this.version });
            console.log('[App] 应用初始化完成');
            this.initializeVersionDisplay();
            this.eventBus.emit('app:ready', {
                timestamp: Date.now(),
                services: this.container.getStatus().registeredServices
            });
        } catch (error) {
            console.error('[App] 应用初始化失败:', error);
            this.eventBus.emit('app:error', { error, phase: 'initialization' });
            this.handleInitializationError(error);
        }
    }
    
    async initializeInfrastructure() {
        if (!window.container) throw new Error('依赖注入容器未加载');
        if (!window.eventBus) throw new Error('事件总线未加载');
        this.container = window.container;
        this.eventBus = window.eventBus;
        if (window.location.hostname === 'localhost') this.eventBus.setDebugMode(true);
        console.log('[App] 基础设施初始化完成');
    }
    
    registerServices() {
        this.container.register('config', window.CONFIG, { singleton: true, dependencies: [] });
        this.container.register('eventBus', this.eventBus, { singleton: true, dependencies: [] });
        this.container.register('errorHandler', window.ErrorHandler, { singleton: true, dependencies: ['config', 'eventBus'] });
        this.container.register('apiClient', window.APIClient, { singleton: true, dependencies: ['config', 'errorHandler'] });
        this.container.register('textProcessor', window.TextProcessor, { singleton: true, dependencies: ['config', 'eventBus'] });
        this.container.register('uiManager', window.UIManager, { singleton: true, dependencies: ['config', 'errorHandler', 'eventBus'] });
        if (window.TextDiffModule) {
            this.container.registerFactory('textDiffModule', () => new window.TextDiffModule(), { singleton: true, dependencies: [], lazy: true });
        }
        console.log('[App] 服务注册完成');
    }
    
    setupEventListeners() {
        this.eventBus.on('text:correct:request', async (event) => {
            try {
                const { text } = event.data;
                this.eventBus.emit('ui:loading:start', { message: '正在纠错...' });
                const apiClient = this.container.get('apiClient');
                const result = await apiClient.correctText(text);
                this.eventBus.emit('text:correct:success', { result, originalText: text });
            } catch (error) {
                this.eventBus.emit('text:correct:error', { error, text: event.data.text });
            }
        });
        
        this.eventBus.on('file:correct:request', async (event) => {
            try {
                const { file } = event.data;
                this.eventBus.emit('ui:loading:start', { message: '正在处理文件...' });
                const apiClient = this.container.get('apiClient');
                const result = await apiClient.correctFile(file);
                this.eventBus.emit('file:correct:success', { result, file });
            } catch (error) {
                this.eventBus.emit('file:correct:error', { error, file: event.data.file });
            }
        });
        
        this.eventBus.on('text:correct:success', (event) => {
            const textProcessor = this.container.get('textProcessor');
            const processedResult = textProcessor.processResult(event.data.result, event.data.originalText);
            this.eventBus.emit('result:processed', { processedResult });
            this.eventBus.emit('ui:loading:stop');
        });
        
        this.eventBus.on('file:correct:success', (event) => {
            const textProcessor = this.container.get('textProcessor');
            const processedResult = textProcessor.processResult(event.data.result.result, event.data.result.originalText);
            this.eventBus.emit('result:processed', { processedResult });
            this.eventBus.emit('ui:loading:stop');
        });
        
        this.eventBus.on('text:correct:error', () => {
            this.eventBus.emit('ui:loading:stop');
            this.eventBus.emit('ui:message:show', { message: '文本纠错失败', type: 'error' });
        });
        
        this.eventBus.on('file:correct:error', () => {
            this.eventBus.emit('ui:loading:stop');
            this.eventBus.emit('ui:message:show', { message: '文件纠错失败', type: 'error' });
        });
        
        this.eventBus.on('shortcut:docs', () => { console.warn('[App] 文档功能已移除'); });
        this.eventBus.on('shortcut:tests', () => { console.warn('[App] 测试功能已移除'); });
        console.log('[App] 事件监听设置完成');
    }
    
    async initializeUIComponents() {
        this.container.get('uiManager');

        this.setupKeyboardShortcuts();
        this.setupHeaderButtons();
        console.log('[App] UI组件初始化完成');
    }
    
    getService(name) {
        try { return this.container.get(name); } catch (e) { console.warn(`[App] 获取服务 '${name}' 失败:`, e); return null; }
    }
    
    initializeVersionDisplay() {
        try {
            const versionElement = document.getElementById('versionDisplay');
            if (versionElement && window.CONFIG?.VERSION) {
                const v = window.CONFIG.VERSION;
                versionElement.textContent = `v${v.display} (${v.buildDate})`;
                versionElement.title = `完整版本: ${v.full}\n构建日期: ${v.buildDate}`;
            }
        } catch (e) { console.warn('[App] 版本号显示初始化失败:', e); }
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') { e.preventDefault(); this.eventBus.emit('shortcut:docs'); }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') { e.preventDefault(); this.eventBus.emit('shortcut:tests'); }
        });
        this.setupHeaderButtons();
    }
    
    setupHeaderButtons() {
        const docsBtn = document.getElementById('docsBtn');
        if (docsBtn) docsBtn.addEventListener('click', () => this.eventBus.emit('shortcut:docs'));
        const testsBtn = document.getElementById('testsBtn');
        if (testsBtn) testsBtn.addEventListener('click', () => this.eventBus.emit('shortcut:tests'));
        const statusBtn = document.getElementById('statusBtn');
        if (statusBtn) statusBtn.addEventListener('click', () => this.showSystemStatus());
    }
    
    showSystemStatus() {
        const status = this.getStatus();
        const performanceStats = this.getPerformanceStats();
        const statusInfo = { ...status, performance: performanceStats, timestamp: new Date().toISOString() };
        const modal = document.createElement('div');
        modal.className = 'status-modal';
        modal.innerHTML = `
            <div class="status-modal-content">
                <div class="status-header">
                    <h3><i class="fas fa-info-circle"></i> 系统状态</h3>
                    <button class="close-btn" onclick="this.closest('.status-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="status-body">
                    <pre>${JSON.stringify(statusInfo, null, 2)}</pre>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }
    
    setupGlobalErrorHandling() {
        const errorHandler = this.container.get('errorHandler');
        window.addEventListener('unhandledrejection', (event) => {
            console.error('[App] 未处理的Promise拒绝:', event.reason);
            errorHandler.handleError(event.reason, 'UNHANDLED_PROMISE');
            event.preventDefault();
        });
        window.addEventListener('error', (event) => {
            console.error('[App] 全局错误:', event.error);
            errorHandler.handleError(event.error, 'GLOBAL_ERROR');
        });
    }
    
    async performHealthCheck() {
        try {
            console.log('[App] 开始健康检查...');
            const apiClient = this.container.get('apiClient');
            await apiClient.healthCheck();
            console.log('[App] 健康检查通过');
        } catch (error) {
            console.warn('[App] 健康检查失败:', error);
        }
    }
    
    handleInitializationError(error) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'initialization-error';
        errorMessage.innerHTML = `
            <h3>应用初始化失败</h3>
            <p>请刷新页面重试，如果问题持续存在，请联系技术支持。</p>
            <details>
                <summary>错误详情</summary>
                <pre>${error.message}</pre>
            </details>
        `;
        document.body.insertBefore(errorMessage, document.body.firstChild);
    }
    
    getStatus() {
        return {
            initialized: this.initialized,
            version: this.version,
            components: {
                config: !!window.CONFIG,
                errorHandler: !!window.errorHandler,
                apiClient: !!window.apiClient,
                textProcessor: !!window.textProcessor,
                uiManager: !!window.uiManager
            },
            features: {}
        };
    }
    
    getPerformanceStats() {
        const stats = { cache: null, processing: null, ui: null };
        if (this.textProcessor?.cacheManager) stats.cache = this.textProcessor.cacheManager.getStats();
        if (this.textProcessor?.uxManager) stats.ui = this.textProcessor.uxManager.getStatistics();
        return stats;
    }
}

// 创建应用实例
const app = new TextCorrectionApp();

// 可选：暴露少量调试入口
window.TextCorrectionApp = { app };
