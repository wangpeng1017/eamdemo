#!/bin/bash

echo "========================================="
echo "  验证服务状态"
echo "========================================="
echo ""

echo "1. PM2 进程状态..."
ssh root@8.130.182.148 "pm2 status | grep -E '(lims|word)'"

echo ""
echo "2. lims-next 最近日志（最后30行）..."
ssh root@8.130.182.148 "pm2 logs lims-next --lines 30 --nostream"

echo ""
echo "3. 检查端口监听..."
ssh root@8.130.182.148 "netstat -tlnp | grep -E ':(3000|3001|3002)'"

echo ""
echo "========================================="
echo "  验证完成"
echo "========================================="
