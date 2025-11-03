// 工具集合主控制器
class ToolsController {
    constructor() {
        this.currentTool = 'text-correction';
        this.textDiffer = null;
        this.init();
    }

    init() {
        this.initNavigation();
        this.initTextDiff();
    }

    // 初始化导航
    initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const tool = item.dataset.tool;
                if (!item.classList.contains('disabled')) {
                    this.switchTool(tool);
                }
            });
        });
    }

    // 切换工具
    switchTool(toolName) {
        // 更新导航状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tool="${toolName}"]`).classList.add('active');

        // 更新工具模块显示
        document.querySelectorAll('.tool-module').forEach(module => {
            module.classList.remove('active');
        });

        if (toolName === 'text-correction') {
            document.getElementById('textCorrectionModule').classList.add('active');
        } else if (toolName === 'text-diff') {
            document.getElementById('textDiffModule').classList.add('active');
        }

        this.currentTool = toolName;
    }

    // 初始化文本对比功能
    async initTextDiff() {
        try {
            // 等待应用初始化完成
            if (!window.container) {
                // 监听应用就绪事件
                if (window.eventBus) {
                    window.eventBus.on('app:ready', () => {
                        this.initTextDiffModule();
                    });
                } else {
                    // 如果eventBus也没有，延迟重试
                    setTimeout(() => this.initTextDiff(), 100);
                }
                return;
            }
            
            await this.initTextDiffModule();
        } catch (error) {
            console.error('Failed to initialize text diff module:', error);
            // 降级处理：如果模块加载失败，可以显示错误信息
            window.eventBus?.emit('error', {
                message: '文本对比功能初始化失败',
                error
            });
        }
    }

    // 初始化文本对比模块
    async initTextDiffModule() {
        try {
            // 获取文本对比模块
            this.textDiffer = await window.container.get('textDiffModule');
            await this.textDiffer.initialize();
        } catch (error) {
            console.error('Failed to get text diff module:', error);
            throw error;
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化，确保所有脚本都已加载
    setTimeout(() => {
        new ToolsController();
    }, 500);
});