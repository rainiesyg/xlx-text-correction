# 模块解耦架构文档

## 概述

本项目已经重构为基于依赖注入容器和事件总线的松耦合架构，旨在提高代码的可维护性、可测试性和可扩展性。

## 核心组件

### 1. 依赖注入容器 (DependencyContainer)

**位置**: `public/dependencyContainer.js`

**功能**:
- 管理服务的注册、创建和生命周期
- 自动解析服务依赖关系
- 检测和防止循环依赖
- 支持单例和工厂模式
- 提供服务状态监控

**使用示例**:
```javascript
// 注册服务
container.register('apiClient', (container) => {
    const config = container.get('config');
    const errorHandler = container.get('errorHandler');
    return new ApiClient({ config, errorHandler });
});

// 获取服务实例
const apiClient = container.get('apiClient');
```

### 2. 事件总线 (EventBus)

**位置**: `public/eventBus.js`

**功能**:
- 实现发布/订阅模式
- 支持同步和异步事件处理
- 提供事件中间件机制
- 事件历史记录和统计
- 支持一次性监听器

**使用示例**:
```javascript
// 监听事件
eventBus.on('text:correct:request', async (event) => {
    const { text } = event.data;
    // 处理纠错请求
});

// 发布事件
eventBus.emit('ui:loading:start', { message: '正在处理...' });
```

## 架构优势

### 1. 松耦合
- 模块间通过事件通信，减少直接依赖
- 支持模块的独立开发和测试
- 易于替换和升级单个模块

### 2. 可扩展性
- 新功能可以作为独立模块添加
- 通过事件系统与现有功能集成
- 支持插件化架构

### 3. 可测试性
- 依赖注入便于模拟和测试
- 事件驱动的架构易于单元测试
- 清晰的模块边界

### 4. 可维护性
- 职责分离，每个模块专注于特定功能
- 统一的错误处理和日志记录
- 配置驱动的行为控制

## 核心事件

### 应用生命周期事件
- `app:ready` - 应用初始化完成
- `app:error` - 应用错误

### 文本处理事件
- `text:correct:request` - 文本纠错请求
- `text:correct:success` - 文本纠错成功
- `text:correct:error` - 文本纠错失败
- `file:correct:request` - 文件纠错请求
- `file:correct:success` - 文件纠错成功
- `file:correct:error` - 文件纠错失败

### UI事件
- `ui:loading:start` - 开始加载
- `ui:loading:stop` - 停止加载
- `ui:message:show` - 显示消息
- `ui:text:changed` - 文本内容变更
- `ui:file:selected` - 文件选择
- `ui:state:update` - UI状态更新

### 结果处理事件
- `result:processed` - 结果处理完成

### 快捷键事件
- `shortcut:docs` - 文档快捷键
- `shortcut:tests` - 测试快捷键

## 服务注册

当前注册的核心服务：

1. **config** - 配置管理
2. **errorHandler** - 错误处理
3. **apiClient** - API客户端
4. **cacheManager** - 缓存管理
5. **textProcessor** - 文本处理
6. **uiManager** - UI管理
7. **uxManager** - 用户体验管理（可选）
8. **docGenerator** - 文档生成器（可选）
9. **testManager** - 测试管理器（可选）

## 添加新模块

### 1. 创建模块类

```javascript
class MyNewModule {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus;
        this.config = dependencies.config;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        if (!this.eventBus) return;
        
        this.eventBus.on('some:event', (event) => {
            this.handleEvent(event.data);
        });
    }
    
    handleEvent(data) {
        // 处理事件
        
        // 发布新事件
        this.eventBus.emit('my:module:processed', { result: data });
    }
}
```

### 2. 注册服务

```javascript
// 在 script.js 的 registerServices 方法中添加
this.container.register('myNewModule', (container) => {
    const config = container.get('config');
    return new MyNewModule({
        eventBus: this.eventBus,
        config
    });
});
```

### 3. 使用模块

```javascript
// 获取模块实例
const myModule = app.getService('myNewModule');

// 通过事件与模块交互
app.eventBus.emit('some:event', { data: 'test' });
```

## 最佳实践

### 1. 依赖管理
- 通过构造函数接收依赖
- 提供默认值和降级处理
- 避免直接访问全局变量

### 2. 事件设计
- 使用命名空间组织事件（如 `ui:`, `text:`, `file:`）
- 事件数据结构保持一致
- 提供详细的事件文档

### 3. 错误处理
- 统一的错误处理机制
- 错误事件的发布和监听
- 优雅的降级处理

### 4. 性能考虑
- 避免过度的事件发布
- 合理使用事件中间件
- 及时清理事件监听器

### 5. 测试策略
- 模拟依赖进行单元测试
- 测试事件的发布和监听
- 集成测试验证模块协作

## 迁移指南

### 从旧架构迁移

1. **识别依赖关系**
   - 分析模块间的直接调用
   - 识别全局变量的使用

2. **重构构造函数**
   - 添加依赖参数
   - 移除全局变量访问

3. **实现事件通信**
   - 将直接方法调用改为事件发布
   - 添加事件监听器

4. **更新服务注册**
   - 在容器中注册新模块
   - 配置依赖关系

## 故障排除

### 常见问题

1. **循环依赖**
   - 检查服务注册的依赖链
   - 使用事件总线打破循环依赖

2. **事件未触发**
   - 确认事件名称拼写正确
   - 检查事件监听器是否正确注册

3. **服务未找到**
   - 确认服务已在容器中注册
   - 检查服务名称是否正确

### 调试工具

```javascript
// 查看容器状态
console.log(app.container.getStatus());

// 查看事件总线统计
console.log(app.eventBus.getStats());

// 监听所有事件（调试用）
app.eventBus.use((event, next) => {
    console.log('Event:', event.type, event.data);
    next();
});
```

## 性能监控

### 关键指标
- 服务创建时间
- 事件处理延迟
- 内存使用情况
- 错误率统计

### 监控代码示例

```javascript
// 监控事件性能
app.eventBus.use((event, next) => {
    const start = performance.now();
    next();
    const duration = performance.now() - start;
    
    if (duration > 100) {
        console.warn(`慢事件: ${event.type} 耗时 ${duration}ms`);
    }
});
```

## 总结

新的模块解耦架构通过依赖注入容器和事件总线实现了：

- **更好的代码组织**: 清晰的模块边界和职责分离
- **提高的可测试性**: 依赖注入便于模拟和测试
- **增强的可扩展性**: 插件化架构支持功能扩展
- **改善的可维护性**: 松耦合设计降低维护成本

这种架构为项目的长期发展奠定了坚实的基础，支持团队协作和功能迭代。