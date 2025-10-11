const Service = require('node-windows').Service;
const path = require('path');

// 创建服务对象
const svc = new Service({
  name: 'XinLianXin Text Correction',
  description: '心连心文本纠错服务 - 基于讯飞星火API的智能文本纠错系统',
  script: path.join(__dirname, 'server.js'),
  
  // Node.js 参数
  nodeOptions: [
    '--harmony',
    '--max-old-space-size=1024'
  ],
  
  // 环境变量
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    },
    {
      name: "PORT", 
      value: "3003"
    }
  ],
  
  // 工作目录
  workingDirectory: __dirname,
  
  // 服务配置
  allowServiceLogon: true,
  
  // 日志配置
  logpath: path.join(__dirname, 'logs'),
  
  // 重启配置
  maxRestarts: 3,
  maxRetries: 60,
  
  // 等待时间
  wait: 2,
  grow: 0.5
});

// 监听安装事件
svc.on('install', function() {
  console.log('✅ Windows服务安装成功！');
  console.log('服务名称: XinLianXin Text Correction');
  console.log('启动服务...');
  svc.start();
});

// 监听启动事件
svc.on('start', function() {
  console.log('✅ 服务启动成功！');
  console.log('访问地址: http://localhost:3003');
  console.log('');
  console.log('管理命令:');
  console.log('- 查看服务状态: services.msc');
  console.log('- 停止服务: net stop "XinLianXin Text Correction"');
  console.log('- 启动服务: net start "XinLianXin Text Correction"');
  console.log('- 卸载服务: node windows-service-uninstall.js');
});

// 监听错误事件
svc.on('error', function(err) {
  console.error('❌ 服务错误:', err);
});

// 检查服务是否已存在
svc.on('alreadyinstalled', function() {
  console.log('⚠️  服务已存在，正在启动...');
  svc.start();
});

// 安装服务
console.log('🔧 正在安装Windows服务...');
console.log('服务名称: XinLianXin Text Correction');
console.log('脚本路径:', path.join(__dirname, 'server.js'));
console.log('工作目录:', __dirname);
console.log('');

svc.install();