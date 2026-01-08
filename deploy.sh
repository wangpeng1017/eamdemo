#!/bin/bash
# LIMS 部署脚本 - 请在服务器上执行
# 使用方法：ssh root@8.130.182.148 < deploy.sh

echo "=========================================="
echo "LIMS 自动部署脚本"
echo "=========================================="

cd /root/lims-next || exit 1

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
    PORT=3001 pm2 restart lims-next --update-env
    echo "✓ 服务已重启"
    echo ""
    echo "=========================================="
    echo "部署完成！"
    echo "访问地址: http://8.130.182.148:3001"
    echo "=========================================="
    pm2 status lims-next
else
    echo "✗ 构建失败，请查看错误信息"
    exit 1
fi
