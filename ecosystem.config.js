/**
 * @file PM2 进程管理配置文件
 * @desc LIMS Next.js 应用的生产级进程管理配置
 * @see https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [{
    // 应用基本信息
    name: 'lims-next',
    script: '.next/standalone/server.js',
    cwd: '/Users/wangpeng/Downloads/limsnext',

    // 实例配置
    instances: 1,                    // 单实例（开发环境）
    exec_mode: 'fork',               // fork 模式（cluster 模式需要 Next.js 适配）

    // 自动重启策略
    autorestart: true,               // 崩溃自动重启
    watch: false,                    // 生产环境不监听文件变化
    max_memory_restart: '1G',        // 内存超过 1GB 自动重启
    restart_delay: 4000,             // 重启延迟 4 秒
    max_restarts: 10,                // 1 分钟内最多重启 10 次
    min_uptime: '10s',               // 最小运行时间 10 秒（低于此值视为异常）

    // 环境变量
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
    },

    // 日志配置
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    log_type: 'json',

    // 进程行为
    kill_timeout: 5000,              // 强制杀死前等待 5 秒
    listen_timeout: 10000,           // 等待应用监听端口的超时时间
    shutdown_with_message: true,     // 允许优雅关闭

    // 健康检查（需要创建 /api/health 端点）
    // 注意：PM2 内置健康检查在免费版中有限，这里使用外部脚本
  }],

  // 部署配置（可选）
  deploy: {
    production: {
      user: 'root',
      host: '8.130.182.148',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/lims-next.git',
      path: '/root/lims-next',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
}
