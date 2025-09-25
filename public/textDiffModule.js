/**
 * 文本对比模块
 * 整合txtDiff功能到主项目的模块化架构中
 */
class TextDiffModule {
    constructor() {
        this.container = window.container;
        this.eventBus = window.eventBus;
        this.leftText = '';
        this.rightText = '';
        this.ignoreCase = true;
        this.ignoreWhitespace = false;
        this.diffTimeout = null;
        this.initialized = false;
    }

    /**
     * 初始化模块
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            this.bindEvents();
            this.updateCharCounts();
            this.registerEventListeners();
            this.initialized = true;
            
            this.eventBus.emit('textDiff:initialized', { module: this });
        } catch (error) {
            this.eventBus.emit('textDiff:error', { error, context: 'initialization' });
            throw error;
        }
    }

    /**
     * 注册事件监听器
     */
    registerEventListeners() {
        this.eventBus.on('textDiff:compare', (data) => this.compare(data));
        this.eventBus.on('textDiff:clear', () => this.clear());
        this.eventBus.on('textDiff:swap', () => this.swap());
        this.eventBus.on('textDiff:loadExample', () => this.loadExample());
    }

    /**
     * 绑定DOM事件
     */
    bindEvents() {
        const elements = this.getDOMElements();
        
        // 控制按钮事件
        elements.compareBtn?.addEventListener('click', () => this.compare());
        elements.clearBtn?.addEventListener('click', () => this.clear());
        elements.swapBtn?.addEventListener('click', () => this.swap());
        elements.exampleBtn?.addEventListener('click', () => this.loadExample());

        // 选项事件
        elements.ignoreCaseCheckbox?.addEventListener('change', (e) => {
            this.ignoreCase = e.target.checked;
            this.autoCompare();
        });
        
        elements.ignoreWhitespaceCheckbox?.addEventListener('change', (e) => {
            this.ignoreWhitespace = e.target.checked;
            this.autoCompare();
        });

        // 文本输入事件
        elements.leftTextArea?.addEventListener('input', (e) => {
            this.leftText = e.target.value;
            this.updateCharCount('left');
            this.autoCompare();
        });
        
        elements.rightTextArea?.addEventListener('input', (e) => {
            this.rightText = e.target.value;
            this.updateCharCount('right');
            this.autoCompare();
        });
    }

    /**
     * 获取DOM元素
     */
    getDOMElements() {
        return {
            compareBtn: document.getElementById('diffCompareBtn'),
            clearBtn: document.getElementById('diffClearBtn'),
            swapBtn: document.getElementById('diffSwapBtn'),
            exampleBtn: document.getElementById('diffExampleBtn'),
            ignoreCaseCheckbox: document.getElementById('ignoreCase'),
            ignoreWhitespaceCheckbox: document.getElementById('ignoreWhitespace'),
            leftTextArea: document.getElementById('leftText'),
            rightTextArea: document.getElementById('rightText'),
            leftCount: document.getElementById('leftCount'),
            rightCount: document.getElementById('rightCount'),
            leftDiff: document.getElementById('leftDiff'),
            rightDiff: document.getElementById('rightDiff'),
            resultContainer: document.getElementById('diffResultContainer'),
            addedLines: document.getElementById('addedLines'),
            removedLines: document.getElementById('removedLines'),
            modifiedLines: document.getElementById('modifiedLines')
        };
    }

    /**
     * 更新字符计数
     */
    updateCharCount(side) {
        const text = side === 'left' ? this.leftText : this.rightText;
        const countElement = document.getElementById(side + 'Count');
        if (countElement) {
            countElement.textContent = `${text.length} 字符`;
        }
    }

    /**
     * 更新所有字符计数
     */
    updateCharCounts() {
        this.updateCharCount('left');
        this.updateCharCount('right');
    }

    /**
     * 自动对比（防抖）
     */
    autoCompare() {
        clearTimeout(this.diffTimeout);
        this.diffTimeout = setTimeout(() => {
            if (this.leftText || this.rightText) {
                this.compare();
            }
        }, 1000);
    }

    /**
     * 执行文本对比
     */
    compare(options = {}) {
        try {
            const leftText = this.preprocessText(options.leftText || this.leftText);
            const rightText = this.preprocessText(options.rightText || this.rightText);

            if (!leftText && !rightText) {
                this.hideResults();
                return;
            }

            const diff = this.computeDiff(leftText, rightText);
            this.displayDiff(diff);
            this.showResults();
            
            this.eventBus.emit('textDiff:compared', { 
                leftText, 
                rightText, 
                diff,
                stats: this.getComparisonStats(diff)
            });
        } catch (error) {
            this.eventBus.emit('textDiff:error', { error, context: 'comparison' });
        }
    }

    /**
     * 文本预处理
     */
    preprocessText(text) {
        if (!text) return '';
        
        let processed = text;
        if (this.ignoreCase) {
            processed = processed.toLowerCase();
        }
        if (this.ignoreWhitespace) {
            processed = processed.replace(/\s+/g, ' ').trim();
        }
        return processed;
    }

    /**
     * 计算文本差异
     */
    computeDiff(text1, text2) {
        const lines1 = text1.split('\n');
        const lines2 = text2.split('\n');
        
        // 使用改进的差异算法
        return this.computeLineDiff(lines1, lines2);
    }

    /**
     * 计算行级差异
     */
    computeLineDiff(lines1, lines2) {
        const diff = [];
        const m = lines1.length;
        const n = lines2.length;
        
        // 创建LCS矩阵
        const lcs = this.computeLCS(lines1, lines2);
        
        let i = 0, j = 0;
        
        while (i < m || j < n) {
            if (i < m && j < n && lines1[i] === lines2[j]) {
                // 相同的行
                diff.push({ type: 'unchanged', left: lines1[i], right: lines2[j] });
                i++;
                j++;
            } else if (i < m && j < n && this.areSimilar(lines1[i], lines2[j])) {
                // 相似的行，认为是修改
                diff.push({ type: 'modified', left: lines1[i], right: lines2[j] });
                i++;
                j++;
            } else if (i < m && (j >= n || !this.hasMatchInRange(lines1[i], lines2, j, Math.min(j + 3, n)))) {
                // 删除的行
                diff.push({ type: 'removed', left: lines1[i], right: null });
                i++;
            } else if (j < n) {
                // 新增的行
                diff.push({ type: 'added', left: null, right: lines2[j] });
                j++;
            }
        }
        
        return diff;
    }

    /**
     * 计算最长公共子序列
     */
    computeLCS(lines1, lines2) {
        const m = lines1.length;
        const n = lines2.length;
        const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (lines1[i - 1] === lines2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        
        return dp;
    }

    /**
     * 判断两行是否相似（可能是修改）
     */
    areSimilar(line1, line2) {
        if (!line1 || !line2) return false;
        
        // 计算相似度
        const similarity = this.calculateSimilarity(line1, line2);
        return similarity > 0.6; // 相似度阈值
    }

    /**
     * 计算字符串相似度
     */
    calculateSimilarity(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0 && len2 === 0) return 1;
        if (len1 === 0 || len2 === 0) return 0;
        
        const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
        
        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;
        
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        
        const distance = matrix[len1][len2];
        const maxLen = Math.max(len1, len2);
        return 1 - distance / maxLen;
    }

    /**
     * 检查某行是否在指定范围内有匹配
     */
    hasMatchInRange(line, lines, start, end) {
        for (let i = start; i < end; i++) {
            if (lines[i] === line) return true;
        }
        return false;
    }

    /**
     * 显示差异结果
     */
    displayDiff(diff) {
        const elements = this.getDOMElements();
        
        if (!elements.leftDiff || !elements.rightDiff) return;
        
        elements.leftDiff.innerHTML = '';
        elements.rightDiff.innerHTML = '';

        let addedLines = 0;
        let removedLines = 0;
        let modifiedLines = 0;

        diff.forEach((item) => {
            const leftLine = document.createElement('div');
            const rightLine = document.createElement('div');
            
            leftLine.className = 'diff-line';
            rightLine.className = 'diff-line';

            switch (item.type) {
                case 'unchanged':
                    leftLine.textContent = item.left || '';
                    rightLine.textContent = item.right || '';
                    break;
                case 'removed':
                    leftLine.textContent = item.left || '';
                    leftLine.classList.add('removed');
                    rightLine.innerHTML = '<span class="empty-line">（已删除）</span>';
                    removedLines++;
                    break;
                case 'added':
                    leftLine.innerHTML = '<span class="empty-line">（新增）</span>';
                    rightLine.textContent = item.right || '';
                    rightLine.classList.add('added');
                    addedLines++;
                    break;
                case 'modified':
                    // 为修改的行提供字符级差异高亮
                    const charDiff = this.computeCharDiff(item.left || '', item.right || '');
                    leftLine.innerHTML = this.renderCharDiff(charDiff.left);
                    rightLine.innerHTML = this.renderCharDiff(charDiff.right);
                    leftLine.classList.add('modified');
                    rightLine.classList.add('modified');
                    modifiedLines++;
                    break;
            }

            elements.leftDiff.appendChild(leftLine);
            elements.rightDiff.appendChild(rightLine);
        });

        // 更新统计信息
        if (elements.addedLines) elements.addedLines.textContent = addedLines;
        if (elements.removedLines) elements.removedLines.textContent = removedLines;
        if (elements.modifiedLines) elements.modifiedLines.textContent = modifiedLines;
    }

    /**
     * 计算字符级差异
     */
    computeCharDiff(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
        
        // 构建编辑距离矩阵
        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;
        
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j] + 1,     // 删除
                        matrix[i][j - 1] + 1,     // 插入
                        matrix[i - 1][j - 1] + 1  // 替换
                    );
                }
            }
        }
        
        // 回溯生成差异
        const leftResult = [];
        const rightResult = [];
        let i = len1, j = len2;
        
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && str1[i - 1] === str2[j - 1]) {
                leftResult.unshift({ type: 'same', char: str1[i - 1] });
                rightResult.unshift({ type: 'same', char: str2[j - 1] });
                i--; j--;
            } else if (i > 0 && (j === 0 || matrix[i - 1][j] <= matrix[i][j - 1])) {
                leftResult.unshift({ type: 'removed', char: str1[i - 1] });
                i--;
            } else {
                rightResult.unshift({ type: 'added', char: str2[j - 1] });
                j--;
            }
        }
        
        return { left: leftResult, right: rightResult };
    }

    /**
     * 渲染字符级差异
     */
    renderCharDiff(charDiff) {
        return charDiff.map(item => {
            const char = this.escapeHtml(item.char);
            switch (item.type) {
                case 'same':
                    return char;
                case 'added':
                    return `<span class="char-added">${char}</span>`;
                case 'removed':
                    return `<span class="char-removed">${char}</span>`;
                default:
                    return char;
            }
        }).join('');
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 获取对比统计信息
     */
    getComparisonStats(diff) {
        const stats = { added: 0, removed: 0, modified: 0, unchanged: 0 };
        
        diff.forEach(item => {
            stats[item.type]++;
        });
        
        return stats;
    }

    /**
     * 显示结果
     */
    showResults() {
        const elements = this.getDOMElements();
        if (elements.resultContainer) {
            elements.resultContainer.style.display = 'block';
        }
    }

    /**
     * 隐藏结果
     */
    hideResults() {
        const elements = this.getDOMElements();
        if (elements.resultContainer) {
            elements.resultContainer.style.display = 'none';
        }
    }

    /**
     * 清空文本
     */
    clear() {
        const elements = this.getDOMElements();
        
        if (elements.leftTextArea) elements.leftTextArea.value = '';
        if (elements.rightTextArea) elements.rightTextArea.value = '';
        
        this.leftText = '';
        this.rightText = '';
        this.updateCharCounts();
        this.hideResults();
        
        this.eventBus.emit('textDiff:cleared');
    }

    /**
     * 交换文本
     */
    swap() {
        const elements = this.getDOMElements();
        
        if (elements.leftTextArea && elements.rightTextArea) {
            const temp = elements.leftTextArea.value;
            elements.leftTextArea.value = elements.rightTextArea.value;
            elements.rightTextArea.value = temp;
            
            this.leftText = elements.leftTextArea.value;
            this.rightText = elements.rightTextArea.value;
            
            this.updateCharCounts();
            this.autoCompare();
            
            this.eventBus.emit('textDiff:swapped');
        }
    }

    /**
     * 加载示例
     */
    loadExample() {
        const example1 = `广西心连心公司员工手册（第一版）

第一章 公司简介
广西心连心公司成立于2020年，是一家专注于提供优质服务的企业。
我们的使命是为客户创造价值，为员工提供发展平台。

第二章 员工行为准则
1. 诚信为本，客户至上
2. 团队合作，共同进步
3. 持续学习，追求卓越

第三章 工作制度
工作时间：周一至周五 9:00-18:00
午休时间：12:00-13:00
加班需要提前申请并获得主管批准。`;

        const example2 = `广西心连心公司员工手册（第二版）

第一章 公司简介
广西心连心公司成立于2020年，是一家专注于提供优质服务和创新解决方案的企业。
我们的使命是为客户创造最大价值，为员工提供广阔的发展平台和成长机会。

第二章 员工行为准则
1. 诚信为本，客户至上
2. 团队合作，互助共赢
3. 持续学习，追求卓越
4. 创新思维，勇于突破

第三章 工作制度
工作时间：周一至周五 9:00-18:00
午休时间：12:00-14:00
弹性工作制度：核心工作时间10:00-16:00
加班需要提前申请并获得直属主管批准。

第四章 福利待遇
1. 五险一金
2. 年度体检
3. 培训津贴
4. 节日福利`;

        const elements = this.getDOMElements();
        
        if (elements.leftTextArea) elements.leftTextArea.value = example1;
        if (elements.rightTextArea) elements.rightTextArea.value = example2;
        
        this.leftText = example1;
        this.rightText = example2;
        this.updateCharCounts();
        this.compare();
        
        this.eventBus.emit('textDiff:exampleLoaded');
    }

    /**
     * 销毁模块
     */
    destroy() {
        clearTimeout(this.diffTimeout);
        this.eventBus.off('textDiff:compare');
        this.eventBus.off('textDiff:clear');
        this.eventBus.off('textDiff:swap');
        this.eventBus.off('textDiff:loadExample');
        this.initialized = false;
    }
}

// 注册模块到依赖容器
function registerTextDiffModule(container, eventBus) {
    container.register('textDiffModule', TextDiffModule, {
        dependencies: ['container', 'eventBus'],
        singleton: true,
        lazy: true
    });
}

// 导出
if (typeof window !== 'undefined') {
    window.TextDiffModule = TextDiffModule;
    window.registerTextDiffModule = registerTextDiffModule;
}