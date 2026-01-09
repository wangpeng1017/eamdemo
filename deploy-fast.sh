#!/bin/bash
# LIMS-Next 快速部署脚本
# 本地构建 + 上传 standalone 产物到服务器
# 用法: ./deploy-fast.sh

set -e

SERVER="root@8.130.182.148"
SERVER_PASS="xx198910170014Z"
REMOTE_DIR="/root/lims-next"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo "  LIMS-Next 快速部署（本地构建模式）"
echo "=========================================="

cd "$LOCAL_DIR"

# 检查 sshpass
if ! command -v sshpass &> /dev/null; then
    echo "错误: 需要安装 sshpass"
    echo "运行: brew install hudochenkov/sshpass/sshpass"
    exit 1
fi

# 1. 本地构建
echo ""
echo "[1/4] 本地构建项目..."
npm run build

# 2. 打包 standalone 目录
echo ""
echo "[2/4] 打包构建产物..."
cd .next
tar -czf standalone.tar.gz standalone static
cd ..

# 3. 上传到服务器
echo ""
echo "[3/4] 上传到服务器..."
sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no .next/standalone.tar.gz "$SERVER:$REMOTE_DIR/"

# 4. 服务器解压并重启
echo ""
echo "[4/4] 服务器部署..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER" "cd $REMOTE_DIR && \
  rm -rf .next/standalone .next/static 2>/dev/null || true && \
  tar -xzf standalone.tar.gz -C .next && \
  cp -r public .next/standalone/ 2>/dev/null || true && \
  rm standalone.tar.gz && \
  pm2 restart lims-next"

# 清理本地临时文件
rm -f .next/standalone.tar.gz

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo "访问地址: http://8.130.182.148:3001"
