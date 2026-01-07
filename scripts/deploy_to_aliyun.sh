#!/bin/bash
# 审批流系统完整部署脚本
# 请在本地终端执行此脚本

set -e

echo "=========================================="
echo "审批流系统部署到阿里云"
echo "=========================================="

# 1. 推送代码到 GitHub（需要您的 GitHub Token）
echo ""
echo "步骤 1/3: 推送代码到 GitHub"
echo "------------------------------------------"
echo "请输入 GitHub Personal Access Token:"
echo "（如果没有，请在 GitHub 设置中创建，权限选择 repo）"
read -t 1 -n 10000
echo ""

cd /Users/wangpeng/Downloads/limsnext

# 尝试推送（可能需要输入用户名和 token）
git push
if [ $? -eq 0 ]; then
    echo "✓ 代码已推送到 GitHub"
else
    echo "⚠️  推送失败，请手动执行以下命令："
    echo "   cd /Users/wangpeng/Downloads/limsnext"
    echo "   git push"
    echo ""
    read -p "推送成功后按回车继续..."
fi

# 2. 连接到服务器并拉取代码
echo ""
echo "步骤 2/3: 服务器拉取代码并部署"
echo "------------------------------------------"
echo "请输入服务器 root 密码:"

# 使用 expect 或 sshpass（如果可用）自动输入密码
# 如果没有，用户需要手动输入密码

ssh root@8.130.182.148 'bash -s' << 'ENDSSH'
cd /root/lims-next

echo "正在拉取最新代码..."
git pull

echo "正在执行数据库迁移..."
npx prisma db push

echo "正在生成 Prisma Client..."
npx prisma generate

echo "正在导入审批流程配置..."
mysql -uroot -pword_mysql_root -h127.0.0.1 -P3307 lims << 'SQL'
-- 报价审批流程
INSERT INTO sys_approval_flow (id, name, code, businessType, description, nodes, status, createdAt, updatedAt)
VALUES (
  'quotation_approval_flow',
  '报价审批流程',
  'QUOTATION_APPROVAL',
  'quotation',
  '报价单三级审批流程：销售经理审核 → 财务审核 → 实验室负责人审批',
  '[{"step":1,"name":"销售经理审批","type":"role","targetId":"sales_manager","targetName":"销售经理","required":true},{"step":2,"name":"财务审批","type":"role","targetId":"finance","targetName":"财务","required":true},{"step":3,"name":"实验室负责人审批","type":"role","targetId":"lab_director","targetName":"实验室负责人","required":true}]',
  true,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE updatedAt = NOW();

-- 合同审批流程
INSERT INTO sys_approval_flow (id, name, code, businessType, description, nodes, status, createdAt, updatedAt)
VALUES (
  'contract_approval_flow',
  '合同审批流程',
  'CONTRACT_APPROVAL',
  'contract',
  '合同两级审批流程：部门经理审核 → 法务审批',
  '[{"step":1,"name":"部门经理审批","type":"role","targetId":"dept_manager","targetName":"部门经理","required":true},{"step":2,"name":"法务审批","type":"role","targetId":"legal","targetName":"法务","required":true}]',
  true,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE updatedAt = NOW();

-- 客户单位审批流程
INSERT INTO sys_approval_flow (id, name, code, businessType, description, nodes, status, createdAt, updatedAt)
VALUES (
  'client_approval_flow',
  '客户单位审批流程',
  'CLIENT_APPROVAL',
  'client',
  '客户单位单级审批流程：销售经理审批',
  '[{"step":1,"name":"销售经理审批","type":"role","targetId":"sales_manager","targetName":"销售经理","required":true}]',
  true,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE updatedAt = NOW();
SQL

echo "正在重启服务..."
pm2 restart lims-next

echo "✓ 部署完成！"
ENDSSH

# 3. 显示部署结果
echo ""
echo "步骤 3/3: 部署完成"
echo "------------------------------------------"
echo ""
echo "=========================================="
echo "✓ 部署成功！"
echo "=========================================="
echo ""
echo "访问地址: http://8.130.182.148:3004"
echo "用户名: admin"
echo "密码: admin123"
echo ""
echo "下一步："
echo "1. 访问系统管理 → 审批流程配置，查看审批流程"
echo "2. 在报价单、合同、客户管理页面测试审批功能"
echo ""
