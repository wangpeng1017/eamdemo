#!/bin/bash

echo "查看 lims-next 错误日志..."
ssh root@8.130.182.148 "pm2 logs lims-next --err --lines 50 --nostream"
