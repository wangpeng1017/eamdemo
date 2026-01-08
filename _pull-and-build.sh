#!/bin/bash

echo "========================================="
echo "  强制拉取最新代码并重新构建"
echo "========================================="
echo ""

echo "1. 拉取最新代码..."
ssh root@8.130.182.148 "cd /root/lims-next && git fetch origin && git reset --hard origin/master"

echo ""
echo "2. 清理旧构建..."
ssh root@8.130.182.148 "cd /root/lims-next && rm -rf .next"

echo ""
echo "3. 重新构建..."
ssh root@8.130.182.148 "cd /root/lims-next && npm run build"

echo ""
echo "4. 重启服务..."
ssh root@8.130.182.148 "pm2 restart lims-next"

echo ""
echo "5. 验证版本..."
ssh root@8.130.182.148 "cd /root/lims-next && git log -1 --oneline"

echo ""
echo "========================================="
echo "  部署完成！"
echo "========================================="
