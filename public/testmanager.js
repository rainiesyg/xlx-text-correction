/**
 * 测试管理器
 * 提供单元测试和集成测试功能，确保代码质量
 */
class TestManager {
    constructor() {
        this.tests = new Map();
        this.testResults = [];
        this.isRunning = false;
        this.config = {
            timeout: 5000, // 测试超时时间
            verbose: false, // 详细输出
            stopOnFailure: false // 遇到失败时停止
        };
        
        this.setupTestEnvironment();
    }

    /**
     * 设置测试环境
     */
    setupTestEnvironment() {
        // 创建测试容器
        this.createTestContainer();
        
        // 注册内置测试
        this.registerBuiltInTests();
    }

    /**
     * 创建测试容器
     */
    createTestContainer() {
        const existingContainer = document.getElementById('testContainer');
        if (existingContainer) {
            existingContainer.remove();
        }

        const testContainer = document.createElement('div');
        testContainer.id = 'testContainer';
        testContainer.className = 'test-container';
        testContainer.style.display = 'none';
        
        testContainer.innerHTML = `
            <div class="test-header">
                <h3><i class="fas fa-vial"></i> 测试控制台</h3>
                <div class="test-controls">
                    <button class="btn btn-sm btn-primary" id="runAllTestsBtn">
                        <i class="fas fa-play"></i> 运行所有测试
                    </button>
                    <button class="btn btn-sm btn-secondary" id="clearTestsBtn">
                        <i class="fas fa-trash"></i> 清空结果
                    </button>
                    <button class="btn btn-sm btn-secondary" id="closeTestsBtn">
                        <i class="fas fa-times"></i> 关闭
                    </button>
                </div>
            </div>
            <div class="test-content">
                <div class="test-summary" id="testSummary">
                    <div class="summary-item">
                        <span class="summary-label">总测试数</span>
                        <span class="summary-value" id="totalTests">0</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">通过</span>
                        <span class="summary-value success" id="passedTests">0</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">失败</span>
                        <span class="summary-value error" id="failedTests">0</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">跳过</span>
                        <span class="summary-value warning" id="skippedTests">0</span>
                    </div>
                </div>
                <div class="test-results" id="testResults">
                    <!-- 测试结果将在这里显示 -->
                </div>
            </div>
        `;
        
        document.body.appendChild(testContainer);
        
        // 绑定事件
        this.bindTestEvents();
    }

    /**
     * 绑定测试事件
     */
    bindTestEvents() {
        const runAllBtn = document.getElementById('runAllTestsBtn');
        const clearBtn = document.getElementById('clearTestsBtn');
        const closeBtn = document.getElementById('closeTestsBtn');
        
        if (runAllBtn) {
            runAllBtn.addEventListener('click', () => this.runAllTests());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearResults());
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideTestContainer());
        }
    }

    /**
     * 注册内置测试
     */
    registerBuiltInTests() {
        // TextProcessor 测试
        this.registerTest('textProcessor', 'TextProcessor 基础功能', async () => {
            if (typeof TextProcessor === 'undefined') {
                throw new Error('TextProcessor 类未定义');
            }
            
            const processor = new TextProcessor(window.config);
            
            // 测试错误对象创建
            const testError = [0, 'test', 'correct', 'description'];
            const errorObj = processor.createXunfeiErrorObject(testError, 'word');
            
            if (!errorObj || typeof errorObj !== 'object') {
                throw new Error('createXunfeiErrorObject 返回值无效');
            }
            
            if (errorObj.type !== 'word') {
                throw new Error('错误类型设置不正确');
            }
            
            return '✓ TextProcessor 基础功能正常';
        });

        // CacheManager 测试
        this.registerTest('cacheManager', 'CacheManager 缓存功能', async () => {
            if (typeof CacheManager === 'undefined') {
                throw new Error('CacheManager 类未定义');
            }
            
            const cache = new CacheManager(true, 1000);
            
            // 测试设置和获取
            cache.set('test_key', 'test_value');
            const value = cache.get('test_key');
            
            if (value !== 'test_value') {
                throw new Error('缓存设置/获取失败');
            }
            
            // 测试删除
            cache.delete('test_key');
            const deletedValue = cache.get('test_key');
            
            if (deletedValue !== null) {
                throw new Error('缓存删除失败');
            }
            
            return '✓ CacheManager 缓存功能正常';
        });

        // UserExperienceManager 测试
        this.registerTest('userExperience', 'UserExperienceManager 用户体验', async () => {
            if (typeof UserExperienceManager === 'undefined') {
                throw new Error('UserExperienceManager 类未定义');
            }
            
            const uxManager = new UserExperienceManager(window.config);
            
            // 测试反馈功能
            uxManager.showFeedback('测试消息', 'info', 1000);
            
            // 测试进度功能
            uxManager.startProgress(10, '测试进度');
            uxManager.updateProgress(5, 10);
            uxManager.completeProgress();
            
            // 测试统计功能
            const testErrors = [
                { type: 'word', message: 'test1' },
                { type: 'char', message: 'test2' }
            ];
            uxManager.updateStatistics(testErrors, 100);
            
            const stats = uxManager.getStatistics();
            if (stats.totalErrors !== 2) {
                throw new Error('统计功能异常');
            }
            
            return '✓ UserExperienceManager 用户体验功能正常';
        });

        // 配置验证测试
        this.registerTest('config', '配置文件验证', async () => {
            if (typeof config === 'undefined' || !config) {
                throw new Error('配置对象未定义');
            }
            
            // 检查必要的配置项
            const requiredConfigs = [
                'ERROR_TYPES',
                'UI.PERFORMANCE',
                'DATA_FORMAT'
            ];
            
            for (const configPath of requiredConfigs) {
                const keys = configPath.split('.');
                let current = config;
                
                for (const key of keys) {
                    if (!current || !current.hasOwnProperty(key)) {
                        throw new Error(`缺少必要配置: ${configPath}`);
                    }
                    current = current[key];
                }
            }
            
            // 检查错误类型配置
            const errorTypes = config.ERROR_TYPES;
            for (const [type, typeConfig] of Object.entries(errorTypes)) {
                if (!typeConfig.displayName || !typeConfig.description) {
                    throw new Error(`错误类型 ${type} 配置不完整`);
                }
                
                if (!typeConfig.hasOwnProperty('fourthElementType')) {
                    throw new Error(`错误类型 ${type} 缺少 fourthElementType 配置`);
                }
            }
            
            return '✓ 配置文件验证通过';
        });

        // API 客户端测试
        this.registerTest('apiClient', 'API 客户端功能', async () => {
            if (typeof ApiClient === 'undefined') {
                throw new Error('ApiClient 类未定义');
            }
            
            const apiClient = new ApiClient();
            
            // 测试请求构建
            const testData = { text: 'test' };
            const request = apiClient.buildRequest('/test', testData);
            
            if (!request || !request.method || !request.headers) {
                throw new Error('API 请求构建失败');
            }
            
            return '✓ API 客户端功能正常';
        });
    }

    /**
     * 注册测试
     * @param {string} name - 测试名称
     * @param {string} description - 测试描述
     * @param {Function} testFunction - 测试函数
     */
    registerTest(name, description, testFunction) {
        this.tests.set(name, {
            name,
            description,
            testFunction,
            status: 'pending'
        });
    }

    /**
     * 运行单个测试
     * @param {string} testName - 测试名称
     * @returns {Promise<Object>} - 测试结果
     */
    async runTest(testName) {
        const test = this.tests.get(testName);
        if (!test) {
            throw new Error(`测试 '${testName}' 不存在`);
        }

        const startTime = Date.now();
        let result = {
            name: testName,
            description: test.description,
            status: 'running',
            duration: 0,
            message: '',
            error: null
        };

        try {
            // 设置超时
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('测试超时')), this.config.timeout);
            });

            // 运行测试
            const testPromise = test.testFunction();
            const testResult = await Promise.race([testPromise, timeoutPromise]);

            result.status = 'passed';
            result.message = testResult || '测试通过';
        } catch (error) {
            result.status = 'failed';
            result.error = error;
            result.message = error.message || '测试失败';
        } finally {
            result.duration = Date.now() - startTime;
            test.status = result.status;
        }

        return result;
    }

    /**
     * 运行所有测试
     * @returns {Promise<Array>} - 所有测试结果
     */
    async runAllTests() {
        if (this.isRunning) {

            return;
        }

        this.isRunning = true;
        this.testResults = [];
        
        // 显示测试容器
        this.showTestContainer();
        
        // 更新运行按钮状态
        const runBtn = document.getElementById('runAllTestsBtn');
        if (runBtn) {
            runBtn.disabled = true;
            runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 运行中...';
        }

        try {
            const testNames = Array.from(this.tests.keys());
            
            for (const testName of testNames) {
                if (this.config.verbose) {
        
                }
                
                const result = await this.runTest(testName);
                this.testResults.push(result);
                
                // 实时更新结果
                this.updateTestResults();
                
                // 如果配置为失败时停止，且当前测试失败
                if (this.config.stopOnFailure && result.status === 'failed') {
    
                    break;
                }
                
                // 添加小延迟，避免阻塞UI
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        } catch (error) {

        } finally {
            this.isRunning = false;
            
            // 恢复运行按钮
            if (runBtn) {
                runBtn.disabled = false;
                runBtn.innerHTML = '<i class="fas fa-play"></i> 运行所有测试';
            }
        }

        return this.testResults;
    }

    /**
     * 更新测试结果显示
     */
    updateTestResults() {
        const totalTests = document.getElementById('totalTests');
        const passedTests = document.getElementById('passedTests');
        const failedTests = document.getElementById('failedTests');
        const skippedTests = document.getElementById('skippedTests');
        const resultsContainer = document.getElementById('testResults');

        if (!resultsContainer) return;

        // 统计结果
        const stats = this.testResults.reduce((acc, result) => {
            acc.total++;
            acc[result.status]++;
            return acc;
        }, { total: 0, passed: 0, failed: 0, skipped: 0 });

        // 更新统计
        if (totalTests) totalTests.textContent = stats.total;
        if (passedTests) passedTests.textContent = stats.passed;
        if (failedTests) failedTests.textContent = stats.failed;
        if (skippedTests) skippedTests.textContent = stats.skipped;

        // 更新结果列表
        resultsContainer.innerHTML = '';
        
        this.testResults.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = `test-result-item test-${result.status}`;
            
            const statusIcon = {
                passed: 'fa-check-circle',
                failed: 'fa-times-circle',
                running: 'fa-spinner fa-spin',
                skipped: 'fa-minus-circle'
            }[result.status] || 'fa-question-circle';
            
            resultItem.innerHTML = `
                <div class="test-result-header">
                    <div class="test-result-title">
                        <i class="fas ${statusIcon}"></i>
                        <span class="test-name">${result.name}</span>
                        <span class="test-duration">${result.duration}ms</span>
                    </div>
                    <div class="test-description">${result.description}</div>
                </div>
                <div class="test-result-message">${result.message}</div>
                ${result.error ? `<div class="test-error-details">${result.error.stack || result.error.message}</div>` : ''}
            `;
            
            resultsContainer.appendChild(resultItem);
        });
    }

    /**
     * 清空测试结果
     */
    clearResults() {
        this.testResults = [];
        this.updateTestResults();
    }

    /**
     * 显示测试容器
     */
    showTestContainer() {
        const container = document.getElementById('testContainer');
        if (container) {
            container.style.display = 'block';
        }
    }

    /**
     * 隐藏测试容器
     */
    hideTestContainer() {
        const container = document.getElementById('testContainer');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * 获取测试统计
     * @returns {Object} - 测试统计信息
     */
    getTestStatistics() {
        const stats = this.testResults.reduce((acc, result) => {
            acc.total++;
            acc[result.status]++;
            acc.totalDuration += result.duration;
            return acc;
        }, { total: 0, passed: 0, failed: 0, skipped: 0, totalDuration: 0 });

        stats.passRate = stats.total > 0 ? (stats.passed / stats.total * 100).toFixed(2) : 0;
        stats.averageDuration = stats.total > 0 ? (stats.totalDuration / stats.total).toFixed(2) : 0;

        return stats;
    }

    /**
     * 设置测试配置
     * @param {Object} newConfig - 新配置
     */
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * 清理资源
     */
    cleanup() {
        const container = document.getElementById('testContainer');
        if (container) {
            container.remove();
        }
        
        this.tests.clear();
        this.testResults = [];
        this.isRunning = false;
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestManager;
}

// 全局测试快捷方式
if (typeof window !== 'undefined') {
    window.runTests = function() {
        if (!window.testManager) {
            window.testManager = new TestManager();
        }
        return window.testManager.runAllTests();
    };
    
    // 开发模式下自动创建测试管理器
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        document.addEventListener('DOMContentLoaded', () => {
            // 添加测试快捷键 (Ctrl+Shift+T)
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                    e.preventDefault();
                    window.runTests();
                }
            });
        });
    }
}