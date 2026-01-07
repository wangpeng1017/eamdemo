-- ============================================
-- 审批流系统初始化脚本
-- 用途：创建默认审批流程配置
-- ============================================

-- 1. 报价审批流程（三级：销售经理 → 财务 → 实验室负责人）
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

-- 2. 合同审批流程（两级：部门经理 → 法务）
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

-- 3. 客户单位审批流程（单级：销售经理）
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

-- ============================================
-- 执行说明
-- ============================================
-- 方式1：使用 MySQL 客户端
-- mysql -u用户名 -p密码 数据库名 < init_approval_flows.sql
--
-- 方式2：在数据库管理工具中直接执行上述 SQL
-- ============================================
