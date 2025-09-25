// UI管理器模块 - 负责界面交互、状态管理和用户体验优化
class UIManager {
    constructor(dependencies = {}) {
        this.config = dependencies.config || CONFIG || {};
        this.eventBus = dependencies.eventBus;
        this.errorHandler = dependencies.errorHandler;
        
        this.debounceDelay = this.config.UI?.DEBOUNCE_DELAY || 300;
        this.messageDisplayTime = this.config.UI?.MESSAGE_DISPLAY_TIME || 3000;
        this.confidenceThreshold = this.config.UI?.CONFIDENCE_THRESHOLD || 0.8;
        
        this.elements = {};
        this.state = {
            isProcessing: false,
            currentText: '',
            currentResult: null,
            selectedErrors: new Set(),
            viewMode: 'split' // 'original', 'corrected', 'split'
        };
        
        this.debounceTimers = new Map();
        this.animationQueue = [];
        
        this.init();
        this.setupEventListeners();
    }

    /**
     * 初始化UI管理器
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.setupKeyboardShortcuts();
        this.initializeTooltips();
        this.setupAccessibility();
        
        console.log('[UIManager] UI管理器初始化完成');
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        if (!this.eventBus) return;
        
        // 监听加载状态事件
        this.eventBus.on('ui:loading:start', (event) => {
            this.showLoading(event.data.message || '处理中...');
        });
        
        this.eventBus.on('ui:loading:stop', () => {
            this.hideLoading();
        });
        
        // 监听消息显示事件
        this.eventBus.on('ui:message:show', (event) => {
            const { message, type = 'info' } = event.data;
            this.showMessage(message, type);
        });
        
        // 监听结果处理事件
        this.eventBus.on('result:processed', (event) => {
            this.displayResult(event.data.processedResult);
        });
        
        // 监听UI状态更新事件
        this.eventBus.on('ui:state:update', (event) => {
            this.updateState(event.data);
        });
        
        console.log('[UIManager] 事件监听器设置完成');
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.elements = {
            // 输入区域
            textInput: document.getElementById('textInput'),
            fileInput: document.getElementById('fileInput'),
            correctTextBtn: document.getElementById('correctTextBtn'),
            correctFileBtn: document.getElementById('correctFileBtn'),
            removeFileBtn: document.getElementById('removeFileBtn'),
            copyBtn: document.getElementById('copyBtn'),
            
            // 结果显示区域
            resultsContainer: document.getElementById('resultSection'),
            originalText: document.getElementById('originalText'),
            comparisonCorrectedText: document.getElementById('comparisonCorrectedText'),
            errorDetails: document.getElementById('detailsContainer'),
            
            // 统计信息
            statisticsContainer: document.getElementById('statistics'),
            
            // 标签页
            tabBtns: document.querySelectorAll('.tab-btn'),
            resultTabBtns: document.querySelectorAll('.result-tab-btn'),
            
            // 控制面板
            viewModeButtons: document.querySelectorAll('[data-view-mode]'),
            errorTypeFilters: document.querySelectorAll('[data-error-type]'),
            confidenceSlider: document.getElementById('confidenceSlider'),
            
            // 文件上传相关
            uploadArea: document.getElementById('uploadArea'),
            fileInfo: document.getElementById('fileInfo'),
            fileName: document.getElementById('fileName'),
            fileSize: document.getElementById('fileSize'),
            
            // 字符计数
            charCount: document.getElementById('charCount'),
            
            // 消息提示
            messageContainer: document.getElementById('messageContainer') || this.createMessageContainer(),
            
            // 加载指示器
            loadingIndicator: document.getElementById('loadingIndicator') || this.createLoadingIndicator()
        };
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 文本输入事件（防抖）
        if (this.elements.textInput) {
            this.elements.textInput.addEventListener('input', 
                this.debounce(() => this.handleTextInput(), this.debounceDelay)
            );
            
            this.elements.textInput.addEventListener('paste', (e) => {
                setTimeout(() => this.handleTextInput(), 10);
            });
        }

        // 文件输入事件
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => {
                this.handleFileInput(e.target.files[0]);
            });
        }

        // 按钮事件
        if (this.elements.correctTextBtn) {
            this.elements.correctTextBtn.addEventListener('click', () => {
                this.handleCorrectButtonClick();
            });
        }

        if (this.elements.correctFileBtn) {
            this.elements.correctFileBtn.addEventListener('click', () => {
                this.handleFileCorrectButtonClick();
            });
        }

        if (this.elements.removeFileBtn) {
            this.elements.removeFileBtn.addEventListener('click', () => {
                this.handleRemoveFileClick();
            });
        }

        if (this.elements.copyBtn) {
            this.elements.copyBtn.addEventListener('click', () => {
                this.handleCopyButtonClick();
            });
        }

        // 标签页切换
        this.elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        this.elements.resultTabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchResultTab(e.target.dataset.resultTab);
            });
        });

        // 视图模式切换
        this.elements.viewModeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchViewMode(e.target.dataset.viewMode);
            });
        });

        // 错误类型过滤
        this.elements.errorTypeFilters.forEach(filter => {
            filter.addEventListener('change', () => {
                this.updateErrorFilters();
            });
        });

        // 置信度滑块
        if (this.elements.confidenceSlider) {
            this.elements.confidenceSlider.addEventListener('input', 
                this.debounce(() => this.updateConfidenceFilter(), 300)
            );
        }

        // 拖拽上传
        this.setupDragAndDrop();
        
        // 上传区域点击
        if (this.elements.uploadArea) {
            this.elements.uploadArea.addEventListener('click', () => {
                this.elements.fileInput.click();
            });
        }
    }

    /**
     * 设置键盘快捷键
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Enter: 执行纠错
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.handleCorrectButtonClick();
            }
            
            // Ctrl+L: 清空内容
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                this.handleClearButtonClick();
            }
            
            // Esc: 取消当前操作
            if (e.key === 'Escape') {
                this.cancelCurrentOperation();
            }
            
            // 数字键1-3: 切换视图模式
            if (e.key >= '1' && e.key <= '3' && e.altKey) {
                e.preventDefault();
                const modes = ['original', 'corrected', 'split'];
                this.switchViewMode(modes[parseInt(e.key) - 1]);
            }
        });
    }

    /**
     * 初始化工具提示
     */
    initializeTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            this.createTooltip(element);
        });
    }

    /**
     * 设置无障碍访问
     */
    setupAccessibility() {
        // 为按钮添加ARIA标签
        if (this.elements.correctTextBtn) {
            this.elements.correctTextBtn.setAttribute('aria-label', '执行文本纠错');
        }
        
        if (this.elements.correctFileBtn) {
            this.elements.correctFileBtn.setAttribute('aria-label', '执行文件纠错');
        }
        
        // 为输入框添加描述
        if (this.elements.textInput) {
            this.elements.textInput.setAttribute('aria-describedby', 'textInputHelp');
        }
    }

    /**
     * 处理文本输入
     */
    handleTextInput() {
        const text = this.elements.textInput.value;
        this.state.currentText = text;
        
        // 更新字符计数
        this.updateCharacterCount(text.length);
        
        // 验证输入
        if (this.errorHandler) {
            const validation = this.errorHandler.validateInput(text, 'TEXT_CORRECTION');
            this.displayValidationResult(validation);
        }
        
        // 更新按钮状态
        this.updateButtonStates();
        
        // 发布文本变更事件
        if (this.eventBus) {
            this.eventBus.emit('ui:text:changed', { text, length: text.length });
        }
    }

    /**
     * 处理文件输入
     */
    async handleFileInput(file) {
        if (!file) return;
        
        try {
            // 验证文件
            if (this.errorHandler) {
                const validation = this.errorHandler.validateFile(file);
                if (!validation.isValid) {
                    this.showMessage(validation.errors[0].message, 'error');
                    return;
                }
            }
            
            // 显示文件信息
            this.displayFileInfo(file);
            
            // 读取文件内容（如果是文本文件）
            if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
                this.showLoading('正在读取文件...');
                const text = await this.readFileAsText(file);
                this.elements.textInput.value = text;
                this.handleTextInput();
                this.showMessage('文件读取成功', 'success');
                this.hideLoading();
                
                // 切换到文本输入标签页
                this.switchTab('text');
            } else {
                // 对于其他文件类型，准备进行纠错
                this.showMessage('文件已选择，点击开始纠错按钮进行处理', 'info');
            }
            
            this.updateButtonStates();
            
            // 发布文件选择事件
            if (this.eventBus) {
                this.eventBus.emit('ui:file:selected', { file });
            }
            
        } catch (error) {
            this.showMessage('文件处理失败: ' + error.message, 'error');
            this.hideLoading();
        }
    }
    
    /**
     * 显示文件信息
     */
    displayFileInfo(file) {
        if (this.elements.fileName) {
            this.elements.fileName.textContent = file.name;
        }
        
        if (this.elements.fileSize) {
            const size = this.formatFileSize(file.size);
            this.elements.fileSize.textContent = size;
        }
        
        if (this.elements.fileInfo) {
            this.elements.fileInfo.style.display = 'block';
        }
    }
    
    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * 设置拖拽上传
     */
    setupDragAndDrop() {
        if (!this.elements.uploadArea) return;
        
        const uploadArea = this.elements.uploadArea;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('drag-over');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('drag-over');
            }, false);
        });
        
        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.elements.fileInput.files = files;
                this.handleFileInput(files[0]);
            }
        }, false);
    }
    
    /**
     * 阻止默认事件
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * 处理纠错按钮点击
     */
    async handleCorrectButtonClick() {
        if (this.state.isProcessing) return;
        
        const text = this.state.currentText.trim();
        if (!text) {
            this.showMessage('请输入要纠错的文本', 'warning');
            this.elements.textInput.focus();
            return;
        }
        
        // 通过事件总线发起纠错请求
        if (this.eventBus) {
            this.eventBus.emit('text:correct:request', { text, source: 'ui' });
        } else {
            // 降级处理：直接调用纠错方法
            await this.correctText(text);
        }
    }

    /**
     * 处理文件纠错按钮点击
     */
    async handleFileCorrectButtonClick() {
        if (this.state.isProcessing) return;
        
        const file = this.elements.fileInput.files[0];
        if (!file) {
            this.showMessage('请先选择文件', 'warning');
            return;
        }
        
        // 通过事件总线发起文件纠错请求
        if (this.eventBus) {
            this.eventBus.emit('file:correct:request', { file, source: 'ui' });
        } else {
            // 降级处理：直接调用纠错方法
            await this.correctFile(file);
        }
    }

    /**
     * 处理移除文件按钮点击
     */
    handleRemoveFileClick() {
        this.elements.fileInput.value = '';
        this.elements.fileInfo.style.display = 'none';
        this.updateButtonStates();
        this.showMessage('文件已移除', 'info');
    }

    /**
     * 处理复制按钮点击
     */
    async handleCopyButtonClick() {
        if (!this.state.currentResult) {
            this.showMessage('没有可复制的内容', 'warning');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(this.state.currentResult.correctedText);
            this.showMessage('内容已复制到剪贴板', 'success');
        } catch (error) {
            // 降级处理：使用传统方法
            const textArea = document.createElement('textarea');
            textArea.value = this.state.currentResult.correctedText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showMessage('内容已复制到剪贴板', 'success');
        }
    }

    /**
     * 切换主标签页
     */
    switchTab(tabName) {
        // 移除所有活动状态
        this.elements.tabBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // 激活选中的标签页
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-tab`);
        
        if (activeBtn) activeBtn.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
    }

    /**
     * 切换结果标签页
     */
    switchResultTab(tabName) {
        // 移除所有活动状态
        this.elements.resultTabBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.result-content').forEach(content => content.classList.remove('active'));
        
        // 激活选中的标签页
        const activeBtn = document.querySelector(`[data-result-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-result`);
        
        if (activeBtn) activeBtn.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
    }

    /**
     * 执行文本纠错
     */
    async correctText(text) {
        try {
            this.setProcessingState(true);
            this.showLoading('正在进行文本纠错...');
            
            const result = await apiClient.correctText(text);
            const processedResult = textProcessor.processResult(result, text);
            
            this.displayResults(processedResult, text);
            this.showMessage('纠错完成', 'success');
            
        } catch (error) {
            this.showMessage('纠错失败: ' + error.message, 'error');
        } finally {
            this.setProcessingState(false);
            this.hideLoading();
        }
    }

    /**
     * 执行文件纠错
     */
    async correctFile(file) {
        try {
            this.setProcessingState(true);
            this.showLoading('正在进行文件纠错...');
            
            const response = await apiClient.correctFile(file);
            const processedResult = textProcessor.processResult(response.result, response.originalText);
            
            this.displayResults(processedResult, response.originalText);
            this.showMessage('文件纠错完成', 'success');
            
        } catch (error) {
            this.showMessage('文件纠错失败: ' + error.message, 'error');
        } finally {
            this.setProcessingState(false);
            this.hideLoading();
        }
    }

    /**
     * 显示纠错结果
     */
    displayResults(result, originalText) {

        
        this.state.currentResult = result;
        
        // 显示结果容器
        this.elements.resultsContainer.style.display = 'block';
        
        // 显示原文和纠错文本
        this.displayTexts(originalText, result.correctedText, result.errors);
        
        // 显示错误详情
        this.displayErrorDetails(result.errors);
        
        // 显示统计信息
        this.displayStatistics(result.statistics);
        
        // 滚动到结果区域
        this.scrollToResults();
    }

    /**
     * 显示文本对比
     */
    displayTexts(originalText, correctedText, errors) {

        
        // 过滤掉系统信息错误，只显示真实的纠错错误
        const realErrors = errors.filter(error => {
            const isInfoMessage = error.metadata && error.metadata.isInfoMessage;
            return !isInfoMessage;
        });
        
        // 更新对比视图中的原文本
        if (this.elements.originalText) {
            const originalHighlighted = this.highlightErrors(originalText, realErrors, 'original');
            this.elements.originalText.innerHTML = originalHighlighted;
        }
        
        // 更新对比视图中的纠错后文本
        if (this.elements.comparisonCorrectedText) {
            const correctedHighlighted = this.highlightErrors(correctedText, realErrors, 'corrected');
            this.elements.comparisonCorrectedText.innerHTML = correctedHighlighted;
        }
    }

    /**
     * 高亮显示错误
     */
    highlightErrors(text, errors, type) {
        
        // 过滤有效错误（排除信息类消息）
        const validErrors = errors.filter(error => {
            const isInfoMessage = error.metadata && error.metadata.isInfoMessage;
            return !isInfoMessage;
        });
        
        if (!validErrors || validErrors.length === 0) {
            return this.escapeHtml(text);
        }
        
        // 进一步过滤出有效的错误对象
        const finalValidErrors = validErrors.filter(error => {
            return error && typeof error.position === 'number' && error.position >= 0;
        });
        
        if (finalValidErrors.length === 0) {
            return this.escapeHtml(text);
        }
        
        // 不要预先转义整个文本，而是在插入高亮标签时转义具体内容
        let highlightedText = text;
        let highlightCount = 0;
        
        if (type === 'original') {
            // 原文本：使用分段处理确保正确转义
            const sortedErrors = [...finalValidErrors].sort((a, b) => a.position - b.position);
            const segments = [];
            let lastEnd = 0;
            
            sortedErrors.forEach((error, index) => {
                const errorClass = `error-highlight error-${error.type}`;
                const errorId = `error-${index}`;
                const tooltip = this.escapeHtml(`${error.type}: ${error.original || '(空)'} → ${error.corrected || '(删除)'} - ${error.description || ''}`);
                
                const start = error.position;
                // 改进长度计算：如果original为空，使用最小长度1进行高亮
                let length = 0;
                if (error.original && error.original.length > 0) {
                    length = error.original.length;
                } else if (error.length && error.length > 0) {
                    length = error.length;
                } else {
                    // 对于没有original的错误，高亮一个字符位置
                    length = 1;
                }
                const end = start + length;
                
                // 改进边界检查
                if (start >= 0 && start < text.length && end > start && start >= lastEnd) {
                    // 确保end不超过文本长度
                    const safeEnd = Math.min(end, text.length);
                    
                    // 添加前面的普通文本段
                    if (start > lastEnd) {
                        const plainText = text.substring(lastEnd, start);
                        segments.push(this.escapeHtml(plainText));
                    }
                    
                    // 添加高亮的错误文本段
                    const errorText = text.substring(start, safeEnd);
                    if (errorText.length > 0) {
                        const escapedErrorText = this.escapeHtml(errorText);
                        segments.push(`<span class="${errorClass}" data-error-id="${errorId}" title="${tooltip}">${escapedErrorText}</span>`);
                        highlightCount++;
                    }
                    
                    lastEnd = safeEnd;
                }
            });
            
            // 添加最后剩余的普通文本
            if (lastEnd < text.length) {
                const plainText = text.substring(lastEnd);
                segments.push(this.escapeHtml(plainText));
            }
            
            highlightedText = segments.join('');
        } else {
            // 纠错后文本：使用分段处理和位置映射
            const positionMap = this.calculateCorrectedPositions(finalValidErrors);
            const segments = [];
            let lastEnd = 0;
            
            // 按映射后位置排序
            const sortedErrors = [...finalValidErrors]
                .map(error => ({ error, mappedPosition: positionMap.get(error.position) }))
                .filter(item => item.mappedPosition !== undefined)
                .sort((a, b) => a.mappedPosition.start - b.mappedPosition.start);
            
            sortedErrors.forEach(({ error, mappedPosition }, index) => {
                const errorClass = `error-highlight error-${error.type}`;
                const errorId = `error-${index}`;
                const tooltip = this.escapeHtml(`${error.type}: ${error.original || '(空)'} → ${error.corrected || '(删除)'} - ${error.description || ''}`);
                
                const start = mappedPosition.start;
                const end = mappedPosition.end;
                
                // 边界检查
                if (start >= 0 && start <= text.length && end >= start && start >= lastEnd) {
                    const safeEnd = Math.min(end, text.length);
                    
                    // 添加前面的普通文本段
                    if (start > lastEnd) {
                        const plainText = text.substring(lastEnd, start);
                        segments.push(this.escapeHtml(plainText));
                    }
                    
                    if (safeEnd === start) {
                        // 删除操作：插入零宽度标记
                        segments.push(`<span class="${errorClass} deletion-marker" data-error-id="${errorId}" title="${tooltip}"></span>`);
                        highlightCount++;
                    } else {
                        // 替换或添加操作：正常高亮
                        const errorText = text.substring(start, safeEnd);
                        if (errorText.length > 0) {
                            const escapedErrorText = this.escapeHtml(errorText);
                            segments.push(`<span class="${errorClass}" data-error-id="${errorId}" title="${tooltip}">${escapedErrorText}</span>`);
                            highlightCount++;
                        }
                    }
                    
                    lastEnd = safeEnd;
                }
            });
            
            // 添加最后剩余的普通文本
            if (lastEnd < text.length) {
                const plainText = text.substring(lastEnd);
                segments.push(this.escapeHtml(plainText));
            }
            
            highlightedText = segments.join('');
        }
        

        
        // 简化处理：如果有高亮，直接返回（因为我们已经在插入时转义了）
        // 如果没有高亮，转义整个文本
        if (highlightCount === 0) {
            return this.escapeHtml(highlightedText);
        }
        
        return highlightedText;
    }

    /**
     * 计算纠错后文本中每个错误的正确位置
     * @param {Array} errors - 错误数组
     * @returns {Map} 位置映射表
     */
    calculateCorrectedPositions(errors) {
        const positionMap = new Map();
        
        // 按位置从前往后排序，计算累积偏移
        const sortedErrors = [...errors].sort((a, b) => a.position - b.position);
        let cumulativeOffset = 0;
        
        sortedErrors.forEach(error => {
            // 跳过无效的错误对象
            if (!error || typeof error.position !== 'number') {

                return;
            }
            
            const originalStart = error.position;
            const correctedStart = originalStart + cumulativeOffset;
            
            let correctedEnd;
            let lengthChange = 0;
            
            // 获取原始文本长度
            const originalLength = error.original ? error.original.length : (error.length || 0);
            // 获取纠正后文本长度
            const correctedLength = error.corrected ? error.corrected.length : 0;
            
            if (error.original && (error.corrected || error.corrected === '')) {
                // 替换操作（包括corrected为空字符串的情况，如idm类型）
                correctedEnd = correctedStart + correctedLength;
                lengthChange = correctedLength - originalLength;
            } else if (!error.original && error.corrected) {
                // 添加操作
                correctedEnd = correctedStart + correctedLength;
                lengthChange = correctedLength;
            } else if (error.original && error.corrected === undefined) {
                // 删除操作（只有当corrected为undefined时才是真正的删除）
                correctedEnd = correctedStart;
                lengthChange = -originalLength;
            } else {
                // 无变化或特殊情况：至少高亮一个字符位置
                correctedEnd = correctedStart + 1;
                lengthChange = 0;
            }
            
            positionMap.set(originalStart, {
                start: correctedStart,
                end: correctedEnd
            });
            
            cumulativeOffset += lengthChange;
        });
        
        return positionMap;
    }

    /**
     * 显示错误详情
     */
    displayErrorDetails(errors) {
        if (!this.elements.errorDetails) return;
        
        if (!errors || errors.length === 0) {
            this.elements.errorDetails.innerHTML = '<p class="no-errors">未发现需要纠正的错误，文本质量良好！</p>';
            return;
        }
        
        // 检查是否只有系统信息
        const hasRealErrors = errors.some(error => !error.metadata?.isInfoMessage);
        
        if (!hasRealErrors && errors.length === 1 && errors[0].metadata?.isInfoMessage) {
            // 只有系统信息，显示特殊样式
            this.elements.errorDetails.innerHTML = `
                <div class="system-info">
                    <div class="info-icon">✅</div>
                    <div class="info-message">${this.escapeHtml(errors[0].description)}</div>
                </div>`;
            return;
        }
        
        const errorsByType = this.groupErrorsByType(errors);
        let html = '<div class="error-summary">';
        
        Object.entries(errorsByType).forEach(([type, typeErrors]) => {
            const config = this.config.ERROR_TYPES[type] || {};
            const displayName = config.displayName || type;
            
            html += `
                <div class="error-type-section">
                    <h4 class="error-type-title" style="color: ${config.color || '#333'}">
                        ${displayName} (${typeErrors.length})
                    </h4>
                    <div class="error-list">`;
            
            typeErrors.forEach((error, index) => {
                html += `
                    <div class="error-item" data-error-type="${type}" data-error-index="${index}">
                        <div class="error-header">
                            <span class="error-position">位置: ${error.position}</span>
                            <span class="error-type-badge" style="background-color: ${config.color || '#ccc'}">${displayName}</span>
                        </div>
                        <div class="error-content">
                            <div class="error-text-change">
                                <span class="error-original">${this.escapeHtml(error.original || '(空)')}</span>
                                <span class="error-arrow">→</span>
                                <span class="error-corrected">${this.escapeHtml(error.corrected || '(删除)')}</span>
                            </div>
                        </div>
                        <div class="error-description-wrapper">
                            <span class="error-description-label">详细说明:</span>
                            <span class="error-description">${this.escapeHtml(this.getErrorTypeDescription(error.type, error.description))}</span>
                        </div>
                        ${error.confidence ? `<div class="error-confidence">置信度: ${(error.confidence * 100).toFixed(1)}%</div>` : ''}
                    </div>`;
            });
            
            html += '</div></div>';
        });
        
        html += '</div>';
        this.elements.errorDetails.innerHTML = html;
        
        // 绑定错误项点击事件
        this.bindErrorItemEvents();
    }

    /**
     * 绑定错误项点击事件
     */
    bindErrorItemEvents() {
        const errorItems = this.elements.errorDetails.querySelectorAll('.error-item');
        errorItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                // 高亮对应的错误位置
                const errorType = item.dataset.errorType;
                const errorIndex = parseInt(item.dataset.errorIndex);
                
                // 切换选中状态
                item.classList.toggle('selected');
                
                // 可以在这里添加更多交互逻辑，比如滚动到对应位置等
            });
        });
    }

    /**
     * 显示统计信息
     */
    displayStatistics(statistics) {
        if (!this.elements.statisticsContainer) return;
        
        const html = `
            <div class="statistics-grid">
                <div class="stat-item">
                    <div class="stat-value">${statistics.totalErrors}</div>
                    <div class="stat-label">总错误数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${statistics.correctionRate}</div>
                    <div class="stat-label">纠正率</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${statistics.textSimilarity}</div>
                    <div class="stat-label">文本相似度</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${statistics.originalLength}</div>
                    <div class="stat-label">原文长度</div>
                </div>
            </div>
            <div class="error-type-stats">
                ${Object.entries(statistics.errorsByType).map(([type, count]) => {
                    const config = this.config.ERROR_TYPES[type] || {};
                    return `<span class="error-type-badge" style="background-color: ${config.color || '#ccc'}">
                        ${config.displayName || type}: ${count}
                    </span>`;
                }).join('')}
            </div>`;
        
        this.elements.statisticsContainer.innerHTML = html;
    }

    /**
     * 获取错误类型的用户友好描述
     */
    getErrorTypeDescription(errorType, originalDescription) {
        // 使用textProcessor的官方规范描述方法
        if (window.textProcessor && window.textProcessor.getOfficialErrorDescription) {
            return window.textProcessor.getOfficialErrorDescription(errorType, originalDescription);
        }
        
        // 降级处理：使用配置中的描述
        const config = this.config.ERROR_TYPES[errorType];
        if (config && config.description) {
            return config.description;
        }
        
        // 最后降级：使用原始描述或错误类型
        return originalDescription || errorType;
    }

    /**
     * 工具函数
     */
    
    // 防抖函数
    debounce(func, delay) {
        return (...args) => {
            const key = func.toString();
            clearTimeout(this.debounceTimers.get(key));
            this.debounceTimers.set(key, setTimeout(() => func.apply(this, args), delay));
        };
    }
    
    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 转义未被高亮标签包围的文本部分
     * @param {string} html - 包含高亮标签的HTML字符串
     * @returns {string} 转义后的HTML字符串
     */
    escapeUnhighlightedText(html) {
        // 创建一个临时DOM元素来解析HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // 递归处理所有文本节点
        const processNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                // 文本节点：转义内容
                const escapedText = this.escapeHtml(node.textContent);
                const span = document.createElement('span');
                span.innerHTML = escapedText;
                node.parentNode.replaceChild(span.firstChild || document.createTextNode(''), node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // 元素节点：检查是否是高亮标签
                if (node.tagName === 'SPAN' && 
                    (node.classList.contains('error-highlight') || node.classList.contains('deletion-marker'))) {
                    // 高亮标签：不处理其内容（已经转义过了）
                    return;
                } else {
                    // 其他元素：递归处理子节点
                    const children = Array.from(node.childNodes);
                    children.forEach(child => processNode(child));
                }
            }
        };
        
        // 处理所有子节点
        const children = Array.from(tempDiv.childNodes);
        children.forEach(child => processNode(child));
        
        return tempDiv.innerHTML;
    }
    
    // 按类型分组错误
    groupErrorsByType(errors) {
        return errors.reduce((groups, error) => {
            if (!groups[error.type]) {
                groups[error.type] = [];
            }
            groups[error.type].push(error);
            return groups;
        }, {});
    }
    
    // 设置处理状态
    setProcessingState(isProcessing) {
        this.state.isProcessing = isProcessing;
        this.updateButtonStates();
    }
    
    // 更新按钮状态
    updateButtonStates() {
        if (this.elements.correctTextBtn) {
            this.elements.correctTextBtn.disabled = this.state.isProcessing || !this.state.currentText.trim();
        }
        
        if (this.elements.correctFileBtn) {
            this.elements.correctFileBtn.disabled = this.state.isProcessing || !this.elements.fileInput.files.length;
        }
    }
    
    // 显示消息
    showMessage(message, type = 'info') {
        this.displayMessage(message, type);
    }
    
    // 显示消息的具体实现
    displayMessage(message, type = 'info') {
        // 移除现有的消息
        const existingMessages = document.querySelectorAll('.ui-message');
        existingMessages.forEach(msg => msg.remove());
        
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `ui-message ui-message-${type}`;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            z-index: 10001;
            max-width: 350px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
            transform: translateX(100%);
            opacity: 0;
        `;
        
        // 设置样式
        const styles = {
            error: { bg: '#e53e3e', border: '#c53030' },
            warning: { bg: '#dd6b20', border: '#c05621' },
            success: { bg: '#38a169', border: '#2f855a' },
            info: { bg: '#3182ce', border: '#2c5282' }
        };
        
        const style = styles[type] || styles.info;
        messageEl.style.backgroundColor = style.bg;
        messageEl.style.borderLeft = `4px solid ${style.border}`;
        
        // 添加图标
        const icons = {
            error: '❌',
            warning: '⚠️',
            success: '✅',
            info: 'ℹ️'
        };
        
        const icon = icons[type] || icons.info;
        messageEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">${icon}</span>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 4px;
            right: 8px;
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.7;
            transition: opacity 0.2s ease;
        `;
        
        closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '1');
        closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = '0.7');
        closeBtn.addEventListener('click', () => this.removeMessage(messageEl));
        
        messageEl.appendChild(closeBtn);
        
        // 添加到页面
        document.body.appendChild(messageEl);
        
        // 动画显示
        requestAnimationFrame(() => {
            messageEl.style.transform = 'translateX(0)';
            messageEl.style.opacity = '1';
        });
        
        // 自动移除（错误消息5秒，其他3秒）
        const autoRemoveDelay = type === 'error' ? 5000 : 3000;
        setTimeout(() => {
            this.removeMessage(messageEl);
        }, autoRemoveDelay);
        
        // 记录到控制台
        console.log(`[UIManager] ${type.toUpperCase()}: ${message}`);
    }
    
    // 移除消息
    removeMessage(messageEl) {
        if (messageEl && messageEl.parentNode) {
            messageEl.style.transform = 'translateX(100%)';
            messageEl.style.opacity = '0';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }
    }
    
    // 显示加载指示器
    showLoading(message = '处理中...') {
        this.elements.loadingIndicator.textContent = message;
        this.elements.loadingIndicator.style.display = 'block';
    }
    
    // 隐藏加载指示器
    hideLoading() {
        this.elements.loadingIndicator.style.display = 'none';
    }
    
    // 清空所有内容
    clearAll() {
        if (this.elements.textInput) this.elements.textInput.value = '';
        if (this.elements.fileInput) this.elements.fileInput.value = '';
        if (this.elements.resultsContainer) this.elements.resultsContainer.style.display = 'none';
        
        this.state.currentText = '';
        this.state.currentResult = null;
        this.updateButtonStates();
    }
    
    // 创建消息容器
    createMessageContainer() {
        const container = document.createElement('div');
        container.id = 'messageContainer';
        container.className = 'message-container';
        document.body.appendChild(container);
        return container;
    }
    
    // 创建加载指示器
    createLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'loadingIndicator';
        indicator.className = 'loading-indicator';
        indicator.style.display = 'none';
        document.body.appendChild(indicator);
        return indicator;
    }
    
    // 其他辅助方法...
    scrollToResults() {
        this.elements.resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    updateCharacterCount(count) {
        if (this.elements.charCount) {
            this.elements.charCount.textContent = count;
        }
        
        const counter = document.getElementById('characterCount');
        if (counter) {
            counter.textContent = `${count}/${CONFIG.UI.MAX_TEXT_LENGTH}`;
        }
    }
    
    // 读取文件为文本
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('文件读取失败'));
            reader.readAsText(file, 'UTF-8');
        });
    }
}

// 创建全局UI管理器实例
const uiManager = new UIManager();

// 导出UI管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else {
    window.UIManager = UIManager;
    window.uiManager = uiManager;
}