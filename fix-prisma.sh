#!/bin/bash
# Prisma Client 同步脚本
# 解决部署后数据库字段不匹配问题

set -e

SERVER="root@8.130.182.148"
SERVER_PASS="xx198910170014Z"
REMOTE_DIR="/root/lims-next"

echo "=========================================="
echo "  同步 Prisma Client 到 standalone"
echo "=========================================="

# 1. 重新生成 Prisma Client
echo ""
echo "[1/3] 重新生成 Prisma Client..."
sshpass -p "$SERVER_PASS" ssh "$SERVER" "cd $REMOTE_DIR && npx prisma generate"

# 2. 复制到 standalone 目录
echo ""
echo "[2/3] 复制 Prisma Client 到 standalone..."
sshpass -p "$SERVER_PASS" ssh "$SERVER" "cp -r $REMOTE_DIR/node_modules/.prisma $REMOTE_DIR/.next/standalone/node_modules/ && cp -r $REMOTE_DIR/node_modules/@prisma $REMOTE_DIR/.next/standalone/node_modules/"

# 3. 重启服务
echo ""
echo "[3/3] 重启服务..."
sshpass -p "$SERVER_PASS" ssh "$SERVER" "pm2 restart lims-next"

echo ""
echo "=========================================="
echo "  同步完成！"
echo "=========================================="
echo "服务已重启，访问: http://8.130.182.148:3001"
