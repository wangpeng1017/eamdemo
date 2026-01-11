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
echo "[1/5] 本地构建项目..."
npm run build

# 2. 打包 standalone 目录（包含 static）
echo ""
echo "[2/5] 打包构建产物..."
cd .next
tar -czf standalone.tar.gz standalone static
cd ..

# 3. 上传到服务器
echo ""
echo "[3/5] 上传到服务器..."
sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no -o ServerAliveInterval=60 .next/standalone.tar.gz "$SERVER:$REMOTE_DIR/"

# 4. 服务器解压并配置
echo ""
echo "[4/5] 服务器解压并配置..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 "$SERVER" "cd $REMOTE_DIR && \
  rm -rf .next/standalone .next/static 2>/dev/null || true && \
  tar -xzf standalone.tar.gz -C .next && \
  cp -r .next/static .next/standalone/.next/ && \
  cp -r public .next/standalone/ 2>/dev/null || true && \
  cp .env .next/standalone/ 2>/dev/null || true && \
  rm standalone.tar.gz"

# 5. 重启服务（使用 PORT 环境变量）
echo ""
echo "[5/5] 重启服务..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 "$SERVER" "cd $REMOTE_DIR/.next/standalone && \
  pm2 delete lims-next 2>/dev/null || true && \
  PORT=3001 pm2 start server.js --name lims-next && \
  pm2 save"

# 清理本地临时文件
rm -f .next/standalone.tar.gz

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo "访问地址: http://8.130.182.148:3001"
