module.exports = {
  apps: [{
    name: 'xinlianxin-text-correction',
    script: 'server.js',
    instances: 'max', // 使用所有CPU核心
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3003
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3003,
      IFLYTEK_APPID: process.env.IFLYTEK_APPID || '27d422bd',
      IFLYTEK_API_SECRET: process.env.IFLYTEK_API_SECRET || 'NjRmZjM4NGUzZGFkNTUxZjM3NzQxYjJh',
      IFLYTEK_API_KEY: process.env.IFLYTEK_API_KEY || 'f362096d765f0452321a6f4c51a5d735'
    },
    // 日志配置
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 进程管理
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    
    // 监控和重启
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    
    // 健康检查
    health_check_grace_period: 3000,
    
    // 其他配置
    merge_logs: true,
    time: true
  }],

  deploy: {
    production: {
      user: 'root',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/your-repo.git',
      path: '/var/www/xinlianxin-text-correction',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};