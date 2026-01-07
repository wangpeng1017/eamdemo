# LIMS 部署文档

> 最后更新: 2026-01-07

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
| lims-next | 8.130.182.148 | /root/lims-next | lims-next | 3001 |

## 部署命令

```bash
# 1. 本地提交推送
git add -A && git commit -m "xxx" && git push

# 2. 服务器拉取构建
ssh root@8.130.182.148 "cd /root/lims-next && git pull && npm run build && PORT=3001 pm2 restart lims-next --update-env"
```

## 首次部署

```bash
# 克隆代码
cd /root && git clone https://github.com/wangpeng1017/0105LIMENEXT.git lims-next

# 配置环境变量（使用共享的 mysql8-word 容器）
cat > /root/lims-next/.env << 'EOF'
DATABASE_URL="mysql://root:word_mysql_root@127.0.0.1:3307/lims"
NEXTAUTH_SECRET="lims-secret-key-2024"
NEXTAUTH_URL="http://8.130.182.148:3001"
AUTH_TRUST_HOST=true
EOF

# 安装依赖并构建
cd /root/lims-next && npm install && npx prisma generate && npm run build

# 启动应用
cd /root/lims-next && PORT=3001 pm2 start npm --name lims-next -- start && pm2 save
```

## 数据库

使用共享的 MySQL 8 容器 `mysql8-word` (端口 3307):

```bash
# 创建数据库
podman exec mysql8-word mysql -uroot -pword_mysql_root -e "CREATE DATABASE IF NOT EXISTS lims CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 同步表结构
cd /root/lims-next && npx prisma db push

# 初始化管理员账号
npm run db:seed
```

## 登录信息

- 访问地址: http://8.130.182.148:3001
- 用户名: admin
- 密码: admin123

## 注意事项

1. **Prisma 运行时配置**: `src/lib/prisma.ts` 使用 `datasources` 强制读取运行时 DATABASE_URL，避免构建时硬编码
2. **标准模式部署**: 使用 `npm start` 启动，无需 standalone 模式
3. **数据库连接**: 使用现有 `mysql8-word` 容器，无需创建新 MySQL 实例
