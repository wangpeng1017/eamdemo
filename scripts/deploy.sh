#!/bin/bash
echo "=========================================="
echo "审批流系统部署到阿里云"
echo "=========================================="

cd /Users/wangpeng/Downloads/limsnext

echo "步骤 1/2: 推送代码到 GitHub"
echo "------------------------------------------"
git push

echo ""
echo "步骤 2/2: 服务器部署（需要输入服务器密码）"
echo "------------------------------------------"

ssh root@8.130.182.148 << 'ENDSSH'
cd /root/lims-next

echo "拉取最新代码..."
git pull

echo "执行数据库迁移..."
npx prisma db push

echo "生成 Prisma Client..."
npx prisma generate

echo "导入审批流程配置..."
mysql -uroot -pword_mysql_root -h127.0.0.1 -P3307 lims << 'SQL'
INSERT INTO sys_approval_flow (id, name, code, businessType, description, nodes, status, createdAt, updatedAt)
VALUES ('quotation_approval_flow','报价审批流程','QUOTATION_APPROVAL','quotation','报价单三级审批流程','[{"step":1,"name":"销售经理审批","type":"role","targetId":"sales_manager","targetName":"销售经理","required":true},{"step":2,"name":"财务审批","type":"role","targetId":"finance","targetName":"财务","required":true},{"step":3,"name":"实验室负责人审批","type":"role","targetId":"lab_director","targetName":"实验室负责人","required":true}]',true,NOW(),NOW()) ON DUPLICATE KEY UPDATE updatedAt = NOW();

INSERT INTO sys_approval_flow (id, name, code, businessType, description, nodes, status, createdAt, updatedAt)
VALUES ('contract_approval_flow','合同审批流程','CONTRACT_APPROVAL','contract','合同两级审批流程','[{"step":1,"name":"部门经理审批","type":"role","targetId":"dept_manager","targetName":"部门经理","required":true},{"step":2,"name":"法务审批","type":"role","targetId":"legal","targetName":"法务","required":true}]',true,NOW(),NOW()) ON DUPLICATE KEY UPDATE updatedAt = NOW();

INSERT INTO sys_approval_flow (id, name, code, businessType, description, nodes, status, createdAt, updatedAt)
VALUES ('client_approval_flow','客户单位审批流程','CLIENT_APPROVAL','client','客户单位单级审批流程','[{"step":1,"name":"销售经理审批","type":"role","targetId":"sales_manager","targetName":"销售经理","required":true}]',true,NOW(),NOW()) ON DUPLICATE KEY UPDATE updatedAt = NOW();
SQL

echo "重启服务..."
pm2 restart lims-next

echo "部署完成！"
ENDSSH

echo ""
echo "=========================================="
echo "✓ 部署成功！"
echo "=========================================="
echo "访问地址: http://8.130.182.148:3004"
echo ""
