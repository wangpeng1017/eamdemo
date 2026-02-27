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
echo "📥 [1/6] 拉取最新代码..."
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
echo "📦 [2/6] 检查依赖..."
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

# 3. 同步数据库 Schema + 生成 Prisma Client
echo ""
echo "🗄️ [3/6] 同步数据库..."
npx prisma db push --accept-data-loss 2>&1 || echo "⚠️ prisma db push 出现警告，继续部署"
npx prisma generate

# 4. 构建项目
echo ""
echo "🔨 [4/6] 构建项目..."
npm run build

# 5. 执行种子脚本（审批流等配置数据）
echo ""
echo "🌱 [5/6] 同步配置数据..."
# 发票审批流
if [ -f "prisma/seed-invoice-approval.ts" ]; then
    npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed-invoice-approval.ts 2>&1 || echo "⚠️ 发票审批流种子脚本执行失败，继续部署"
fi

# 6. 复制静态文件并重启
echo ""
echo "🔄 [6/6] 部署并重启..."
cp -r .next/static $STANDALONE_DIR/.next/
cp -r public $STANDALONE_DIR/
pm2 restart lims-next

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
