#!/bin/bash

echo "========================================="
echo "  一键后台部署"
echo "========================================="
echo ""

# 1. 清理
echo "1. 清理旧构建..."
ssh root@8.130.182.148 "cd /root/lims-next && rm -rf .next" || exit 1
sleep 2

# 2. 后台构建
echo "2. 开始后台构建（约需3-5分钟）..."
ssh root@8.130.182.148 "cd /root/lims-next && nohup npm run build > /tmp/build.log 2>&1 &"
sleep 5

# 3. 监控构建进度
echo "3. 监控构建进度..."
for i in {1..36}; do
    if ssh root@8.130.182.148 "grep -q '✓ Compiled\|✓ Build' /tmp/build.log 2>/dev/null"; then
        echo "   构建成功！"
        break
    fi
    if ssh root@8.130.182.148 "grep -q 'Error\|Failed' /tmp/build.log 2>/dev/null"; then
        echo "   构建失败！查看日志："
        ssh root@8.130.182.148 "cat /tmp/build.log"
        exit 1
    fi
    echo "   构建中... ($i/36) $(date '+%H:%M:%S')"
    sleep 5
done

# 4. 启动服务
echo ""
echo "4. 启动服务..."
ssh root@8.130.182.148 "cd /root/lims-next && pm2 restart lims-next || pm2 start npm --name lims-next -- start"

# 5. 查看状态
echo ""
echo "5. 服务状态："
ssh root@8.130.182.148 "pm2 status | grep lims"

echo ""
echo "========================================="
echo "  部署完成！访问 http://8.130.182.148"
echo "========================================="
