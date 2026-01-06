#!/bin/bash
# 本地一键部署脚本
# 用法: bash scripts/local-deploy.sh

set -e

SERVER="root@8.130.182.148"
REMOTE_DIR="/root/lims-next"

echo "=========================================="
echo "🚀 LIMS-Next 一键部署"
echo "=========================================="

# 1. 本地提交并推送
echo ""
echo "📤 [1/2] 提交并推送到 GitHub..."
git add -A
if git diff --cached --quiet; then
    echo "没有新的变更需要提交"
else
    git commit -m "chore: 自动部署 $(date '+%Y-%m-%d %H:%M')"
    git push
fi

# 2. 远程部署
echo ""
echo "🖥️  [2/2] 远程服务器部署..."
ssh $SERVER "bash $REMOTE_DIR/scripts/deploy.sh"

echo ""
echo "✅ 部署完成！"
