# LIMS 部署文档

> 最后更新: 2026-01-05

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| DATABASE_URL | MySQL 连接字符串 | 是 |
| NEXTAUTH_SECRET | NextAuth 密钥 | 是 |
| NEXTAUTH_URL | 应用访问地址 | 是 |
| AUTH_TRUST_HOST | 信任主机 | 是 |

## 部署信息

| 项目 | 服务器 | 路径 | PM2进程 | 端口 |
|------|--------|------|---------|------|
| lims-next | 8.130.182.148 | /root/lims-next | lims-next | 3004 |

## 部署命令

```bash
# 1. 本地提交推送
git add -A && git commit -m "xxx" && git push

# 2. 服务器拉取构建
ssh root@8.130.182.148 "cd /root/lims-next && git pull && pm2 stop lims-next && npm run build && pm2 start lims-next"
```

## 首次部署

```bash
# 克隆代码
cd /root && git clone https://github.com/wangpeng1017/0105LIMENEXT.git lims-next

# 配置环境变量
cat > /root/lims-next/.env << 'EOF'
DATABASE_URL="mysql://root:lims2024@127.0.0.1:3307/lims"
NEXTAUTH_SECRET="lims-secret-key-2024"
NEXTAUTH_URL="http://8.130.182.148:3004"
AUTH_TRUST_HOST=true
EOF

# 安装依赖并构建
cd /root/lims-next && npm install && npx prisma generate && npm run build

# 启动应用 (standalone 模式)
cd /root/lims-next/.next/standalone/lims-next && PORT=3004 pm2 start server.js --name lims-next && pm2 save
```

## 数据库

MySQL 8 容器:
```bash
podman run -d --name lims-mysql -e MYSQL_ROOT_PASSWORD=lims2024 -e MYSQL_DATABASE=lims -p 3307:3306 mysql:8
```

## 登录信息

- 用户名: admin
- 密码: admin123
