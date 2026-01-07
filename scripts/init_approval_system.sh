#!/bin/bash
# 审批流系统初始化脚本
# 方案一：修复 npm 权限并执行迁移

set -e

echo "=========================================="
echo "LIMS 审批流系统初始化"
echo "=========================================="

# 1. 修复 npm 缓存权限（需要管理员密码）
echo ""
echo "步骤 1/4: 修复 npm 缓存权限"
echo "------------------------------------------"
echo "请输入管理员密码以修复 npm 权限..."
sudo chown -R $(whoami) ~/.npm
echo "✓ npm 缓存权限已修复"

# 2. 安装项目依赖
echo ""
echo "步骤 2/4: 安装项目依赖"
echo "------------------------------------------"
cd /Users/wangpeng/Downloads/limsnext
npm install
echo "✓ 依赖安装完成"

# 3. 执行数据库迁移
echo ""
echo "步骤 3/4: 执行数据库迁移"
echo "------------------------------------------"
npx prisma db push
echo "✓ 数据库迁移完成"

# 4. 生成 Prisma Client
echo ""
echo "步骤 4/4: 生成 Prisma Client"
echo "------------------------------------------"
npx prisma generate
echo "✓ Prisma Client 生成完成"

echo ""
echo "=========================================="
echo "初始化完成！"
echo "=========================================="
echo ""
echo "下一步操作："
echo "1. 导入审批流程配置："
echo "   mysql -u用户名 -p 数据库名 < scripts/init_approval_flows.sql"
echo ""
echo "2. 或在系统配置页面手动创建审批流程"
echo ""
