#!/bin/bash
# LIMS-Next 快速部署脚本（优化版）
# 用法: ssh root@8.130.182.148 "bash /root/lims-next/scripts/deploy-fast.sh"

set -e

PROJECT_DIR="/root/lims-next"
STANDALONE_DIR="$PROJECT_DIR/.next/standalone"
HASH_FILE="$PROJECT_DIR/.package-hash"

echo "=========================================="
echo "🚀 LIMS-Next 快速部署"
echo "=========================================="

cd $PROJECT_DIR

# 1. 拉取最新代码
echo ""
echo "📥 [1/4] 拉取最新代码..."
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "代码已是最新，无需部署"
    exit 0
fi

git pull

# 2. 检查是否需要安装依赖（只在 package.json 变更时）
echo ""
echo "📦 [2/4] 检查依赖..."
NEW_HASH=$(md5sum package.json | cut -d' ' -f1)
OLD_HASH=""
[ -f "$HASH_FILE" ] && OLD_HASH=$(cat "$HASH_FILE")

if [ "$NEW_HASH" != "$OLD_HASH" ]; then
    echo "package.json 已变更，重新安装依赖..."
    npm install --prefer-offline
    echo "$NEW_HASH" > "$HASH_FILE"
else
    echo "依赖无变化，跳过安装"
fi

# 3. 构建项目
echo ""
echo "🔨 [3/4] 构建项目..."
npm run build

# 4. 复制静态文件并重启
echo ""
echo "🔄 [4/4] 部署并重启..."
cp -r .next/static $STANDALONE_DIR/.next/
cp -r public $STANDALONE_DIR/
pm2 restart lims-next

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
