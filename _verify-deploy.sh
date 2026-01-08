#!/bin/bash

echo "========================================="
echo "  验证部署状态"
echo "========================================="
echo ""

echo "1. Git 版本检查..."
ssh root@8.130.182.148 "cd /root/lims-next && git log -1 --oneline"

echo ""
echo "2. 检查合同页面代码..."
ssh root@8.130.182.148 "cd /root/lims-next && grep -c '下载PDF' src/app/\(dashboard\)/entrustment/contract/page.tsx"

echo ""
echo "3. PM2 服务状态..."
ssh root@8.130.182.148 "pm2 status | grep lims"

echo ""
echo "4. 最近的日志..."
ssh root@8.130.182.148 "pm2 logs lims-next --lines 10 --nostream"

echo ""
echo "========================================="
echo "  验证完成"
echo "========================================="
