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
echo " LIMS-Next 快速部署（本地构建模式）"
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
echo "[1/6] 本地构建项目..."
npm run build

# 2. 打包 standalone 目录（包含 static）
echo ""
echo "[2/6] 打包构建产物..."
cd .next
tar -czf standalone.tar.gz standalone static
cd ..
# 单独打包 public 目录
tar -czf public.tar.gz public

echo " ✅ standalone.tar.gz 已包含 static 目录"

# 3. 上传到服务器
echo ""
echo "[3/6] 上传到服务器 (使用 rsync)..."
if command -v rsync &> /dev/null; then
 # 使用 rsync 上传 (支持断点续传)
  rsync -avz --progress -e "sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no" .next/standalone.tar.gz "$SERVER:$REMOTE_DIR/"
 rsync -avz --progress -e "sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no" public.tar.gz "$SERVER:$REMOTE_DIR/"
  rsync -avz --progress -e "sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no" update-db-schema.js "$SERVER:$REMOTE_DIR/"
 rsync -avz --progress -e "sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no" prisma/schema.prisma "$SERVER:$REMOTE_DIR/prisma/"
else
 # 回退到 scp
 echo "警告: 未找到 rsync，回退到 scp..."
  sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no -o ServerAliveInterval=60 .next/standalone.tar.gz "$SERVER:$REMOTE_DIR/"
  sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no -o ServerAliveInterval=60 public.tar.gz "$SERVER:$REMOTE_DIR/"
 sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no -o ServerAliveInterval=60 update-db-schema.js "$SERVER:$REMOTE_DIR/"
 sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no -o ServerAliveInterval=60 prisma/schema.prisma "$SERVER:$REMOTE_DIR/prisma/"
fi

# 4. 服务器解压并配置
echo ""
echo "[4/6] 服务器解压并配置..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 "$SERVER" "cd $REMOTE_DIR && \
 tar -xzf standalone.tar.gz && \
 tar -xzf public.tar.gz && \
 rm -rf .next && \
 mv standalone/.next . && \
 mkdir -p .next/static && \
 cp -r static/* .next/static/ && \
  echo '✅ static 目录已复制到 .next/static/' && \
 cp standalone/server.js . && \
 cp standalone/package.json . 2>/dev/null || true && \
 cp .env standalone/ 2>/dev/null || true && \
 rm -rf standalone static standalone.tar.gz public.tar.gz && \
 npx prisma generate && \
 node update-db-schema.js"

# 5. 验证 static 目录
echo ""
echo "[5/6] 验证 static 目录..."
CHUNK_COUNT=$(sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER" "find $REMOTE_DIR/.next/static -name '*.js' 2>/dev/null | wc -l")
echo " 📦 找到 $CHUNK_COUNT 个 chunk 文件"

if [ "$CHUNK_COUNT" -lt 100 ]; then
 echo " ⚠️ 警告: chunk 文件数量少于 100，可能部署不完整！"
 exit 1
fi

# 6. ���启服务（使用 ecosystem.config.js）
echo ""
echo "[6/6] 重启服务..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 "$SERVER" "cd $REMOTE_DIR && \
 pm2 delete lims-next 2>/dev/null || true && \
 pm2 start ecosystem.config.js && \
 pm2 save"

# 清理本地临时文件
rm -f .next/standalone.tar.gz public.tar.gz

echo ""
echo "=========================================="
echo " ✅ 部署完成！"
echo "=========================================="
echo "访问地址: http://8.130.182.148:3001"
echo "chunk 文件数量: $CHUNK_COUNT"
echo ""
