# Zeabur 强制部署指导

## 当前状态
- GitHub最新提交: `8a739a5` - 触发Zeabur重新部署
- 测试服务器: `test-server.js` 已配置
- 配置文件: `zeabur.json`, `package.json`, `Dockerfile` 已优化

## 如果Zeabur仍未同步，请按以下步骤操作：

### 方法1: Zeabur控制台手动重新部署
1. 登录 https://dash.zeabur.com
2. 进入项目 `xinlianxin-text-correction`
3. 点击服务名称
4. 点击右上角 "Redeploy" 按钮
5. 选择 "Redeploy" 确认

### 方法2: 检查Zeabur GitHub集成
1. 在Zeabur控制台检查 "Settings" → "Git"
2. 确认连接的仓库是: `rainiesyg/xlx-text-correction`
3. 确认分支是: `main`
4. 如果连接有问题，重新连接GitHub仓库

### 方法3: 删除并重新创建服务
1. 在Zeabur控制台删除当前服务
2. 重新从GitHub导入项目
3. 选择正确的仓库和分支

## 测试服务器配置
- 入口文件: `test-server.js`
- 启动命令: `node test-server.js`
- 健康检查: `/health`
- 端口: 自动检测 `process.env.PORT`

## 预期结果
部署成功后应该能访问:
- 根路径: 返回服务器信息JSON
- 健康检查: `/health` 返回 `{"status":"ok"}`