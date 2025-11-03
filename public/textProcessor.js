// 文本处理工具模块 - 提供文本分析、格式化和纠错结果处理功能
class TextProcessor {
    constructor() {
        this.maxTextLength = CONFIG.UI.MAX_TEXT_LENGTH;
        this.errorTypes = CONFIG.ERROR_TYPES;
        this.config = CONFIG || {};

        // 移除外部缓存依赖，使用轻量内置空实现
        this.cache = {
            get: () => null,
            set: () => {},
            generateKey: (...args) => JSON.stringify(args)
        };

        // 性能配置
        this.batchSize = this.config.UI?.PERFORMANCE?.BATCH_SIZE || 100;
        this.throttleDelay = this.config.UI?.PERFORMANCE?.DOM_UPDATE_THROTTLE || 16;

        // 节流相关
        this.throttleTimers = new Map();
        this.pendingUpdates = new Map();

        // 移除外部 UX 依赖，使用空实现
        this.uxManager = {
            showFeedback: () => {},
            startProgress: () => {},
            updateProgress: () => {},
            completeProgress: () => {},
            updateStatistics: () => {}
        };


    }

    /**
     * 处理纠错结果
     * @param {Object} result - API返回的纠错结果
     * @param {string} originalText - 原始文本
     * @returns {Object} 处理后的结果
     */
    processResult(result, originalText) {
        try {


            // 检查是否有错误
            if (!result) {
                return {
                    correctedText: originalText,
                    errors: [],
                    statistics: this.generateStatistics(originalText, originalText, [])
                };
            }

            // 处理科大讯飞API的响应格式
            let correctionData = null;

            // 检查payload.result.text格式（科大讯飞API格式）
            if (result.payload && result.payload.result && result.payload.result.text) {
                try {
                    correctionData = JSON.parse(result.payload.result.text);

                } catch (parseError) {

                    return {
                        correctedText: originalText,
                        errors: [],
                        statistics: this.generateStatistics(originalText, originalText, [])
                    };
                }
            }
            // 检查直接的ws格式
            else if (result.ws) {
                correctionData = result;
            }
            // 检查科大讯飞直接格式（包含char、punc等字段）
            else if (result.char || result.punc || result.word || result.grammar_pc) {
                correctionData = result;

            }
            // 如果没有找到有效的纠错数据
            else {

                // 添加一个提示信息，表示检查完成但未发现错误
                const noErrorInfo = [{
                    type: '检查完成',
                    position: 0,
                    length: 0,
                    original: '',
                    corrected: '',
                    description: '未发现需要纠正的错误，文本质量良好！',
                    confidence: 1.0,
                    severity: 'info',
                    color: '#28a745',
                    metadata: {
                        source: 'system',
                        isInfoMessage: true
                    }
                }];
                return {
                    correctedText: originalText,
                    errors: noErrorInfo,
                    statistics: this.generateStatistics(originalText, originalText, [])
                };
            }

            // 处理纠错数据（ws格式或科大讯飞格式）
            const processedData = this.processWsFormat(correctionData.ws || correctionData);

            // 如果没有发现错误，添加提示信息
            if (processedData.errors.length === 0) {
                processedData.errors.push({
                    type: '检查完成',
                    position: 0,
                    length: 0,
                    original: '',
                    corrected: '',
                    description: '未发现需要纠正的错误，文本质量良好！',
                    confidence: 1.0,
                    severity: 'info',
                    color: '#28a745',
                    metadata: {
                        source: 'system',
                        isInfoMessage: true
                    }
                });
            }

            // 应用纠正
            const correctedText = this.applyCorrections(originalText, processedData.errors.filter(e => !e.metadata?.isInfoMessage));

            // 生成统计信息
            const statistics = this.generateStatistics(originalText, correctedText, processedData.errors.filter(e => !e.metadata?.isInfoMessage));



            return {
                correctedText,
                errors: processedData.errors,
                statistics,
                metadata: {
                    processingTime: Date.now(),
                    originalLength: originalText.length,
                    correctedLength: correctedText.length,
                    errorCount: processedData.errors.length
                }
            };
        } catch (error) {

            errorHandler.handleError(error, 'RESULT_PROCESSING');

            return {
                correctedText: originalText,
                errors: [],
                statistics: this.generateStatistics(originalText, originalText, []),
                error: error.message
            };
        }
    }

    /**
     * 处理ws格式的数据或科大讯飞格式的数据
     * @param {Array|Object} data - ws数组或科大讯飞格式数据
     * @returns {Object} 处理后的数据
     */
    processWsFormat(data) {
        const errors = [];

        // 如果是数组格式（传统ws格式）
        if (Array.isArray(data)) {
            let currentPosition = 0;

            data.forEach((ws, wsIndex) => {
                if (ws.cw && Array.isArray(ws.cw)) {
                    ws.cw.forEach((cw, cwIndex) => {
                        const wordLength = cw.w ? cw.w.length : 0;

                        // 处理各种错误类型
                        Object.keys(this.errorTypes).forEach(errorType => {
                            if (cw[errorType] && Array.isArray(cw[errorType])) {
                                cw[errorType].forEach((errorItem, errorIndex) => {
                                    const error = this.createErrorObject(
                                        errorType,
                                        errorItem,
                                        currentPosition,
                                        wordLength,
                                        {
                                            wsIndex,
                                            cwIndex,
                                            errorIndex,
                                            originalWord: cw.w
                                        }
                                    );

                                    if (error) {
                                        errors.push(error);
                                    }
                                });
                            }
                        });

                        currentPosition += wordLength;
                    });
                }
            });
        }
        // 如果是科大讯飞格式（对象格式）
        else if (typeof data === 'object' && data !== null) {


            // 处理各种错误类型
            Object.keys(data).forEach(errorType => {
                if (Array.isArray(data[errorType]) && data[errorType].length > 0) {

                    data[errorType].forEach((errorItem, errorIndex) => {
                        const error = this.createXunfeiErrorObject(
                            errorType,
                            errorItem,
                            errorIndex
                        );

                        if (error) {
                            errors.push(error);
                        }
                    });
                }
            });
        }

        // 按位置排序，从后往前应用纠正
        errors.sort((a, b) => b.position - a.position);


        return { errors };
    }

    /**
     * 创建错误对象
     * @param {string} errorType - 错误类型
     * @param {Array|Object} errorItem - 错误项
     * @param {number} position - 位置
     * @param {number} length - 长度
     * @param {Object} metadata - 元数据
     * @returns {Object|null} 错误对象
     */
    createErrorObject(errorType, errorItem, position, length, metadata) {
        const errorConfig = this.errorTypes[errorType];
        if (!errorConfig) {

            return null;
        }

        let pos, cur, correct, description, confidence;

        if (Array.isArray(errorItem)) {
            // 新格式: [pos, cur, correct, description]
            [pos, cur, correct, description] = errorItem;
            confidence = null;
        } else if (typeof errorItem === 'object') {
            // 对象格式
            pos = errorItem.pos || 0;
            cur = errorItem.cur || errorItem.ori_fragment || '';
            correct = errorItem.correct || errorItem.cor_fragment || '';
            description = errorItem.description || errorItem.desc || '';
            confidence = errorItem.confidence || errorItem.conf;
        } else {

            return null;
        }

        // 计算绝对位置
        const absolutePosition = position + (pos || 0);

        return {
            type: errorType,
            position: absolutePosition,
            length: cur ? cur.length : length,
            original: cur || '',
            corrected: correct || '',
            description: description || errorConfig.description,
            confidence: confidence,
            severity: errorConfig.priority || 'medium',
            color: errorConfig.color || '#ff6b6b',
            metadata: {
                ...metadata,
                errorConfig
            }
        };
    }

    /**
     * 节流函数 - 优化DOM更新性能
     * @param {string} key - 节流键
     * @param {Function} fn - 要执行的函数
     * @param {number} delay - 延迟时间（毫秒）
     */
    throttle(key, fn, delay = this.throttleTime) {
        // 如果有待执行的更新，先取消
        if (this.throttleTimers.has(key)) {
            clearTimeout(this.throttleTimers.get(key));
        }

        // 设置新的定时器
        const timer = setTimeout(() => {
            fn();
            this.throttleTimers.delete(key);
            this.pendingUpdates.delete(key);
        }, delay);

        this.throttleTimers.set(key, timer);
        this.pendingUpdates.set(key, fn);
    }

    /**
     * 批量更新DOM - 减少重排重绘
     * @param {Array} updates - 更新操作数组
     */
    batchDOMUpdate(updates) {
        // 使用 requestAnimationFrame 确保在下一帧执行
        requestAnimationFrame(() => {
            // 批量执行DOM更新
            updates.forEach(update => {
                if (typeof update === 'function') {
                    update();
                }
            });
        });
    }

    /**
     * 验证错误项的数据格式
     * @param {Array} errorItem - 错误项数组
     * @returns {boolean} - 验证结果
     */
    validateErrorItem(errorItem) {
        // 尝试从缓存获取验证结果
        const cacheKey = this.cache.generateKey('validation', errorItem);
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        const result = {
            isValid: false,
            errors: [],
            warnings: []
        };

        const rules = this.config.DATA_FORMAT?.VALIDATION_RULES || {};

        if (!Array.isArray(errorItem)) {
            result.errors.push('错误项必须是数组格式');
            this.cache.set(cacheKey, result, 60000); // 缓存1分钟
            return result;
        }

        const minLength = rules.MIN_ARRAY_LENGTH || 3;
        const maxLength = rules.MAX_ARRAY_LENGTH || 5;

        if (errorItem.length < minLength) {
            result.errors.push(`错误项数组长度不足，期望至少${minLength}个元素，实际${errorItem.length}个`);
        }

        if (errorItem.length > maxLength) {
            result.warnings.push(`错误项数组长度超出建议范围，建议不超过${maxLength}个元素`);
        }

        const [position, original, corrected] = errorItem;
        const positionMin = rules.POSITION_MIN || 0;
        const textMaxLength = rules.TEXT_MAX_LENGTH || 1000;

        // 验证位置
        if (typeof position !== 'number' || position < positionMin) {
            result.errors.push(`位置信息无效: ${position}，应为大于等于${positionMin}的数字`);
        }

        // 验证原文本和纠正文本
        // 修改验证逻辑：允许corrected为空字符串（删除操作），但不允许同时为undefined
        if (original === undefined && corrected === undefined) {
            result.errors.push('原文本和纠正文本不能同时为undefined');
        }

        // 对于某些特殊情况，允许corrected为空字符串
        if (original === undefined && corrected === '') {
            result.warnings.push('原文本为undefined但纠正文本为空字符串，请确认这是预期的删除操作');
        }

        // 验证文本长度
        if (original && original.length > textMaxLength) {
            result.warnings.push(`原文本长度超出建议范围: ${original.length} > ${textMaxLength}`);
        }

        if (corrected && corrected.length > textMaxLength) {
            result.warnings.push(`纠正文本长度超出建议范围: ${corrected.length} > ${textMaxLength}`);
        }

        if (errorItem.length === 3) {
            result.warnings.push('缺少第4个元素（描述或类型标识）');
        }

        result.isValid = result.errors.length === 0;

        // 缓存验证结果
        this.cache.set(cacheKey, result, 300000); // 缓存5分钟

        return result;
    }

    /**
     * 批量处理错误项
     * @param {Array} errorItems - 错误项数组
     * @param {string} errorType - 错误类型
     * @returns {Array} 处理后的错误对象数组
     */
    processBatch(errorItems, errorType) {
        const results = [];
        const batchSize = this.batchSize;



        for (let i = 0; i < errorItems.length; i += batchSize) {
            const batch = errorItems.slice(i, i + batchSize);
            const batchResults = batch.map((item, index) =>
                this.createXunfeiErrorObject(errorType, item, i + index)
            ).filter(item => item !== null);

            results.push(...batchResults);

            // 如果不是最后一批，添加微任务延迟以避免阻塞UI
            if (i + batchSize < errorItems.length) {
                setTimeout(() => { }, 0);
            }
        }


        return results;
    }

    /**
     * 处理讯飞返回的错误数据
     * @param {Array} errors - 错误数组
     * @returns {Array} - 处理后的错误对象数组
     */
    processErrors(errors) {
        if (!Array.isArray(errors)) {
            this.uxManager.showFeedback('输入数据格式错误', 'error');
            return [];
        }

        // 开始进度跟踪
        const startTime = Date.now();
        this.uxManager.startProgress(errors.length, '处理错误数据');

        const processedErrors = [];

        for (let i = 0; i < errors.length; i++) {
            const errorItem = errors[i];
            try {
                const processedError = this.createXunfeiErrorObject(errorItem);
                if (processedError) {
                    processedErrors.push(processedError);
                }

                // 更新进度
                this.uxManager.updateProgress(i + 1, errors.length);

            } catch (error) {

                this.uxManager.showFeedback(`处理第${i + 1}项时出错: ${error.message}`, 'warning');
            }
        }

        // 完成进度跟踪
        this.uxManager.completeProgress();

        // 更新统计信息
        const processingTime = Date.now() - startTime;
        this.uxManager.updateStatistics(processedErrors, processingTime);



        // 显示处理结果反馈
        if (processedErrors.length > 0) {
            this.uxManager.showFeedback(`成功处理 ${processedErrors.length} 个错误项`, 'success');
        } else {
            this.uxManager.showFeedback('未发现有效的错误项', 'info');
        }

        return processedErrors;
    }

    /**
     * 创建科大讯飞格式的错误对象
     * @param {string} errorType - 错误类型
     * @param {Array} errorItem - 错误项 [position, original, corrected, description/type]
     * @param {number} errorIndex - 错误索引
     * @returns {Object|null} 错误对象
     */
    createXunfeiErrorObject(errorType, errorItem, errorIndex) {


        // 数据验证
        const validation = this.validateErrorItem(errorItem);
        if (!validation.isValid) {

            return null;
        }

        if (validation.warnings.length > 0) {

        }

        const errorConfig = this.errorTypes[errorType] || {
            description: errorType,
            priority: 'medium',
            color: '#ff6b6b',
            fourthElementType: 'description'
        };

        const [position, original, corrected, fourthElement] = errorItem;

        // 根据官方API文档text字段参数说明表处理错误类型描述
        let description = this.getOfficialErrorDescription(errorType, fourthElement);
        let actualErrorType = errorType;



        // 特殊处理各种错误类型
        let finalOriginal = original || '';
        let finalCorrected = corrected || '';
        let finalPosition = position || 0;



        // 调试日志：记录纠正过程


        // 特别记录"足不初户"错误的处理


        // 获取配置信息
        const actualErrorConfig = this.errorTypes[actualErrorType] || errorConfig;
        const hasEmptyCorrection = actualErrorConfig.hasEmptyCorrection;
        const emptyTypes = this.config.DATA_FORMAT?.EMPTY_CORRECTION_TYPES || [];

        // 句末句号缺失的处理逻辑已被移除
        // 处理可能有空纠正结果的错误类型
        if (hasEmptyCorrection || emptyTypes.includes(actualErrorType)) {
            // 对于miss、order、lx_word、lx_char、dapei等类型，纠错后可能为空
            if (!corrected || corrected === '') {

                // 保持原始设置，但标记为无纠正结果
                finalCorrected = '';
            }
        }

        return {
            type: actualErrorType,
            position: finalPosition,
            length: finalOriginal ? finalOriginal.length : 0,
            original: finalOriginal,
            corrected: finalCorrected,
            description: description,
            confidence: null,
            severity: errorConfig.priority || 'medium',
            color: errorConfig.color || '#ff6b6b',
            metadata: {
                errorIndex,
                errorConfig,
                source: 'xunfei',
                rawData: errorItem,
                fourthElement
            }
        };
    }

    /**
     * 应用纠正到文本
     * @param {string} text - 原始文本
     * @param {Array} errors - 错误数组
     * @returns {string} 纠正后的文本
     */
    applyCorrections(text, errors) {
        let correctedText = text;

        // 错误已按位置从后往前排序
        errors.forEach(error => {


            // 修复条件：应该应用纠正的情况包括：
            // 1. corrected不为空且与original不同
            // 2. corrected不为空且original为空（添加操作）
            // 3. corrected为空但original不为空（删除操作）
            // 4. 对于特殊类型（如lx_word、lx_char等），即使corrected为空也可能需要处理
            const emptyTypes = this.config.DATA_FORMAT?.EMPTY_CORRECTION_TYPES || [];
            const isEmptyType = emptyTypes.includes(error.type);

            const shouldApplyCorrection =
                (error.corrected !== undefined && error.corrected !== error.original) ||
                (error.corrected && !error.original) ||
                (!error.corrected && error.original) ||
                (isEmptyType && error.corrected === '') || // 特殊处理空纠正结果类型
                (error.type === 'idm' && error.corrected !== undefined); // 特殊处理idm类型

            if (shouldApplyCorrection) {
                const start = error.position;
                let end;

                // 根据不同情况计算结束位置
                if (!error.original && error.corrected) {
                    // 添加操作：在指定位置插入，不替换任何字符
                    end = start;
                } else {
                    // 替换或删除操作：使用原始文本的长度
                    end = start + (error.length || error.original.length || 0);
                }

                // 验证位置有效性
                if (start >= 0 && start <= correctedText.length && end >= start && end <= correctedText.length) {

                    correctedText =
                        correctedText.substring(0, start) +
                        (error.corrected || '') +
                        correctedText.substring(end);

                } else {

                }
            }
        });

        return correctedText;
    }

    /**
     * 生成统计信息
     * @param {string} originalText - 原始文本
     * @param {string} correctedText - 纠正后文本
     * @param {Array} errors - 错误数组
     * @returns {Object} 统计信息
     */
    generateStatistics(originalText, correctedText, errors) {
        const errorsByType = {};
        const severityCount = { high: 0, medium: 0, low: 0 };

        errors.forEach(error => {
            // 按类型统计
            if (!errorsByType[error.type]) {
                errorsByType[error.type] = 0;
            }
            errorsByType[error.type]++;

            // 按严重程度统计
            if (severityCount[error.severity] !== undefined) {
                severityCount[error.severity]++;
            }
        });

        return {
            originalLength: originalText.length,
            correctedLength: correctedText.length,
            totalErrors: errors.length,
            errorsByType,
            severityCount,
            correctionRate: errors.length > 0 ?
                (errors.filter(e => e.corrected !== e.original).length / errors.length * 100).toFixed(1) + '%' : '0%',
            textSimilarity: this.calculateSimilarity(originalText, correctedText)
        };
    }

    /**
     * 计算文本相似度
     * @param {string} text1 - 文本1
     * @param {string} text2 - 文本2
     * @returns {string} 相似度百分比
     */
    calculateSimilarity(text1, text2) {
        if (text1 === text2) return '100%';
        if (!text1 || !text2) return '0%';

        const maxLength = Math.max(text1.length, text2.length);
        const distance = this.levenshteinDistance(text1, text2);
        const similarity = ((maxLength - distance) / maxLength * 100).toFixed(1);

        return similarity + '%';
    }

    /**
     * 计算编辑距离
     * @param {string} str1 - 字符串1
     * @param {string} str2 - 字符串2
     * @returns {number} 编辑距离
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * 文本预处理
     * @param {string} text - 原始文本
     * @returns {Object} 预处理结果
     */
    preprocessText(text) {
        if (!text || typeof text !== 'string') {
            return {
                processedText: '',
                warnings: ['文本为空或格式无效']
            };
        }

        const warnings = [];
        let processedText = text;

        // 长度检查
        if (text.length > this.maxTextLength) {
            processedText = text.substring(0, this.maxTextLength);
            warnings.push(`文本过长，已截取前${this.maxTextLength}个字符`);
        }

        // 清理特殊字符（可选）
        const originalLength = processedText.length;
        processedText = processedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        if (processedText.length !== originalLength) {
            warnings.push('已移除不可见控制字符');
        }

        return {
            processedText,
            warnings,
            metadata: {
                originalLength: text.length,
                processedLength: processedText.length,
                truncated: text.length > this.maxTextLength
            }
        };
    }

    /**
     * 格式化错误信息用于显示
     * @param {Object} error - 错误对象
     * @returns {string} 格式化的错误信息
     */
    formatErrorForDisplay(error) {
        const parts = [];

        // 修复：对于删除操作，corrected可能为空字符串，这是合法的
        if (error.original !== undefined && error.corrected !== undefined) {
            if (error.corrected === '') {
                // 删除操作：显示删除的内容
                parts.push(`删除 "${error.original}"`);
            } else if (error.original === '') {
                // 添加操作：显示添加的内容
                parts.push(`添加 "${error.corrected}"`);
            } else {
                // 替换操作：显示原文到纠正文本的转换
                parts.push(`"${error.original}" → "${error.corrected}"`);
            }
        }

        if (error.description) {
            parts.push(error.description);
        }

        if (error.confidence) {
            parts.push(`置信度: ${(error.confidence * 100).toFixed(1)}%`);
        }

        return parts.join(' | ');
    }

    /**
     * 获取错误类型的显示名称
     * @param {string} errorType - 错误类型
     * @returns {string} 显示名称
     */
    getErrorTypeDisplayName(errorType) {
        const config = this.errorTypes[errorType];
        return config ? config.displayName : errorType;
    }

    /**
     * 根据官方API文档text字段参数说明表获取错误描述
     * @param {string} errorType - 错误类型
     * @param {string} fourthElement - 第四个元素（类型标识或描述）
     * @returns {string} 官方规范的错误描述
     */
    getOfficialErrorDescription(errorType, fourthElement) {
        // 根据官方API文档text字段参数说明表的【类型】字段映射
        const officialTypeDescriptions = {
            // black_list - 黑名单纠错
            'black_list': {
                'blacklist': '黑名单错误',
                'default': '黑名单纠错'
            },

            // pol - 政治术语纠错
            'pol': {
                'pol': '政治术语错误',
                'default': '政治术语纠错'
            },

            // char - 别字纠错
            'char': {
                'char': '别字错误',
                'default': '别字纠错：单个字符的错误纠正'
            },

            // word - 别词纠错
            'word': {
                'word': '别词错误',
                'default': '别词纠错：词语使用错误的纠正'
            },

            // redund - 语法纠错-冗余
            'redund': {
                'redund': '冗余错误',
                'default': '冗余纠错：删除多余、重复的字符或词语'
            },

            // miss - 语法纠错-缺失
            'miss': {
                'miss': '缺失错误',
                'default': '缺失纠错：补充遗漏的字符或词语'
            },

            // order - 语法纠错-语序
            'order': {
                'lx_word': '词级别乱序纠错',
                'lx_char': '字级别乱序纠错',
                'default': '语序纠错：调整词语或字符的排列顺序'
            },

            // dapei - 搭配纠错
            'dapei': {
                'dapei': '搭配错误',
                'default': '搭配纠错：词语搭配使用不当的纠正'
            },

            // punc - 标点纠错
            'punc': {
                'default': '标点纠错：标点符号使用错误的纠正',
                'types': {
                    '半角标点误用成对符号不匹配': '半角标点误用成对符号不匹配',
                    '重复标点': '重复标点',
                    '连续使用标点': '连续使用标点符号',
                    '顿号使用不当': '顿号使用不当',
                    '省略号使用不当': '省略号使用不当',
                    '连接号使用不当': '连接号使用不当',
                    '标示发文年号不规范': '标示发文年号不规范',
                    '疑似省略号误用': '疑似省略号误用',
                    '书名号内顿号使用不当': '书名号内顿号使用不当',
                    '疑似标点错误': '疑似标点错误'
                }
            },

            // idm - 成语纠错
            'idm': {
                'idm': '成语纠错',
                'default': '成语纠错'
            },

            // org - 机构名纠错
            'org': {
                'org_R': 'org_R-机构名字词冗余',
                'org_M': 'org_M-机构名字词缺失',
                'org_S': 'org_S-机构名字词错误',
                'org_P': 'org_P-机构名字词错序',
                'default': '机构名纠错：机构名称错误的纠正'
            },

            // leader - 领导人职称纠错
            'leader': {
                'lea_P': '领导人职称纠错',
                'default': '领导人职称纠错：领导人姓名或职称错误的纠正'
            },

            // number - 数字纠错
            'number': {
                'time': '时间纠错',
                'date-m': '日期纠错（月份）',
                'date-d': '日期纠错（日）',
                'default': '数字纠错：数值、时间、日期等数字信息的纠正'
            },

            // addr - 地名纠错
            'addr': {
                'addr_R': '地名字词冗余',
                'addr_M': '地名字词缺失',
                'addr_S': '地名字词错误',
                'default': '地名纠错：地理位置信息错误的纠正'
            },

            // name - 全文人名纠错
            'name': {
                'name': '全文人名纠错',
                'default': '人名纠错：个人姓名错误的纠正'
            },

            // grammar_pc - 句式杂糅&语义重复
            'grammar_pc': {
                'grammar_pc': '句式杂糅',
                'default': '语法纠错：句式杂糅和语义重复等问题的纠正'
            }
        };

        const typeConfig = officialTypeDescriptions[errorType];
        if (!typeConfig) {
            // 如果没有配置，返回原始描述或默认描述
            return fourthElement || this.errorTypes[errorType]?.description || errorType;
        }

        // 如果有第四个元素且在类型配置中找到对应的描述
        if (fourthElement && typeConfig[fourthElement]) {
            return typeConfig[fourthElement];
        }

        // 对于punc类型，检查是否是特殊描述
        if (errorType === 'punc' && fourthElement && typeConfig.types && typeConfig.types[fourthElement]) {
            return typeConfig.types[fourthElement];
        }

        // 如果第四个元素是有意义的描述文本，直接使用
        if (fourthElement && typeof fourthElement === 'string' && fourthElement.length > 1 &&
            !['char', 'word', 'redund', 'miss', 'order', 'dapei', 'punc', 'idm', 'org', 'leader', 'number', 'addr', 'name', 'grammar_pc'].includes(fourthElement)) {
            return fourthElement;
        }

        // 返回默认描述
        return typeConfig.default || this.errorTypes[errorType]?.description || errorType;
    }
}

// 创建全局文本处理器实例
const textProcessor = new TextProcessor();

// 导出文本处理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextProcessor;
} else {
    window.TextProcessor = TextProcessor;
    window.textProcessor = textProcessor;
}