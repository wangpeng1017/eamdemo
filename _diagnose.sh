#!/bin/bash

echo "========================================="
echo "  诊断服务问题"
echo "========================================="
echo ""

echo "1. PM2 所有进程状态..."
ssh root@8.130.182.148 "pm2 status"

echo ""
echo "2. lims-next 详细状态..."
ssh root@8.130.182.148 "pm2 show lims-next"

echo ""
echo "3. lims-next 错误日志（最后50行）..."
ssh root@8.130.182.148 "pm2 logs lims-next --err --lines 50 --nostream"

echo ""
echo "4. 检查端口占用..."
ssh root@8.130.182.148 "netstat -tlnp | grep -E ':(3000|3001|3002|3010)'"

echo ""
echo "5. 检查 .next 目录..."
ssh root@8.130.182.148 "ls -la /root/lims-next/.next/ 2>/dev/null || echo '.next 目录不存在'"

echo ""
echo "========================================="
