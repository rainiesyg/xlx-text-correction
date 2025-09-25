/**
 * 用户体验管理器
 * 负责提供进度指示、实时反馈、错误统计等用户体验功能
 */
class UserExperienceManager {
    constructor(config) {
        this.config = config;
        this.progressCallbacks = new Map();
        this.statistics = {
            totalErrors: 0,
            errorsByType: {},
            processingTime: 0,
            lastProcessedAt: null
        };
        this.feedbackQueue = [];
        this.isProcessing = false;
        
        this.initializeUI();
    }

    /**
     * 初始化用户界面元素
     */
    initializeUI() {
        // 创建进度条容器
        this.createProgressBar();
        
        // 创建统计面板
        this.createStatisticsPanel();
        
        // 创建实时反馈容器
        this.createFeedbackContainer();
    }

    /**
     * 创建进度条
     */
    createProgressBar() {
        const existingProgress = document.getElementById('progressContainer');
        if (existingProgress) {
            existingProgress.remove();
        }

        const progressContainer = document.createElement('div');
        progressContainer.id = 'progressContainer';
        progressContainer.className = 'progress-container';
        progressContainer.style.display = 'none';
        
        progressContainer.innerHTML = `
            <div class="progress-header">
                <span class="progress-title">处理进度</span>
                <span class="progress-percentage">0%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="progress-details">
                <span class="progress-current">0</span> / 
                <span class="progress-total">0</span> 项已处理
            </div>
        `;
        
        document.body.appendChild(progressContainer);
    }

    /**
     * 创建统计面板
     */
    createStatisticsPanel() {
        const existingStats = document.getElementById('statisticsPanel');
        if (existingStats) {
            existingStats.remove();
        }

        const statsPanel = document.createElement('div');
        statsPanel.id = 'statisticsPanel';
        statsPanel.className = 'statistics-panel';
        statsPanel.style.display = 'none';
        
        statsPanel.innerHTML = `
            <div class="stats-header">
                <h4><i class="fas fa-chart-bar"></i> 纠错统计</h4>
                <button class="stats-toggle" id="statsToggle">
                    <i class="fas fa-chevron-up"></i>
                </button>
            </div>
            <div class="stats-content" id="statsContent">
                <div class="stats-summary">
                    <div class="stat-item">
                        <span class="stat-label">总错误数</span>
                        <span class="stat-value" id="totalErrorsCount">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">处理时间</span>
                        <span class="stat-value" id="processingTimeValue">0ms</span>
                    </div>
                </div>
                <div class="stats-breakdown" id="statsBreakdown">
                    <!-- 错误类型统计将在这里显示 -->
                </div>
            </div>
        `;
        
        document.body.appendChild(statsPanel);
        
        // 绑定折叠/展开事件
        const toggleBtn = document.getElementById('statsToggle');
        const content = document.getElementById('statsContent');
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = content.style.display === 'none';
            content.style.display = isCollapsed ? 'block' : 'none';
            toggleBtn.innerHTML = isCollapsed ? 
                '<i class="fas fa-chevron-up"></i>' : 
                '<i class="fas fa-chevron-down"></i>';
        });
    }

    /**
     * 创建实时反馈容器
     */
    createFeedbackContainer() {
        const existingFeedback = document.getElementById('feedbackContainer');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        const feedbackContainer = document.createElement('div');
        feedbackContainer.id = 'feedbackContainer';
        feedbackContainer.className = 'feedback-container';
        
        document.body.appendChild(feedbackContainer);
    }

    /**
     * 开始处理进度跟踪
     * @param {number} total - 总项目数
     * @param {string} title - 进度标题
     */
    startProgress(total, title = '处理进度') {
        this.isProcessing = true;
        const progressContainer = document.getElementById('progressContainer');
        const progressTitle = progressContainer.querySelector('.progress-title');
        const progressTotal = progressContainer.querySelector('.progress-total');
        
        progressTitle.textContent = title;
        progressTotal.textContent = total;
        progressContainer.style.display = 'block';
        
        this.updateProgress(0, total);
    }

    /**
     * 更新进度
     * @param {number} current - 当前进度
     * @param {number} total - 总数
     */
    updateProgress(current, total) {
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        
        const progressFill = document.getElementById('progressFill');
        const progressPercentage = document.querySelector('.progress-percentage');
        const progressCurrent = document.querySelector('.progress-current');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        if (progressPercentage) {
            progressPercentage.textContent = `${percentage}%`;
        }
        if (progressCurrent) {
            progressCurrent.textContent = current;
        }
    }

    /**
     * 完成进度跟踪
     */
    completeProgress() {
        this.isProcessing = false;
        const progressContainer = document.getElementById('progressContainer');
        
        setTimeout(() => {
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
        }, 1000);
    }

    /**
     * 显示实时反馈
     * @param {string} message - 反馈消息
     * @param {string} type - 消息类型 (info, success, warning, error)
     * @param {number} duration - 显示时长（毫秒）
     */
    showFeedback(message, type = 'info', duration = 3000) {
        const feedbackContainer = document.getElementById('feedbackContainer');
        if (!feedbackContainer) return;

        const feedbackItem = document.createElement('div');
        feedbackItem.className = `feedback-item feedback-${type}`;
        feedbackItem.innerHTML = `
            <div class="feedback-content">
                <i class="fas ${this.getFeedbackIcon(type)}"></i>
                <span class="feedback-message">${message}</span>
            </div>
            <button class="feedback-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // 添加关闭事件
        const closeBtn = feedbackItem.querySelector('.feedback-close');
        closeBtn.addEventListener('click', () => {
            this.removeFeedback(feedbackItem);
        });

        feedbackContainer.appendChild(feedbackItem);
        
        // 自动移除
        if (duration > 0) {
            setTimeout(() => {
                this.removeFeedback(feedbackItem);
            }, duration);
        }

        // 限制反馈数量
        this.limitFeedbackItems();
    }

    /**
     * 获取反馈图标
     * @param {string} type - 消息类型
     * @returns {string} - 图标类名
     */
    getFeedbackIcon(type) {
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * 移除反馈项
     * @param {HTMLElement} feedbackItem - 反馈项元素
     */
    removeFeedback(feedbackItem) {
        if (feedbackItem && feedbackItem.parentNode) {
            feedbackItem.style.opacity = '0';
            feedbackItem.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (feedbackItem.parentNode) {
                    feedbackItem.parentNode.removeChild(feedbackItem);
                }
            }, 300);
        }
    }

    /**
     * 限制反馈项数量
     */
    limitFeedbackItems() {
        const feedbackContainer = document.getElementById('feedbackContainer');
        const items = feedbackContainer.querySelectorAll('.feedback-item');
        const maxItems = 5;
        
        if (items.length > maxItems) {
            for (let i = 0; i < items.length - maxItems; i++) {
                this.removeFeedback(items[i]);
            }
        }
    }

    /**
     * 更新统计信息
     * @param {Array} errors - 错误数组
     * @param {number} processingTime - 处理时间
     */
    updateStatistics(errors, processingTime) {
        this.statistics.totalErrors = errors.length;
        this.statistics.processingTime = processingTime;
        this.statistics.lastProcessedAt = new Date();
        this.statistics.errorsByType = {};

        // 统计各类型错误数量
        errors.forEach(error => {
            const type = error.type || 'unknown';
            this.statistics.errorsByType[type] = (this.statistics.errorsByType[type] || 0) + 1;
        });

        this.renderStatistics();
    }

    /**
     * 渲染统计信息
     */
    renderStatistics() {
        const totalErrorsCount = document.getElementById('totalErrorsCount');
        const processingTimeValue = document.getElementById('processingTimeValue');
        const statsBreakdown = document.getElementById('statsBreakdown');
        const statsPanel = document.getElementById('statisticsPanel');

        if (totalErrorsCount) {
            totalErrorsCount.textContent = this.statistics.totalErrors;
        }
        
        if (processingTimeValue) {
            processingTimeValue.textContent = `${this.statistics.processingTime}ms`;
        }

        if (statsBreakdown) {
            statsBreakdown.innerHTML = '';
            
            Object.entries(this.statistics.errorsByType).forEach(([type, count]) => {
                const errorConfig = this.config?.ERROR_TYPES?.[type];
                const displayName = errorConfig?.displayName || type;
                const color = errorConfig?.color || '#666';
                
                const breakdownItem = document.createElement('div');
                breakdownItem.className = 'stats-breakdown-item';
                breakdownItem.innerHTML = `
                    <div class="breakdown-label">
                        <span class="breakdown-color" style="background-color: ${color}"></span>
                        <span class="breakdown-name">${displayName}</span>
                    </div>
                    <span class="breakdown-count">${count}</span>
                `;
                
                statsBreakdown.appendChild(breakdownItem);
            });
        }

        // 显示统计面板
        if (statsPanel && this.statistics.totalErrors > 0) {
            statsPanel.style.display = 'block';
        }
    }

    /**
     * 重置统计信息
     */
    resetStatistics() {
        this.statistics = {
            totalErrors: 0,
            errorsByType: {},
            processingTime: 0,
            lastProcessedAt: null
        };
        
        const statsPanel = document.getElementById('statisticsPanel');
        if (statsPanel) {
            statsPanel.style.display = 'none';
        }
    }

    /**
     * 获取统计信息
     * @returns {Object} - 统计数据
     */
    getStatistics() {
        return { ...this.statistics };
    }

    /**
     * 清理资源
     */
    cleanup() {
        // 清理进度条
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) {
            progressContainer.remove();
        }

        // 清理统计面板
        const statsPanel = document.getElementById('statisticsPanel');
        if (statsPanel) {
            statsPanel.remove();
        }

        // 清理反馈容器
        const feedbackContainer = document.getElementById('feedbackContainer');
        if (feedbackContainer) {
            feedbackContainer.remove();
        }

        // 重置状态
        this.progressCallbacks.clear();
        this.feedbackQueue = [];
        this.isProcessing = false;
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserExperienceManager;
}