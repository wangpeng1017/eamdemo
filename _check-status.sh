#!/bin/bash

echo "检查 lims-next 服务状态..."
ssh root@8.130.182.148 "pm2 status | grep lims"

echo ""
echo "查看最近的日志..."
ssh root@8.130.182.148 "pm2 logs lims-next --lines 20 --nostream"
