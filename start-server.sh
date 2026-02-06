#!/bin/bash
# LIMS-Next 启动脚本 - 加载 .env 文件后启动服务器

# 切换到项目目录
cd /root/lims-next

# 加载 .env 文件
if [ -f .env ]; then
 export $(cat .env | grep -v '^#' | xargs)
 echo "✅ .env 文件已加载"
fi

# 启动 Next.js 服务器
exec node server.js
