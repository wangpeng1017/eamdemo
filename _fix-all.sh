#!/bin/bash
set -e

PASSWORD=""
SERVER="root@8.130.182.148"
PROJECT_DIR="/root/lims-next"

# 使用 expect 自动输入密码
auto_ssh() {
    /usr/bin/expect << EOF
    set timeout 300
    spawn ssh $SERVER "$1"
    expect {
        "password:" {
            send "$PASSWORD\r"
            expect eof
        }
        eof
    }
EOF
}

echo "========================================="
echo "  一键修复并部署"
echo "========================================="
echo ""
echo "请输入SSH密码:"
read -s PASSWORD
echo ""

echo "1. 检查PM2状态..."
auto_ssh "pm2 status"

echo ""
echo "2. 查看错误日志..."
auto_ssh "pm2 logs lims-next --err --lines 30 --nostream"

echo ""
echo "3. 停止服务..."
auto_ssh "pm2 stop lims-next || true"

echo ""
echo "4. 强制拉取最新代码..."
auto_ssh "cd $PROJECT_DIR && git fetch origin && git reset --hard origin/master"

echo ""
echo "5. 清理并重新构建..."
auto_ssh "cd $PROJECT_DIR && rm -rf .next node_modules/.cache && npm run build"

echo ""
echo "6. 启动服务..."
auto_ssh "cd $PROJECT_DIR && pm2 start lims-next || pm2 restart lims-next"

echo ""
echo "7. 查看服务状态..."
auto_ssh "pm2 status"

echo ""
echo "8. 查看启动日志..."
auto_ssh "pm2 logs lims-next --lines 20 --nostream"

echo ""
echo "========================================="
echo "  修复完成！访问 http://8.130.182.148 测试"
echo "========================================="
