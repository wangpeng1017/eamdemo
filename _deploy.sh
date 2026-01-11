#!/bin/bash

echo "========================================="
echo "  部署到阿里云服务器"
echo "========================================="
echo ""

echo "1. 拉取最新代码..."
ssh root@8.130.182.148 "cd /root/lims-next && git pull"

echo ""
echo "2. 同步数据库 schema..."
ssh root@8.130.182.148 "cd /root/lims-next && npx prisma db push"

echo ""
echo "3. 构建项目..."
ssh root@8.130.182.148 "cd /root/lims-next && npm run build"

echo ""
echo "4. 重启服务..."
ssh root@8.130.182.148 "pm2 restart lims-next"

echo ""
echo "========================================="
echo "  部署完成！"
echo "========================================="
