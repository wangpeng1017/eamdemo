#!/bin/bash
# LIMS 部署脚本 - 请在服务器上执行
# 使用方法：ssh root@8.130.182.148 < deploy.sh

set -e  # 遇到错误立即退出

PROJECT_DIR="/root/lims-next"
APP_NAME="lims-next"
PORT=3001

echo "=========================================="
echo "LIMS 自动部署脚本"
echo "=========================================="

cd $PROJECT_DIR || exit 1

echo "1. 检查代码更新..."
git pull

echo "2. 安装新依赖..."
npm install

echo "3. 生成 Prisma Client..."
npx prisma generate

echo "4. 构建项目（这可能需要2-3分钟）..."
npm run build

if [ $? -eq 0 ]; then
    echo "✓ 构建成功！"
    echo "5. 重启服务..."

    # 检查进程是否存在，不存在则创建
    if pm2 describe $APP_NAME > /dev/null 2>&1; then
        # 进程存在，重启并确保工作目录正确
        pm2 delete $APP_NAME 2>/dev/null || true
    fi

    # 使用 --cwd 确保工作目录正确
    pm2 start npm --name $APP_NAME --cwd $PROJECT_DIR -- start -- -H 0.0.0.0 -p $PORT
    pm2 save

    # 等待服务启动
    sleep 3

    # 验证服务状态
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/login || echo "000")

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✓ 服务已启动并验证成功"
    else
        echo "⚠ 服务已启动，但验证返回 HTTP $HTTP_CODE，请检查日志"
    fi

    echo ""
    echo "=========================================="
    echo "部署完成！"
    echo "访问地址: http://8.130.182.148:$PORT"
    echo "=========================================="
    pm2 status $APP_NAME
else
    echo "✗ 构建失败，请查看错误信息"
    exit 1
fi
