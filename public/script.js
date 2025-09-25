// 模块化文本纠错应用
// 依赖: config.js, errorHandler.js, apiClient.js, textProcessor.js, uiManager.js, dependencyContainer.js, eventBus.js

// 应用主类
class TextCorrectionApp {
    constructor() {
        this.initialized = false;
        this.version = '2.0.0';
        this.container = null;
        this.eventBus = null;
        
        // 等待DOM加载完成后初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    /**
     * 初始化应用
     */
    async init() {
        try {
            console.log('[App] 开始初始化应用...');
            
            // 初始化依赖注入容器和事件总线
            await this.initializeInfrastructure();
            
            // 注册服务
            this.registerServices();
            
            // 验证依赖
            this.container.validateDependencies();
            
            // 初始化核心服务
            await this.container.initializeServices(['config', 'errorHandler', 'eventBus']);
            
            // 设置事件监听
            this.setupEventListeners();
            
            // 初始化UI组件
            await this.initializeUIComponents();
            
            // 设置全局错误处理
            this.setupGlobalErrorHandling();
            
            // 执行健康检查
            this.performHealthCheck();
            
            this.initialized = true;
            this.eventBus.emit('app:initialized', { version: this.version });
            
            console.log('[App] 应用初始化完成');
            
            // 初始化版本显示
            this.initializeVersionDisplay();
            
            // 发布应用就绪事件
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
    
    /**
     * 初始化基础设施
     */
    async initializeInfrastructure() {
        // 检查依赖注入容器
        if (!window.container) {
            throw new Error('依赖注入容器未加载');
        }
        
        // 检查事件总线
        if (!window.eventBus) {
            throw new Error('事件总线未加载');
        }
        
        this.container = window.container;
        this.eventBus = window.eventBus;
        
        // 启用调试模式（开发环境）
        if (window.location.hostname === 'localhost') {
            this.eventBus.setDebugMode(true);
        }
        
        console.log('[App] 基础设施初始化完成');
    }
    
    /**
     * 注册服务到依赖注入容器
     */
    registerServices() {
        // 注册配置服务
        this.container.register('config', window.CONFIG, {
            singleton: true,
            dependencies: []
        });
        
        // 注册事件总线
        this.container.register('eventBus', this.eventBus, {
            singleton: true,
            dependencies: []
        });
        
        // 注册错误处理器
        this.container.register('errorHandler', window.ErrorHandler, {
            singleton: true,
            dependencies: ['config', 'eventBus']
        });
        
        // 注册缓存管理器
        if (window.CacheManager) {
            this.container.register('cacheManager', window.CacheManager, {
                singleton: true,
                dependencies: ['config']
            });
        }
        
        // 注册API客户端
        this.container.register('apiClient', window.APIClient, {
            singleton: true,
            dependencies: ['config', 'errorHandler']
        });
        
        // 注册文本处理器
        this.container.register('textProcessor', window.TextProcessor, {
            singleton: true,
            dependencies: ['config', 'cacheManager', 'eventBus']
        });
        
        // 注册UI管理器
        this.container.register('uiManager', window.UIManager, {
            singleton: true,
            dependencies: ['config', 'errorHandler', 'eventBus']
        });
        
        // 注册用户体验管理器
        if (window.UserExperienceManager) {
            this.container.register('uxManager', window.UserExperienceManager, {
                singleton: true,
                dependencies: ['config', 'eventBus']
            });
        }
        
        // 注册测试管理器
        if (window.TestManager) {
            this.container.register('testManager', window.TestManager, {
                singleton: true,
                dependencies: ['config', 'eventBus'],
                lazy: true
            });
        }
        
        // 注册文档生成器
        if (window.DocumentationGenerator) {
            this.container.register('docGenerator', window.DocumentationGenerator, {
                singleton: true,
                dependencies: ['config', 'eventBus'],
                lazy: true
            });
        }
        
        // 注册文本对比模块
        if (window.TextDiffModule) {
            this.container.registerFactory('textDiffModule', () => {
                return new window.TextDiffModule();
            }, {
                singleton: true,
                dependencies: [],
                lazy: true
            });
        }
        
        console.log('[App] 服务注册完成');
    }
    
    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 监听文本纠错请求
        this.eventBus.on('text:correct:request', async (event) => {
            try {
                const { text, source } = event.data;
                this.eventBus.emit('ui:loading:start', { message: '正在纠错...' });
                
                const apiClient = this.container.get('apiClient');
                const result = await apiClient.correctText(text);
                
                this.eventBus.emit('text:correct:success', { result, originalText: text });
            } catch (error) {
                this.eventBus.emit('text:correct:error', { error, text: event.data.text });
            }
        });
        
        // 监听文件纠错请求
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
        
        // 监听纠错成功事件
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
        
        // 监听错误事件
        this.eventBus.on('text:correct:error', (event) => {
            this.eventBus.emit('ui:loading:stop');
            this.eventBus.emit('ui:message:show', {
                message: '文本纠错失败',
                type: 'error'
            });
        });
        
        this.eventBus.on('file:correct:error', (event) => {
            this.eventBus.emit('ui:loading:stop');
            this.eventBus.emit('ui:message:show', {
                message: '文件纠错失败',
                type: 'error'
            });
        });
        
        // 监听快捷键事件
        this.eventBus.on('shortcut:docs', () => {
            try {
                const docGenerator = this.container.get('docGenerator');
                docGenerator.showDocumentation();
            } catch (error) {
                console.warn('[App] 文档生成器未可用');
            }
        });
        
        this.eventBus.on('shortcut:tests', () => {
            try {
                const testManager = this.container.get('testManager');
                testManager.showTestContainer();
            } catch (error) {
                console.warn('[App] 测试管理器未可用');
            }
        });
        
        console.log('[App] 事件监听设置完成');
    }
    
    /**
     * 初始化UI组件
     */
    async initializeUIComponents() {
        // 初始化UI管理器
        const uiManager = this.container.get('uiManager');
        
        // 初始化用户体验管理器（如果可用）
        try {
            const uxManager = this.container.get('uxManager');
            console.log('[App] 用户体验管理器已初始化');
        } catch (error) {
            console.log('[App] 用户体验管理器不可用，跳过初始化');
        }
        
        // 设置键盘快捷键
        this.setupKeyboardShortcuts();
        
        // 设置头部按钮事件
        this.setupHeaderButtons();
        
        console.log('[App] UI组件初始化完成');
    }
    
    /**
     * 获取服务实例
     * @param {string} serviceName - 服务名称
     * @returns {*} 服务实例
     */
    getService(serviceName) {
        try {
            return this.container.get(serviceName);
        } catch (error) {
            console.warn(`[App] 获取服务 '${serviceName}' 失败:`, error);
            return null;
        }
    }
    
    /**
     * 初始化版本号显示
     */
    initializeVersionDisplay() {
        try {
            const versionElement = document.getElementById('versionDisplay');
            if (versionElement && window.CONFIG && window.CONFIG.VERSION) {
                const version = window.CONFIG.VERSION;
                versionElement.textContent = `v${version.display} (${version.buildDate})`;
                versionElement.title = `完整版本: ${version.full}\n构建日期: ${version.buildDate}`;
            }
        } catch (error) {
            console.warn('[App] 版本号显示初始化失败:', error);
        }
    }
    
    /**
      * 设置键盘快捷键
      */
     setupKeyboardShortcuts() {
         document.addEventListener('keydown', (e) => {
             // Ctrl/Cmd + Shift + D: 打开文档
             if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                 e.preventDefault();
                 this.eventBus.emit('shortcut:docs');
             }
             
             // Ctrl/Cmd + Shift + T: 打开测试
             if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                 e.preventDefault();
                 this.eventBus.emit('shortcut:tests');
             }
         });
         
         // 绑定头部按钮事件
         this.setupHeaderButtons();
     }
     
     /**
      * 设置头部按钮事件
      */
     setupHeaderButtons() {
         // 文档按钮
         const docsBtn = document.getElementById('docsBtn');
         if (docsBtn) {
             docsBtn.addEventListener('click', () => {
                 this.eventBus.emit('shortcut:docs');
             });
         }
         
         // 测试按钮
         const testsBtn = document.getElementById('testsBtn');
         if (testsBtn) {
             testsBtn.addEventListener('click', () => {
                 this.eventBus.emit('shortcut:tests');
             });
         }
         
         // 状态按钮
         const statusBtn = document.getElementById('statusBtn');
         if (statusBtn) {
             statusBtn.addEventListener('click', () => {
                 this.showSystemStatus();
             });
         }
     }
     
     /**
      * 显示系统状态
      */
     showSystemStatus() {
         const status = this.getStatus();
         const performanceStats = this.getPerformanceStats();
         
         const statusInfo = {
             ...status,
             performance: performanceStats,
             timestamp: new Date().toISOString()
         };
         
         // 创建状态显示弹窗
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
         
         // 点击背景关闭
         modal.addEventListener('click', (e) => {
             if (e.target === modal) {
                 modal.remove();
             }
         });
     }
    
    /**
     * 设置全局错误处理
     */
    setupGlobalErrorHandling() {
        const errorHandler = this.container.get('errorHandler');
        
        // 捕获未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            console.error('[App] 未处理的Promise拒绝:', event.reason);
            errorHandler.handleError(event.reason, 'UNHANDLED_PROMISE');
            event.preventDefault();
        });
        
        // 捕获全局错误
        window.addEventListener('error', (event) => {
            console.error('[App] 全局错误:', event.error);
            errorHandler.handleError(event.error, 'GLOBAL_ERROR');
        });
    }
    
    /**
     * 执行健康检查
     */
    async performHealthCheck() {
        try {
            console.log('[App] 开始健康检查...');
            
            // 检查API连接
            const apiClient = this.container.get('apiClient');
            await apiClient.healthCheck();
            
            console.log('[App] 健康检查通过');
        } catch (error) {
            console.warn('[App] 健康检查失败:', error);
            // 健康检查失败不应阻止应用启动
        }
    }
    
    /**
     * 处理初始化错误
     */
    handleInitializationError(error) {
        // 显示用户友好的错误消息
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
    
    /**
     * 获取应用状态
     */
    getStatus() {
        return {
            initialized: this.initialized,
            version: this.version,
            components: {
                // 核心组件
                config: !!window.CONFIG,
                errorHandler: !!window.errorHandler,
                apiClient: !!window.apiClient,
                textProcessor: !!window.textProcessor,
                uiManager: !!window.uiManager,
                
                // 增强组件
                cacheManager: !!window.CacheManager,
                userExperienceManager: !!window.UserExperienceManager,
                testManager: !!window.TestManager,
                documentationGenerator: !!window.DocumentationGenerator
            },
            features: {
                caching: !!this.textProcessor?.cacheManager,
                userExperience: !!this.textProcessor?.uxManager,
                testing: !!this.testManager,
                documentation: !!this.docGenerator
            }
        };
    }
    
    /**
     * 获取性能统计
     */
    getPerformanceStats() {
        const stats = {
            cache: null,
            processing: null,
            ui: null
        };
        
        if (this.textProcessor?.cacheManager) {
            stats.cache = this.textProcessor.cacheManager.getStats();
        }
        
        if (this.textProcessor?.uxManager) {
            stats.ui = this.textProcessor.uxManager.getStatistics();
        }
        
        return stats;
    }
}

// 初始化全局依赖容器和事件总线
window.container = new DependencyContainer();
window.eventBus = new EventBus();

// 创建应用实例
const app = new TextCorrectionApp();

// 保留原有功能的兼容性包装器
// 这些函数现在委托给模块化组件

// 兼容性全局变量（逐步迁移到模块中）
let currentFile = null;
let originalText = '';
let correctedResult = null;

// 兼容性DOM元素引用
const elements = {
    // 标签页
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // 文本输入
    textInput: document.getElementById('textInput'),
    charCount: document.getElementById('charCount'),
    correctTextBtn: document.getElementById('correctTextBtn'),
    
    // 文件上传
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileSize: document.getElementById('fileSize'),
    removeFileBtn: document.getElementById('removeFileBtn'),
    correctFileBtn: document.getElementById('correctFileBtn'),
    
    // 结果显示
    resultSection: document.getElementById('resultSection'),
    resultTabBtns: document.querySelectorAll('.result-tab-btn'),
    resultContents: document.querySelectorAll('.result-content'),
    originalTextDiv: document.getElementById('originalText'),
    comparisonCorrectedText: document.getElementById('comparisonCorrectedText'),
    detailsContainer: document.getElementById('detailsContainer'),
    copyBtn: document.getElementById('copyBtn'),
    
    // 其他
    loadingOverlay: document.getElementById('loadingOverlay'),
    message: document.getElementById('message')
};

// 兼容性事件监听器初始化
function initializeEventListeners() {
    // 委托给UIManager处理
    if (window.uiManager) {
        // 模块化组件已处理事件监听
        return;
    }
    
    // 降级处理：如果模块未加载，使用原有逻辑
    
    
    // 标签页切换
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // 结果标签页切换
    elements.resultTabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchResultTab(btn.dataset.resultTab));
    });
    
    // 文本输入
    elements.textInput.addEventListener('input', updateCharCount);
    elements.correctTextBtn.addEventListener('click', correctText);
    
    // 文件上传
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.removeFileBtn.addEventListener('click', removeFile);
    elements.correctFileBtn.addEventListener('click', correctFile);
    
    // 复制按钮
    elements.copyBtn.addEventListener('click', copyResult);
}

// 标签页切换
function switchTab(tabName) {
    // 更新标签按钮状态
    elements.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // 更新标签内容显示
    elements.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
    
    // 隐藏结果区域
    hideResults();
}

// 结果标签页切换
function switchResultTab(tabName) {
    elements.resultTabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.resultTab === tabName);
    });
    
    elements.resultContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-result`);
    });
}

// 更新字符计数
function updateCharCount() {
    const count = elements.textInput.value.length;
    elements.charCount.textContent = count;
    
    // 根据字符数量改变颜色
    if (count > 4500) {
        elements.charCount.style.color = '#dc3545';
    } else if (count > 4000) {
        elements.charCount.style.color = '#ffc107';
    } else {
        elements.charCount.style.color = '#666';
    }
}

// 文件拖拽处理
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelection(files[0]);
    }
}

// 文件选择处理
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFileSelection(file);
    }
}

// 处理文件选择
function handleFileSelection(file) {
    // 检查文件类型
    const allowedTypes = ['.txt', '.doc', '.docx', '.pdf'];
    const fileName = file.name.toLowerCase();
    const isValidType = allowedTypes.some(type => fileName.endsWith(type));
    
    if (!isValidType) {
        showMessage('不支持的文件类型，请选择 .txt, .doc, .docx 或 .pdf 文件', 'error');
        return;
    }
    
    // 检查文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
        showMessage('文件大小不能超过10MB', 'error');
        return;
    }
    
    currentFile = file;
    
    // 显示文件信息
    elements.fileName.textContent = file.name;
    elements.fileSize.textContent = formatFileSize(file.size);
    elements.fileInfo.style.display = 'flex';
    elements.correctFileBtn.disabled = false;
    
    // 隐藏上传区域
    elements.uploadArea.style.display = 'none';
    
    hideResults();
}

// 移除文件
function removeFile() {
    currentFile = null;
    elements.fileInput.value = '';
    elements.fileInfo.style.display = 'none';
    elements.uploadArea.style.display = 'block';
    elements.correctFileBtn.disabled = true;
    hideResults();
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 文本纠错 - 委托给模块化组件
async function correctText() {
    // 优先使用模块化组件
    if (window.textProcessor && window.apiClient) {
        try {
            const text = elements.textInput.value.trim();
            
            // 使用TextProcessor进行验证
            const validation = textProcessor.validateInput(text);
            if (!validation.isValid) {
                showMessage(validation.message, 'error');
                return;
            }
            
            originalText = text;
            showLoading(true);
            
            // 使用APIClient进行纠错
            const result = await apiClient.correctText(text);
            
            correctedResult = result;
            displayResults();
            showMessage('文本纠错完成', 'success');
            
        } catch (error) {
            
            if (window.errorHandler) {
                errorHandler.handleError(error, 'TEXT_CORRECTION');
            } else {
                showMessage('网络错误，请稍后重试', 'error');
            }
        } finally {
            showLoading(false);
        }
        return;
    }
    
    // 降级处理：使用原有逻辑
    
    
    const text = elements.textInput.value.trim();
    
    if (!text) {
        showMessage('请输入需要纠错的文本', 'error');
        return;
    }
    
    if (text.length > 2000) {
        showMessage('文本长度不能超过2000字符', 'error');
        return;
    }
    
    originalText = text;
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/correct-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
        
        const data = await response.json();
        
        if (data.success) {
            correctedResult = data.result;
            displayResults();
            showMessage('文本纠错完成', 'success');
        } else {
            showMessage(data.error || '纠错失败', 'error');
        }
    } catch (error) {
        
        showMessage('网络错误，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

// 文件纠错 - 委托给模块化组件
async function correctFile() {
    // 优先使用模块化组件
    if (window.textProcessor && window.apiClient) {
        try {
            if (!currentFile) {
                showMessage('请先选择文件', 'error');
                return;
            }
            
            // 使用TextProcessor进行文件验证
            const validation = textProcessor.validateFile(currentFile);
            if (!validation.isValid) {
                showMessage(validation.message, 'error');
                return;
            }
            
            showLoading(true);
            
            // 使用APIClient进行文件纠错
            const result = await apiClient.correctFile(currentFile);
            
            originalText = result.originalText;
            correctedResult = result.result;
            displayResults();
            showMessage('文件纠错完成', 'success');
            
        } catch (error) {
            
            if (window.errorHandler) {
                errorHandler.handleError(error, 'FILE_CORRECTION');
            } else {
                showMessage('网络错误，请稍后重试', 'error');
            }
        } finally {
            showLoading(false);
        }
        return;
    }
    
    // 降级处理：使用原有逻辑
    
    
    if (!currentFile) {
        showMessage('请先选择文件', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', currentFile);
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/correct-file', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            originalText = data.originalText;
            correctedResult = data.result;
            displayResults();
            showMessage('文件纠错完成', 'success');
        } else {
            showMessage(data.error || '文件纠错失败', 'error');
        }
    } catch (error) {
        
        showMessage('网络错误，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

// 显示结果 - 委托给模块化组件
function displayResults() {
    if (!correctedResult) return;
    
    // 优先使用模块化组件
    if (window.textProcessor && window.uiManager) {
        try {
            // 使用TextProcessor处理结果
            const processedResult = textProcessor.processResult(correctedResult, originalText);
            
            // 使用UIManager显示结果
            uiManager.displayResults(processedResult, originalText);
            
            return;
        } catch (error) {

            // 继续使用降级逻辑
        }
    }
    
    // 降级处理：使用原有逻辑
    
    
    
    // 显示结果区域
    elements.resultSection.style.display = 'block';
    
    // 处理纠错结果
    let correctedText = originalText; // 默认使用原文
    let errorDetails = [];
    
    // 根据科大讯飞API的返回格式解析数据
    let resultData = null;
    
    // 检查不同可能的数据结构
    if (correctedResult.payload && correctedResult.payload.result && correctedResult.payload.result.text) {
        // 如果返回的text字段已经被解码，直接使用
        try {
            resultData = JSON.parse(correctedResult.payload.result.text);

        } catch (e) {

            // 如果解析失败，可能text就是纠错后的文本
            correctedText = correctedResult.payload.result.text;
        }
    } else if (correctedResult.data && correctedResult.data.result) {
        resultData = correctedResult.data.result;
    }
    
    // 处理科大讯飞文本纠错API的新格式
    if (resultData) {

        
        // 应用所有类型的纠错
        correctedText = applyCorrections(originalText, resultData, errorDetails);
        
        // 如果处理ws字段格式（语音转写格式）
        if (resultData.ws && Array.isArray(resultData.ws)) {

            processWsFormat(resultData.ws, errorDetails);
        }
        
        // 如果直接返回纠错后的文本
        if (resultData.text && typeof resultData.text === 'string') {
            correctedText = resultData.text;
        }
    }
    
    // 如果纠错后文本为空，使用原文
    if (!correctedText || !correctedText.trim()) {
        correctedText = originalText;
    }
    
    // 如果没有发现错误详情
    if (errorDetails.length === 0) {
        // 比较原文和纠错后文本是否相同
        if (correctedText === originalText) {
            errorDetails.push({
                type: '检查完成',
                message: '未发现需要纠正的错误，文本质量良好！'
            });
        } else {
            // 如果文本有变化但没有详细错误信息，添加通用提示
            errorDetails.push({
                type: '文本优化',
                message: '文本已进行优化处理'
            });
        }
    }
    
    // 更新显示内容
    elements.correctedText.textContent = correctedText;
    elements.originalTextDiv.textContent = originalText;
    elements.comparisonCorrectedText.innerHTML = highlightDifferences(originalText, correctedText);
    
    // 显示详细信息
    displayErrorDetails(errorDetails);
    
    // 默认显示纠错后文本
    switchResultTab('corrected');
}

// 应用纠错
function applyCorrections(originalText, resultData, errorDetails) {
    let correctedText = originalText;
    
    // 使用配置文件中的错误类型显示名称
    const getErrorTypeDisplayName = (errorType) => {
        const config = CONFIG.ERROR_TYPES[errorType];
        return config ? config.displayName : errorType;
    };
    
    // 收集所有纠错信息
     let corrections = [];
     
     // 遍历所有错误类型字段
     Object.keys(CONFIG.ERROR_TYPES).forEach(errorType => {
         if (resultData[errorType] && Array.isArray(resultData[errorType])) {
             resultData[errorType].forEach(errorArray => {
                 // 格式：[pos, cur, correct, description]
                 if (Array.isArray(errorArray) && errorArray.length >= 3) {
                     const [position, originalText, correctedText, description] = errorArray;
                     
                     corrections.push({
                         position: parseInt(position),
                         original: originalText,
                         corrected: correctedText,
                         type: getErrorTypeDisplayName(errorType),
                         description: description || errorType
                     });
                     
                     // 记录错误详情
                     errorDetails.push({
                         type: getErrorTypeDisplayName(errorType),
                         original: originalText,
                         corrected: correctedText,
                         position: position,
                         description: description || errorType
                     });
                 }
             });
         }
     });
     
     // 按位置排序，从后往前应用纠正（避免位置偏移）
     corrections.sort((a, b) => b.position - a.position);
     
     // 应用纠正
     corrections.forEach(correction => {
         if (correction.original && correction.corrected && correction.original !== correction.corrected) {
             const beforeText = correctedText.substring(0, correction.position);
             const afterText = correctedText.substring(correction.position + correction.original.length);
             correctedText = beforeText + correction.corrected + afterText;
         }
     });
    
    return correctedText;
}

// 处理ws格式数据
function processWsFormat(wsData, errorDetails) {
    wsData.forEach((wordSegment, segmentIndex) => {
        if (wordSegment.cw && Array.isArray(wordSegment.cw)) {
            wordSegment.cw.forEach((candidate, candidateIndex) => {
                if (candidate.w && candidate.sc !== undefined && candidate.sc < 0.8) {
                    errorDetails.push({
                        position: segmentIndex,
                        word: candidate.w,
                        confidence: candidate.sc,
                        type: 'ws格式错误',
                        wordProperty: candidate.wp || '未知'
                    });
                }
            });
        }
    });
}



// 高亮显示差异
function highlightDifferences(original, corrected) {
    if (original === corrected) {
        return corrected;
    }
    
    // 简单的差异高亮（可以使用更复杂的diff算法）
    const originalWords = original.split('');
    const correctedWords = corrected.split('');
    
    let result = '';
    let i = 0, j = 0;
    
    while (i < originalWords.length || j < correctedWords.length) {
        if (i < originalWords.length && j < correctedWords.length && originalWords[i] === correctedWords[j]) {
            result += correctedWords[j];
            i++;
            j++;
        } else {
            // 找到不同的部分
            let originalPart = '';
            let correctedPart = '';
            
            // 收集原文的不同部分
            while (i < originalWords.length && (j >= correctedWords.length || originalWords[i] !== correctedWords[j])) {
                originalPart += originalWords[i];
                i++;
            }
            
            // 收集纠正后的不同部分
            while (j < correctedWords.length && (i >= originalWords.length || correctedWords[j] !== originalWords[i])) {
                correctedPart += correctedWords[j];
                j++;
            }
            
            if (correctedPart) {
                result += `<span class="highlight-correction">${correctedPart}</span>`;
            }
        }
    }
    
    return result;
}

// 显示错误详情
function displayErrorDetails(errorDetails) {
    elements.detailsContainer.innerHTML = '';
    
    if (errorDetails.length === 0) {
        elements.detailsContainer.innerHTML = '<p>未发现需要纠正的错误。</p>';
        return;
    }
    
    errorDetails.forEach((error, index) => {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-item';
        
        if (error.message) {
            errorDiv.innerHTML = `
                <div class="error-type">${error.type}</div>
                <div class="error-message">${error.message}</div>
            `;
        } else if (error.original && error.corrected) {
            // 传统的原文-纠正格式
            let detailHtml = `
                <div class="error-type">${error.type}</div>
                <div class="error-detail">
                    <span class="error-label">原文：</span>
                    <span class="error-text error-original">${error.original}</span>
                </div>
                <div class="error-detail">
                    <span class="error-label">纠正：</span>
                    <span class="error-text error-corrected">${error.corrected}</span>
                </div>
            `;
            
            // 添加位置信息
            if (error.position !== undefined) {
                detailHtml += `
                    <div class="error-detail">
                        <span class="error-label">位置：</span>
                        <span class="position-info">第${error.position}字符</span>
                    </div>
                `;
            }
            
            // 添加错误描述
            if (error.description && error.description !== error.type) {
                detailHtml += `
                    <div class="error-detail">
                        <span class="error-label">详情：</span>
                        <span class="error-description">${error.description}</span>
                    </div>
                `;
            }
            
            // 添加置信度信息（如果有）
            if (error.confidence !== undefined) {
                const confidencePercent = (error.confidence * 100).toFixed(1);
                detailHtml += `
                    <div class="error-detail">
                        <span class="error-label">置信度：</span>
                        <span class="confidence-score ${error.confidence < 0.5 ? 'low' : error.confidence < 0.8 ? 'medium' : 'high'}">
                            ${confidencePercent}%
                        </span>
                    </div>
                `;
            }
            
            errorDiv.innerHTML = detailHtml;
        } else if (error.word) {
            // 基于ws字段的详细信息格式
            let detailHtml = `
                <div class="error-type">${error.type}</div>
                <div class="error-detail">
                    <span class="error-label">词语：</span>
                    <span class="error-text">${error.word}</span>
                </div>
            `;
            
            if (error.confidence !== undefined) {
                const confidencePercent = (error.confidence * 100).toFixed(1);
                detailHtml += `
                    <div class="error-detail">
                        <span class="error-label">置信度：</span>
                        <span class="confidence-score ${error.confidence < 0.5 ? 'low' : error.confidence < 0.8 ? 'medium' : 'high'}">
                            ${confidencePercent}%
                        </span>
                    </div>
                `;
            }
            
            if (error.wordProperty && error.wordProperty !== '未知') {
                detailHtml += `
                    <div class="error-detail">
                        <span class="error-label">词性：</span>
                        <span class="word-property">${error.wordProperty}</span>
                    </div>
                `;
            }
            
            if (error.position !== undefined) {
                detailHtml += `
                    <div class="error-detail">
                        <span class="error-label">位置：</span>
                        <span class="position-info">第${error.position + 1}个词段</span>
                    </div>
                `;
            }
            
            errorDiv.innerHTML = detailHtml;
        }
        
        elements.detailsContainer.appendChild(errorDiv);
    });
}

// 复制结果
function copyResult() {
    // 从对比显示区域获取纠错后的文本
    const textToCopy = elements.comparisonCorrectedText.textContent;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showMessage('结果已复制到剪贴板', 'success');
        }).catch(() => {
            fallbackCopyText(textToCopy);
        });
    } else {
        fallbackCopyText(textToCopy);
    }
}

// 备用复制方法
function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showMessage('结果已复制到剪贴板', 'success');
    } catch (err) {
        showMessage('复制失败，请手动复制', 'error');
    }
    
    document.body.removeChild(textArea);
}

// 显示/隐藏加载状态
function showLoading(show) {
    elements.loadingOverlay.style.display = show ? 'flex' : 'none';
}

// 隐藏结果
function hideResults() {
    elements.resultSection.style.display = 'none';
    correctedResult = null;
}

// 显示消息
function showMessage(text, type = 'info') {
    // 优先使用UI管理器的消息显示功能
    if (window.uiManager && typeof window.uiManager.showMessage === 'function') {
        window.uiManager.showMessage(text, type);
        return;
    }
    
    // 降级处理：创建简单的消息提示
    createSimpleMessage(text, type);
}

// 创建简单的消息提示（降级处理）
function createSimpleMessage(message, type) {
    // 移除现有的消息
    const existingMessages = document.querySelectorAll('.simple-message');
    existingMessages.forEach(msg => msg.remove());
    
    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.className = `simple-message simple-message-${type}`;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        z-index: 9999;
        max-width: 300px;
        word-wrap: break-word;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        transform: translateX(100%);
        opacity: 0;
    `;
    
    // 设置背景色
    const colors = {
        error: '#f56565',
        warning: '#ed8936',
        success: '#48bb78',
        info: '#4299e1'
    };
    
    messageEl.style.backgroundColor = colors[type] || colors.info;
    messageEl.textContent = message;
    
    // 添加到页面
    document.body.appendChild(messageEl);
    
    // 动画显示
    requestAnimationFrame(() => {
        messageEl.style.transform = 'translateX(0)';
        messageEl.style.opacity = '1';
    });
    
    // 3秒后自动移除
    setTimeout(() => {
        messageEl.style.transform = 'translateX(100%)';
        messageEl.style.opacity = '0';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 300);
    }, 3000);
    
    // 记录到控制台
    console.log(`[Script] ${type.toUpperCase()}: ${message}`);
}

// 工具函数：防抖
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 为输入框添加防抖 - 兼容性处理
if (elements.textInput) {
    elements.textInput.addEventListener('input', debounce(updateCharCount, 100));
}

// 暴露全局接口供调试和扩展使用
window.TextCorrectionApp = {
    app,
    // 兼容性接口
    elements,
    correctText,
    correctFile,
    displayResults,
    // 工具函数
    debounce,
    formatFileSize
};