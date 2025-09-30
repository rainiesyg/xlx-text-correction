# 🚀 Git仓库设置指南

本指南将帮助你将项目推送到GitHub或GitLab。

## ✅ 本地Git仓库已准备完成

✅ Git仓库已初始化  
✅ 用户信息已配置  
✅ 所有文件已添加到暂存区  
✅ 初始提交已完成 (34个文件，15175行代码)

## 🌐 创建远程仓库

### 方式一：GitHub (推荐)

#### 1. 登录GitHub
- 访问：https://github.com
- 登录你的GitHub账号

#### 2. 创建新仓库
- 点击右上角 `+` → `New repository`
- 仓库名称：`xinlianxin-text-correction` 或你喜欢的名称
- 描述：`心联心文本纠错系统 - 基于科大讯飞API的智能文本纠错工具`
- 设置为 `Public` (公开) 或 `Private` (私有)
- **不要**勾选 `Add a README file`
- **不要**勾选 `Add .gitignore`
- **不要**勾选 `Choose a license`
- 点击 `Create repository`

#### 3. 获取仓库地址
创建完成后，GitHub会显示仓库地址，类似：
```
https://github.com/your-username/xinlianxin-text-correction.git
```

### 方式二：GitLab

#### 1. 登录GitLab
- 访问：https://gitlab.com
- 登录你的GitLab账号

#### 2. 创建新项目
- 点击 `New project` → `Create blank project`
- 项目名称：`xinlianxin-text-correction`
- 项目描述：`心联心文本纠错系统 - 基于科大讯飞API的智能文本纠错工具`
- 可见性级别：`Private` 或 `Public`
- **不要**勾选 `Initialize repository with a README`
- 点击 `Create project`

#### 3. 获取仓库地址
创建完成后，GitLab会显示仓库地址，类似：
```
https://gitlab.com/your-username/xinlianxin-text-correction.git
```

## 🔗 连接远程仓库并推送代码

### 步骤1：添加远程仓库地址
```bash
# 将 YOUR_REPO_URL 替换为你的实际仓库地址
git remote add origin YOUR_REPO_URL

# 例如 GitHub:
# git remote add origin https://github.com/your-username/xinlianxin-text-correction.git

# 例如 GitLab:
# git remote add origin https://gitlab.com/your-username/xinlianxin-text-correction.git
```

### 步骤2：推送代码到远程仓库
```bash
# 推送到main分支
git branch -M main
git push -u origin main
```

### 步骤3：验证推送成功
```bash
# 检查远程仓库状态
git remote -v
git status
```

## 🔐 身份验证

### GitHub身份验证

#### 方式1：Personal Access Token (推荐)
1. 访问：https://github.com/settings/tokens
2. 点击 `Generate new token` → `Generate new token (classic)`
3. 设置Token名称：`xinlianxin-text-correction`
4. 选择权限：勾选 `repo` (完整仓库访问权限)
5. 点击 `Generate token`
6. **复制并保存Token** (只显示一次)

推送时使用Token作为密码：
```bash
Username: your-github-username
Password: your-personal-access-token
```

#### 方式2：SSH密钥 (高级用户)
```bash
# 生成SSH密钥
ssh-keygen -t ed25519 -C "your.email@example.com"

# 添加到SSH代理
ssh-add ~/.ssh/id_ed25519

# 复制公钥到GitHub
cat ~/.ssh/id_ed25519.pub
```

然后在GitHub设置中添加SSH密钥：https://github.com/settings/keys

### GitLab身份验证

#### 方式1：Personal Access Token
1. 访问：https://gitlab.com/-/profile/personal_access_tokens
2. 创建新Token，选择 `write_repository` 权限
3. 推送时使用Token

#### 方式2：SSH密钥
与GitHub类似，在GitLab设置中添加SSH密钥

## 📝 完整操作示例

### GitHub示例
```bash
# 1. 添加远程仓库
git remote add origin https://github.com/your-username/xinlianxin-text-correction.git

# 2. 设置主分支
git branch -M main

# 3. 推送代码
git push -u origin main
```

### GitLab示例
```bash
# 1. 添加远程仓库
git remote add origin https://gitlab.com/your-username/xinlianxin-text-correction.git

# 2. 设置主分支
git branch -M main

# 3. 推送代码
git push -u origin main
```

## 🎯 推送成功后的步骤

### 1. 验证仓库内容
访问你的GitHub/GitLab仓库页面，确认所有文件都已上传：
- ✅ 34个文件已上传
- ✅ README.md显示项目介绍
- ✅ 部署文档完整

### 2. 设置仓库描述和标签
在仓库设置中添加：
- **描述**：`心联心文本纠错系统 - 基于科大讯飞API的智能文本纠错工具`
- **标签**：`text-correction`, `iflytek`, `nodejs`, `ai`, `nlp`
- **主页**：如果有在线演示地址

### 3. 启用GitHub Pages (可选)
如果想要静态页面展示：
1. 进入仓库 Settings → Pages
2. Source选择 `Deploy from a branch`
3. Branch选择 `main` → `/` (root)
4. 保存设置

### 4. 配置自动部署
- **Zeabur**: 直接连接GitHub/GitLab仓库即可自动部署
- **Vercel**: 导入GitHub仓库，自动检测Node.js项目
- **Netlify**: 连接仓库，配置构建命令

## 🔄 日常开发流程

### 提交新更改
```bash
# 1. 查看更改
git status

# 2. 添加更改
git add .

# 3. 提交更改
git commit -m "描述你的更改"

# 4. 推送到远程
git push origin main
```

### 拉取远程更改
```bash
# 拉取最新代码
git pull origin main
```

## 🚨 常见问题解决

### 1. 推送被拒绝
```bash
# 错误：Updates were rejected because the remote contains work
# 解决：先拉取远程更改
git pull origin main --allow-unrelated-histories
git push origin main
```

### 2. 身份验证失败
```bash
# 错误：Authentication failed
# 解决：检查用户名和密码/Token是否正确
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 3. 远程仓库地址错误
```bash
# 查看当前远程地址
git remote -v

# 修改远程地址
git remote set-url origin NEW_URL
```

### 4. 分支名称问题
```bash
# 重命名分支为main
git branch -M main

# 或者推送到master分支
git push -u origin master
```

## 📚 相关资源

- [Git官方文档](https://git-scm.com/doc)
- [GitHub帮助文档](https://docs.github.com)
- [GitLab帮助文档](https://docs.gitlab.com)
- [Git可视化学习](https://learngitbranching.js.org)

---

**准备好了吗？现在就去创建你的远程仓库吧！** 🚀