# 502 Bad Gateway 错误分析报告

> 日期: 2026-01-30 | 项目: LIMS Next.js 应用

---

## 一、问题诊断

### 1.1 错误现象

```
Failed to load resource: the server responded with a status of 502 (Bad Gateway)
- main-app.js:1
- layout.js:1
- layout.css:1
```

### 1.2 根本原因

**核心问题：Next.js 应用服务未启动**

| 检查项 | 状态 | 说明 |
|--------|------|------|
| Node/Next 进程 | ❌ 未运行 | `ps aux \| grep next` 无结果 |
| 端口 3000 | ❌ 未监听 | `lsof -i :3000` 无结果 |
| PM2 进程管理 | ❌ 未安装 | `pm2 not found` |
| 数据库连接 | ✅ 正常 | DATABASE_URL 配置正确 |
| 构建产物 | ⚠️ 部分存在 | `.next/` 存在，但无 `standalone/` |

### 1.3 502 错误链路分析

```
浏览器请求 → Nginx/代理服务器 → 后端无响应 → 502 Bad Gateway
              ↓
          期望连接到 localhost:3000
              ↓
          但 Next.js 未启动 ❌
```

---

## 二、修复方案

### 2.1 立即修复（已执行）

```bash
# 启动开发服务器
npm run dev

# 验证服务
curl -I http://localhost:3000
# 返回: HTTP/1.1 307 Temporary Redirect ✅
```

**结果：服务已成功启动，应用恢复正常**

- 进程 PID: 42510
- 监听地址: http://localhost:3000
- 网络地址: http://192.168.244.163:3000

### 2.2 生产环境部署方案

#### 方案 A：使用 PM2 进程管理（推荐）

```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 创建 PM2 配置文件
cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'lims-next',
    script: 'npm',
    args: 'start',
    cwd: '/Users/wangpeng/Downloads/limsnext',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
}
EOF

# 3. 启动服务
pm2 start ecosystem.config.js

# 4. 设置开机自启
pm2 startup
pm2 save

# 5. 常用命令
pm2 status              # 查看状态
pm2 logs lims-next      # 查看日志
pm2 restart lims-next   # 重启
pm2 stop lims-next      # 停止
pm2 monit               # 实时监控
```

#### 方案 B：使用 Standalone 模式（轻量级）

```bash
# 1. 重新构建（生成 standalone）
npm run build

# 2. 启动 standalone 服务器
cd .next/standalone
PORT=3000 node server.js

# 3. 配合 systemd 守护进程（Linux）
cat > /etc/systemd/system/lims-next.service <<'EOF'
[Unit]
Description=LIMS Next.js Application
After=network.target

[Service]
Type=simple
User=rebekahweber5270
WorkingDirectory=/Users/wangpeng/Downloads/limsnext/.next/standalone
Environment="PORT=3000"
Environment="NODE_ENV=production"
ExecStart=/usr/local/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable lims-next
sudo systemctl start lims-next
```

---

## 三、监控与防护最佳实践

### 3.1 进程监控

#### 健康检查脚本

```bash
#!/bin/bash
# 文件: scripts/health-check.sh

HEALTH_URL="http://localhost:3000/api/health"
MAX_RETRIES=3
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
  HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}" $HEALTH_URL)

  if [ "$HTTP_CODE" = "200" ]; then
    echo "[OK] Service is healthy (HTTP $HTTP_CODE)"
    exit 0
  else
    echo "[WARN] Retry $i/$MAX_RETRIES - HTTP $HTTP_CODE"
    sleep $RETRY_DELAY
  fi
done

echo "[ERROR] Service is down, restarting..."
pm2 restart lims-next
exit 1
```

```bash
# 添加到 crontab（每 5 分钟检查一次）
*/5 * * * * /path/to/scripts/health-check.sh >> /var/log/lims-health.log 2>&1
```

#### 创建健康检查 API

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected'
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: (error as Error).message
    }, { status: 503 })
  }
}
```

### 3.2 日志管理

#### 结构化日志配置

```typescript
// src/lib/logger.ts
interface LogContext {
  requestId?: string
  userId?: string
  method?: string
  path?: string
  duration?: number
  [key: string]: unknown
}

class Logger {
  private formatLog(level: string, message: string, context?: LogContext) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      pid: process.pid,
      ...context
    })
  }

  info(message: string, context?: LogContext) {
    console.log(this.formatLog('INFO', message, context))
  }

  error(message: string, error: Error, context?: LogContext) {
    console.error(this.formatLog('ERROR', message, {
      ...context,
      error: error.message,
      stack: error.stack
    }))
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatLog('WARN', message, context))
  }
}

export const logger = new Logger()
```

#### 日志轮转配置（PM2）

```javascript
// ecosystem.config.js 增强版
module.exports = {
  apps: [{
    name: 'lims-next',
    script: 'npm',
    args: 'start',
    // ... 其他配置 ...

    // 日志轮转
    log_type: 'json',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',

    // 日志轮转策略
    max_size: '10M',
    max_files: 10,
    compress: true
  }]
}
```

### 3.3 错误监控与告警

#### Sentry 集成（推荐）

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,

  beforeSend(event) {
    // 过滤敏感信息
    if (event.request) {
      delete event.request.cookies
    }
    return event
  }
})
```

#### 自定义告警脚本

```bash
#!/bin/bash
# 文件: scripts/alert.sh

ALERT_EMAIL="admin@example.com"
SERVICE_NAME="LIMS Next.js"

if ! curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "Service $SERVICE_NAME is down!" | \
  mail -s "[ALERT] $SERVICE_NAME Down" $ALERT_EMAIL

  # 发送钉钉/企业微信通知
  curl -X POST "https://oapi.dingtalk.com/robot/send?access_token=xxx" \
    -H 'Content-Type: application/json' \
    -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"❌ $SERVICE_NAME 服务异常\"}}"
fi
```

### 3.4 性能监控

#### PM2 Keymetrics 监控

```bash
# 连接到 PM2 云监控
pm2 link <secret_key> <public_key>

# 或使用 PM2 Plus（免费版）
pm2 install pm2-server-monit
```

#### 自定义性能指标

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

export function middleware(request: NextRequest) {
  const start = Date.now()
  const requestId = crypto.randomUUID()

  const response = NextResponse.next()

  // 记录请求日志
  const duration = Date.now() - start
  logger.info('HTTP Request', {
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    duration,
    userAgent: request.headers.get('user-agent')
  })

  // 慢查询告警
  if (duration > 3000) {
    logger.warn('Slow request detected', {
      requestId,
      path: request.nextUrl.pathname,
      duration
    })
  }

  return response
}
```

### 3.5 资源限制

#### 内存泄漏监控

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    // ...
    max_memory_restart: '1G',  // 内存超过 1GB 自动重启

    // 监控内存使用
    exec_mode: 'cluster',
    instances: 2,

    // 定时重启（可选）
    cron_restart: '0 2 * * *'  // 每天凌晨 2 点重启
  }]
}
```

---

## 四、故障预防检查清单

### 4.1 部署前检查

- [ ] 环境变量完整（`.env` 文件）
- [ ] 数据库连接正常（`npx prisma db push`）
- [ ] 构建成功（`npm run build`）
- [ ] 依赖安装完整（`npm ci`）
- [ ] TypeScript 类型检查（`npx tsc --noEmit`）
- [ ] 端口未被占用（`lsof -i :3000`）

### 4.2 运行时监控

- [ ] 进程状态监控（PM2/systemd）
- [ ] 日志实时查看（`pm2 logs` / `journalctl`）
- [ ] 内存使用率（< 80%）
- [ ] CPU 使用率（< 70%）
- [ ] 磁盘空间（> 20% 可用）
- [ ] 数据库连接池（未耗尽）

### 4.3 定期维护

- [ ] 每周查看错误日志
- [ ] 每月更新依赖（`npm outdated`）
- [ ] 每季度性能优化
- [ ] 数据库索引优化
- [ ] 清理旧日志文件

---

## 五、常见问题 FAQ

### Q1: 为什么会出现 502 错误？

**A:** 502 表示反向代理（Nginx/Apache）无法连接到后端服务。常见原因：
1. Next.js 进程未启动 ✅ **本次原因**
2. 端口配置错误
3. 防火墙阻止
4. 应用崩溃/内存溢出

### Q2: 如何快速恢复服务？

```bash
# 方案 1: 重启 PM2
pm2 restart lims-next

# 方案 2: 手动启动
npm run dev  # 开发环境
npm start    # 生产环境

# 方案 3: 杀死占用进程
lsof -ti :3000 | xargs kill -9
npm start
```

### Q3: 如何防止服务自动停止？

使用进程管理工具：
- **PM2**（推荐）- 自动重启、日志管理、监控
- **systemd**（Linux） - 系统级守护进程
- **Docker** - 容器化部署，自动重启策略

### Q4: 生产环境应该用 `npm run dev` 吗？

**不应该！** 开发模式的问题：
- 性能差（实时编译）
- 内存占用高
- 无优化（未压缩、未 Tree Shaking）
- 暴露源代码

**正确做法：**
```bash
npm run build  # 构建优化后的代码
npm start      # 启动生产服务器
```

---

## 六、总结

### 本次问题根因

| 层级 | 问题 | 影响 |
|------|------|------|
| L1 应用层 | Next.js 进程未启动 | ❌ 直接导致 502 |
| L2 进程管理 | 无进程守护（PM2/systemd） | ⚠️ 无法自动恢复 |
| L3 监控告警 | 缺少健康检查 | ⚠️ 故障无法及时发现 |

### 已实施修复

✅ **立即修复**：启动 Next.js 服务（`npm run dev`）
✅ **文档输出**：完整的监控和防护方案

### 后续建议

1. **短期（1 天内）**
   - 安装 PM2 并配置自启动
   - 创建健康检查 API
   - 配置日志轮转

2. **中期（1 周内）**
   - 集成 Sentry 错误监控
   - 配置告警通知（邮件/钉钉）
   - 编写部署文档

3. **长期（1 个月内）**
   - 容器化部署（Docker + Kubernetes）
   - 实施 CI/CD 自动化
   - 建立灾难恢复预案

---

**文档作者**: AI Assistant
**审核状态**: 待审核
**下次更新**: 2026-02-28
