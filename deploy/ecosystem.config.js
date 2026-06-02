module.exports = {
  apps: [{
    name: 'dalang-api',
    script: 'dist/server.js',
    cwd: '/home/dalang/backend',
    env: {
      NODE_ENV: 'production',
    },
    // 崩溃自动重启
    autorestart: true,
    // 内存超限重启（SQLite 小项目 256M 足够）
    max_memory_restart: '256M',
    // 日志
    out_file: '/home/dalang/logs/out.log',
    error_file: '/home/dalang/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    // 监听文件变化不重启（生产环境）
    watch: false,
  }]
};
