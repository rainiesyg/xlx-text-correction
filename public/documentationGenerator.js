/**
 * 文档生成器
 * 自动生成API文档、使用说明和代码注释
 */
class DocumentationGenerator {
    constructor() {
        this.modules = new Map();
        this.apiEndpoints = new Map();
        this.examples = new Map();
        this.changelog = [];
        
        this.initializeDocumentation();
    }

    /**
     * 初始化文档系统
     */
    initializeDocumentation() {
        this.registerModules();
        this.registerApiEndpoints();
        this.registerExamples();
        this.createDocumentationUI();
    }

    /**
     * 注册模块文档
     */
    registerModules() {
        // TextProcessor 模块
        this.modules.set('TextProcessor', {
            name: 'TextProcessor',
            description: '文本处理器，负责处理和解析错误数据',
            version: '2.0.0',
            author: '广西心连心信息化组',
            methods: [
                {
                    name: 'processErrors',
                    description: '处理讯飞返回的错误数据',
                    parameters: [
                        { name: 'errors', type: 'Array', description: '错误数组' }
                    ],
                    returns: { type: 'Array', description: '处理后的错误对象数组' },
                    example: 'processor.processErrors([errorItem1, errorItem2])'
                },
                {
                    name: 'createXunfeiErrorObject',
                    description: '创建科大讯飞格式的错误对象',
                    parameters: [
                        { name: 'errorItem', type: 'Array', description: '错误项数组' },
                        { name: 'defaultType', type: 'string', description: '默认错误类型' }
                    ],
                    returns: { type: 'Object', description: '格式化的错误对象' },
                    example: 'processor.createXunfeiErrorObject([0, "错误", "正确", "描述"], "word")'
                },
                {
                    name: 'validateErrorItem',
                    description: '验证错误项的数据格式',
                    parameters: [
                        { name: 'errorItem', type: 'Array', description: '错误项数组' }
                    ],
                    returns: { type: 'boolean', description: '验证结果' },
                    example: 'processor.validateErrorItem([0, "test", "correct", "desc"])'
                }
            ]
        });

        // CacheManager 模块
        this.modules.set('CacheManager', {
            name: 'CacheManager',
            description: '缓存管理器，提供高效的数据缓存功能',
            version: '1.0.0',
            author: '广西心连心信息化组',
            methods: [
                {
                    name: 'set',
                    description: '设置缓存项',
                    parameters: [
                        { name: 'key', type: 'string', description: '缓存键' },
                        { name: 'value', type: 'any', description: '缓存值' },
                        { name: 'ttl', type: 'number', description: '生存时间（可选）' }
                    ],
                    returns: { type: 'boolean', description: '设置是否成功' },
                    example: 'cache.set("key", "value", 3600)'
                },
                {
                    name: 'get',
                    description: '获取缓存项',
                    parameters: [
                        { name: 'key', type: 'string', description: '缓存键' }
                    ],
                    returns: { type: 'any', description: '缓存值或null' },
                    example: 'cache.get("key")'
                }
            ]
        });

        // UserExperienceManager 模块
        this.modules.set('UserExperienceManager', {
            name: 'UserExperienceManager',
            description: '用户体验管理器，提供进度跟踪、反馈和统计功能',
            version: '1.0.0',
            author: '广西心连心信息化组',
            methods: [
                {
                    name: 'showFeedback',
                    description: '显示用户反馈消息',
                    parameters: [
                        { name: 'message', type: 'string', description: '反馈消息' },
                        { name: 'type', type: 'string', description: '消息类型 (info, success, warning, error)' },
                        { name: 'duration', type: 'number', description: '显示时长（毫秒）' }
                    ],
                    returns: { type: 'void', description: '无返回值' },
                    example: 'uxManager.showFeedback("操作成功", "success", 3000)'
                },
                {
                    name: 'startProgress',
                    description: '开始进度跟踪',
                    parameters: [
                        { name: 'total', type: 'number', description: '总项目数' },
                        { name: 'title', type: 'string', description: '进度标题' }
                    ],
                    returns: { type: 'void', description: '无返回值' },
                    example: 'uxManager.startProgress(100, "处理数据")'
                }
            ]
        });

        // TestManager 模块
        this.modules.set('TestManager', {
            name: 'TestManager',
            description: '测试管理器，提供单元测试和集成测试功能',
            version: '1.0.0',
            author: '广西心连心信息化组',
            methods: [
                {
                    name: 'registerTest',
                    description: '注册测试用例',
                    parameters: [
                        { name: 'name', type: 'string', description: '测试名称' },
                        { name: 'description', type: 'string', description: '测试描述' },
                        { name: 'testFunction', type: 'Function', description: '测试函数' }
                    ],
                    returns: { type: 'void', description: '无返回值' },
                    example: 'testManager.registerTest("test1", "测试描述", async () => {})'
                },
                {
                    name: 'runAllTests',
                    description: '运行所有测试',
                    parameters: [],
                    returns: { type: 'Promise<Array>', description: '测试结果数组' },
                    example: 'await testManager.runAllTests()'
                }
            ]
        });
    }

    /**
     * 注册API端点文档
     */
    registerApiEndpoints() {
        this.apiEndpoints.set('/api/correct', {
            method: 'POST',
            description: '文本纠错API',
            parameters: {
                text: { type: 'string', required: true, description: '需要纠错的文本' },
                options: { type: 'object', required: false, description: '纠错选项' }
            },
            responses: {
                200: { description: '纠错成功', schema: '{ "corrected_text": "string", "errors": "array" }' },
                400: { description: '请求参数错误' },
                500: { description: '服务器内部错误' }
            },
            example: {
                request: '{ "text": "这是一个测试文本" }',
                response: '{ "corrected_text": "这是一个测试文本", "errors": [] }'
            }
        });
    }

    /**
     * 注册使用示例
     */
    registerExamples() {
        this.examples.set('basic_usage', {
            title: '基本使用',
            description: '展示如何使用文本纠错小程序的基本功能',
            code: `
// 1. 初始化文本处理器
const processor = new TextProcessor(config);

// 2. 处理错误数据
const errors = [
    [0, "错误文本", "正确文本", "错误描述"]
];
const processedErrors = processor.processErrors(errors);

// 3. 显示结果

            `
        });

        this.examples.set('cache_usage', {
            title: '缓存使用',
            description: '展示如何使用缓存管理器提高性能',
            code: `
// 1. 创建缓存管理器
const cache = new CacheManager(true, 3600000); // 启用缓存，1小时过期

// 2. 设置缓存
cache.set('user_data', { name: '张三', age: 25 });

// 3. 获取缓存
const userData = cache.get('user_data');


// 4. 批量操作
cache.setBatch({
    'key1': 'value1',
    'key2': 'value2'
});
            `
        });

        this.examples.set('user_experience', {
            title: '用户体验增强',
            description: '展示如何使用用户体验管理器提供更好的用户反馈',
            code: `
// 1. 创建用户体验管理器
const uxManager = new UserExperienceManager(config);

// 2. 显示反馈消息
uxManager.showFeedback('操作成功！', 'success', 3000);

// 3. 进度跟踪
uxManager.startProgress(100, '处理数据');
for (let i = 0; i < 100; i++) {
    // 处理数据...
    uxManager.updateProgress(i + 1, 100);
}
uxManager.completeProgress();

// 4. 更新统计
uxManager.updateStatistics(errors, processingTime);
            `
        });

        this.examples.set('testing', {
            title: '测试功能',
            description: '展示如何使用测试管理器进行代码测试',
            code: `
// 1. 创建测试管理器
const testManager = new TestManager();

// 2. 注册自定义测试
testManager.registerTest('custom_test', '自定义测试', async () => {
    const result = someFunction();
    if (result !== expectedValue) {
        throw new Error('测试失败');
    }
    return '测试通过';
});

// 3. 运行所有测试
const results = await testManager.runAllTests();


// 4. 快捷方式（开发环境）
// 按 Ctrl+Shift+T 运行测试
// 或者调用 window.runTests()
            `
        });
    }

    /**
     * 创建文档界面
     */
    createDocumentationUI() {
        const existingDocs = document.getElementById('documentationContainer');
        if (existingDocs) {
            existingDocs.remove();
        }

        const docsContainer = document.createElement('div');
        docsContainer.id = 'documentationContainer';
        docsContainer.className = 'documentation-container';
        docsContainer.style.display = 'none';
        
        docsContainer.innerHTML = `
            <div class="docs-header">
                <h2><i class="fas fa-book"></i> 系统文档</h2>
                <div class="docs-controls">
                    <button class="btn btn-sm btn-primary" id="generateDocsBtn">
                        <i class="fas fa-file-export"></i> 导出文档
                    </button>
                    <button class="btn btn-sm btn-secondary" id="closeDocsBtn">
                        <i class="fas fa-times"></i> 关闭
                    </button>
                </div>
            </div>
            <div class="docs-nav">
                <button class="docs-nav-btn active" data-section="modules">模块文档</button>
                <button class="docs-nav-btn" data-section="api">API文档</button>
                <button class="docs-nav-btn" data-section="examples">使用示例</button>
                <button class="docs-nav-btn" data-section="changelog">更新日志</button>
            </div>
            <div class="docs-content">
                <div class="docs-section active" id="modules-section">
                    <!-- 模块文档内容 -->
                </div>
                <div class="docs-section" id="api-section">
                    <!-- API文档内容 -->
                </div>
                <div class="docs-section" id="examples-section">
                    <!-- 示例文档内容 -->
                </div>
                <div class="docs-section" id="changelog-section">
                    <!-- 更新日志内容 -->
                </div>
            </div>
        `;
        
        document.body.appendChild(docsContainer);
        
        this.bindDocumentationEvents();
        this.renderDocumentation();
    }

    /**
     * 绑定文档事件
     */
    bindDocumentationEvents() {
        // 导航切换
        const navButtons = document.querySelectorAll('.docs-nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                this.switchDocumentationSection(section);
            });
        });

        // 关闭按钮
        const closeBtn = document.getElementById('closeDocsBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideDocumentation();
            });
        }

        // 导出按钮
        const exportBtn = document.getElementById('generateDocsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportDocumentation();
            });
        }
    }

    /**
     * 切换文档部分
     * @param {string} section - 部分名称
     */
    switchDocumentationSection(section) {
        // 更新导航状态
        document.querySelectorAll('.docs-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // 更新内容显示
        document.querySelectorAll('.docs-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');
    }

    /**
     * 渲染文档内容
     */
    renderDocumentation() {
        this.renderModulesSection();
        this.renderApiSection();
        this.renderExamplesSection();
        this.renderChangelogSection();
    }

    /**
     * 渲染模块文档
     */
    renderModulesSection() {
        const section = document.getElementById('modules-section');
        if (!section) return;

        let html = '<h3>模块文档</h3>';
        
        this.modules.forEach((module, name) => {
            html += `
                <div class="module-doc">
                    <div class="module-header">
                        <h4>${module.name}</h4>
                        <span class="module-version">v${module.version}</span>
                    </div>
                    <p class="module-description">${module.description}</p>
                    <p class="module-author">作者: ${module.author}</p>
                    
                    <div class="module-methods">
                        <h5>方法列表</h5>
            `;
            
            module.methods.forEach(method => {
                html += `
                    <div class="method-doc">
                        <div class="method-signature">
                            <code>${method.name}(${method.parameters.map(p => p.name).join(', ')})</code>
                        </div>
                        <p class="method-description">${method.description}</p>
                        
                        <div class="method-parameters">
                            <h6>参数:</h6>
                            <ul>
                `;
                
                method.parameters.forEach(param => {
                    html += `<li><strong>${param.name}</strong> (${param.type}): ${param.description}</li>`;
                });
                
                html += `
                            </ul>
                        </div>
                        
                        <div class="method-returns">
                            <h6>返回值:</h6>
                            <p><strong>${method.returns.type}</strong>: ${method.returns.description}</p>
                        </div>
                        
                        <div class="method-example">
                            <h6>示例:</h6>
                            <pre><code>${method.example}</code></pre>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        section.innerHTML = html;
    }

    /**
     * 渲染API文档
     */
    renderApiSection() {
        const section = document.getElementById('api-section');
        if (!section) return;

        let html = '<h3>API文档</h3>';
        
        this.apiEndpoints.forEach((endpoint, path) => {
            html += `
                <div class="api-doc">
                    <div class="api-header">
                        <span class="api-method">${endpoint.method}</span>
                        <span class="api-path">${path}</span>
                    </div>
                    <p class="api-description">${endpoint.description}</p>
                    
                    <div class="api-parameters">
                        <h5>请求参数</h5>
                        <table class="params-table">
                            <thead>
                                <tr>
                                    <th>参数名</th>
                                    <th>类型</th>
                                    <th>必需</th>
                                    <th>描述</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            Object.entries(endpoint.parameters).forEach(([name, param]) => {
                html += `
                    <tr>
                        <td><code>${name}</code></td>
                        <td>${param.type}</td>
                        <td>${param.required ? '是' : '否'}</td>
                        <td>${param.description}</td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="api-responses">
                        <h5>响应</h5>
            `;
            
            Object.entries(endpoint.responses).forEach(([code, response]) => {
                html += `
                    <div class="response-item">
                        <span class="response-code">${code}</span>
                        <span class="response-description">${response.description}</span>
                        ${response.schema ? `<pre class="response-schema"><code>${response.schema}</code></pre>` : ''}
                    </div>
                `;
            });
            
            html += `
                    </div>
                    
                    <div class="api-example">
                        <h5>示例</h5>
                        <div class="example-request">
                            <h6>请求:</h6>
                            <pre><code>${endpoint.example.request}</code></pre>
                        </div>
                        <div class="example-response">
                            <h6>响应:</h6>
                            <pre><code>${endpoint.example.response}</code></pre>
                        </div>
                    </div>
                </div>
            `;
        });
        
        section.innerHTML = html;
    }

    /**
     * 渲染示例文档
     */
    renderExamplesSection() {
        const section = document.getElementById('examples-section');
        if (!section) return;

        let html = '<h3>使用示例</h3>';
        
        this.examples.forEach((example, key) => {
            html += `
                <div class="example-doc">
                    <h4>${example.title}</h4>
                    <p class="example-description">${example.description}</p>
                    <div class="example-code">
                        <pre><code class="language-javascript">${example.code}</code></pre>
                    </div>
                </div>
            `;
        });
        
        section.innerHTML = html;
    }

    /**
     * 渲染更新日志
     */
    renderChangelogSection() {
        const section = document.getElementById('changelog-section');
        if (!section) return;

        // 生成更新日志
        const changelog = [
            {
                version: '2.0.0',
                date: '2025-01-XX',
                changes: [
                    '新增: 统一错误类型映射表，支持 fourthElementType 配置',
                    '新增: CacheManager 缓存管理器，提升性能',
                    '新增: UserExperienceManager 用户体验管理器',
                    '新增: TestManager 测试管理器，支持自动化测试',
                    '新增: DocumentationGenerator 文档生成器',
                    '优化: TextProcessor 数据验证和错误处理机制',
                    '优化: 批量处理和DOM更新性能',
                    '修复: black_list 和 pol 错误类型处理逻辑'
                ]
            },
            {
                version: '1.0.0',
                date: '2025-01-XX',
                changes: [
                    '初始版本发布',
                    '基础文本纠错功能',
                    '支持多种错误类型',
                    '基础UI界面'
                ]
            }
        ];

        let html = '<h3>更新日志</h3>';
        
        changelog.forEach(release => {
            html += `
                <div class="changelog-release">
                    <div class="release-header">
                        <h4>版本 ${release.version}</h4>
                        <span class="release-date">${release.date}</span>
                    </div>
                    <ul class="release-changes">
            `;
            
            release.changes.forEach(change => {
                const type = change.split(':')[0];
                const changeClass = type === '新增' ? 'new' : type === '优化' ? 'improved' : type === '修复' ? 'fixed' : 'other';
                html += `<li class="change-${changeClass}">${change}</li>`;
            });
            
            html += `
                    </ul>
                </div>
            `;
        });
        
        section.innerHTML = html;
    }

    /**
     * 显示文档
     */
    showDocumentation() {
        const container = document.getElementById('documentationContainer');
        if (container) {
            container.style.display = 'block';
        }
    }

    /**
     * 隐藏文档
     */
    hideDocumentation() {
        const container = document.getElementById('documentationContainer');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * 导出文档
     */
    exportDocumentation() {
        const docContent = this.generateMarkdownDocumentation();
        const blob = new Blob([docContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = '心连心文本纠错小程序文档.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    /**
     * 生成Markdown格式文档
     * @returns {string} - Markdown文档内容
     */
    generateMarkdownDocumentation() {
        let markdown = '# 心连心文本纠错小程序文档\n\n';
        
        // 模块文档
        markdown += '## 模块文档\n\n';
        this.modules.forEach((module, name) => {
            markdown += `### ${module.name}\n\n`;
            markdown += `**版本**: ${module.version}\n`;
            markdown += `**作者**: ${module.author}\n`;
            markdown += `**描述**: ${module.description}\n\n`;
            
            markdown += '#### 方法\n\n';
            module.methods.forEach(method => {
                markdown += `##### ${method.name}\n\n`;
                markdown += `${method.description}\n\n`;
                markdown += '**参数**:\n';
                method.parameters.forEach(param => {
                    markdown += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
                });
                markdown += `\n**返回值**: ${method.returns.type} - ${method.returns.description}\n\n`;
                markdown += `**示例**:\n\`\`\`javascript\n${method.example}\n\`\`\`\n\n`;
            });
        });
        
        // API文档
        markdown += '## API文档\n\n';
        this.apiEndpoints.forEach((endpoint, path) => {
            markdown += `### ${endpoint.method} ${path}\n\n`;
            markdown += `${endpoint.description}\n\n`;
            markdown += '**请求参数**:\n';
            Object.entries(endpoint.parameters).forEach(([name, param]) => {
                markdown += `- \`${name}\` (${param.type})${param.required ? ' *必需*' : ''}: ${param.description}\n`;
            });
            markdown += '\n';
        });
        
        // 使用示例
        markdown += '## 使用示例\n\n';
        this.examples.forEach((example, key) => {
            markdown += `### ${example.title}\n\n`;
            markdown += `${example.description}\n\n`;
            markdown += `\`\`\`javascript${example.code}\n\`\`\`\n\n`;
        });
        
        return markdown;
    }

    /**
     * 清理资源
     */
    cleanup() {
        const container = document.getElementById('documentationContainer');
        if (container) {
            container.remove();
        }
        
        this.modules.clear();
        this.apiEndpoints.clear();
        this.examples.clear();
        this.changelog = [];
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocumentationGenerator;
}

// 全局文档快捷方式
if (typeof window !== 'undefined') {
    window.showDocs = function() {
        if (!window.docGenerator) {
            window.docGenerator = new DocumentationGenerator();
        }
        window.docGenerator.showDocumentation();
    };
    
    // 开发模式下自动创建文档生成器
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        document.addEventListener('DOMContentLoaded', () => {
            // 添加文档快捷键 (Ctrl+Shift+D)
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                    e.preventDefault();
                    window.showDocs();
                }
            });
        });
    }
}