INSERT INTO sys_approval_flow (id, name, code, businessType, description, nodes, status, createdAt, updatedAt)
VALUES (
    'quotation-flow-001',
    '报价单审批流',
    'QUOTATION_APPROVAL',
    'quotation',
    '报价单三级审批：销售经理 -> 财务 -> 实验室负责人',
    '[{"step":1,"name":"销售经理审批","type":"role","targetId":"sales_manager","targetName":"销售经理"},{"step":2,"name":"财务审批","type":"role","targetId":"finance","targetName":"财务"},{"step":3,"name":"实验室负责人审批","type":"role","targetId":"lab_director","targetName":"实验室负责人"}]',
    1,
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE nodes = VALUES(nodes), updatedAt = NOW();
