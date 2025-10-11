const Service = require('node-windows').Service;
const path = require('path');

// 创建服务对象（需要与安装时的配置一致）
const svc = new Service({
  name: 'XinLianXin Text Correction',
  description: '心连心文本纠错服务 - 基于讯飞星火API的智能文本纠错系统',
  script: path.join(__dirname, 'server.js')
});

// 监听卸载事件
svc.on('uninstall', function() {
  console.log('✅ Windows服务卸载成功！');
  console.log('服务 "XinLianXin Text Correction" 已从系统中移除');
});

// 监听错误事件
svc.on('error', function(err) {
  console.error('❌ 卸载服务时发生错误:', err);
});

// 监听服务不存在事件
svc.on('doesnotexist', function() {
  console.log('⚠️  服务不存在，无需卸载');
});

// 卸载服务
console.log('🔧 正在卸载Windows服务...');
console.log('服务名称: XinLianXin Text Correction');
console.log('');

// 先尝试停止服务
svc.on('stop', function() {
  console.log('✅ 服务已停止');
  // 停止后卸载
  svc.uninstall();
});

// 停止服务
console.log('正在停止服务...');
svc.stop();