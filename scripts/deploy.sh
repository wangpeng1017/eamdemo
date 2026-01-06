#!/bin/bash
# LIMS-Next 部署脚本
# 用法: ssh root@8.130.182.148 "bash /root/lims-next/scripts/deploy.sh"

set -e  # 遇到错误立即退出

PROJECT_DIR="/root/lims-next"
STANDALONE_DIR="$PROJECT_DIR/.next/standalone"

echo "=========================================="
echo "🚀 LIMS-Next 部署开始"
echo "=========================================="

cd $PROJECT_DIR

# 1. 拉取最新代码
echo ""
echo "📥 [1/5] 拉取最新代码..."
git pull

# 2. 检查是否需要安装依赖
echo ""
echo "📦 [2/5] 检查依赖..."
if [ -f package-lock.json ]; then
    # 使用 npm ci 快速安装（需要 lock 文件）
    npm ci --prefer-offline 2>/dev/null || npm install
else
    npm install
fi

# 3. 构建项目
echo ""
echo "🔨 [3/5] 构建项目..."
npm run build

# 4. 复制静态文件到 standalone
echo ""
echo "📁 [4/5] 复制静态文件..."
cp -r .next/static $STANDALONE_DIR/.next/
cp -r public $STANDALONE_DIR/

# 5. 重启 PM2
echo ""
echo "🔄 [5/5] 重启服务..."
pm2 restart lims-next || {
    echo "PM2 进程不存在，创建新进程..."
    cd $STANDALONE_DIR
    PORT=3004 pm2 start server.js --name lims-next
    pm2 save
}

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "🌐 访问地址: http://8.130.182.148:3004"
echo "=========================================="

# 显示服务状态
pm2 show lims-next | grep -E "status|uptime|memory"
