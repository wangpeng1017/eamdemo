-- ============================================
-- 报价单审批数据修复SQL脚本
-- ============================================
-- Bug: 报价单状态为draft时，不应该有审批记录
-- Root Cause: submit操作错误地创建了QuotationApproval记录
-- ============================================

-- 1️⃣ 检查出问题的数据
-- ---------------------

-- 1.1 查找所有status=draft但有ApprovalInstance的报价单（异常数据）
SELECT
    q.id,
    q.quotationNo,
    q.status AS quotation_status,
    q.approvalStatus,
    ai.id AS approval_instance_id,
    ai.status AS approval_status,
    ai.currentStep,
    ai.createdAt AS approval_created_at
FROM biz_quotation q
INNER JOIN sys_approval_instance ai
    ON ai.bizType = 'quotation' AND ai.bizId = q.id
WHERE q.status = 'draft'
ORDER BY q.quotationNo;

-- 1.2 查找所有错误的submit审批记录（action='submit'且level=0）
SELECT
    qa.id,
    qa.quotationId,
    q.quotationNo,
    qa.level,
    qa.role,
    qa.action,
    qa.approver,
    qa.timestamp
FROM biz_quotation_approval qa
INNER JOIN biz_quotation q ON qa.quotationId = q.id
WHERE qa.action = 'submit' AND qa.level = 0
ORDER BY qa.timestamp DESC;


-- 2️⃣ 修复数据
-- ---------------------

-- 2.1 删除错误的submit审批记录（level=0的submit记录）
-- ⚠️ 注意：执行前请备份数据库！
DELETE FROM biz_quotation_approval
WHERE action = 'submit' AND level = 0;


-- 2.2 修复报价单状态（如果status=draft但approvalStatus=pending，应该改为pending_sales）
-- ⚠️ 注意：这会修复那些已经提交审批但status还是draft的报价单
UPDATE biz_quotation
SET
    status = 'pending_sales',  -- 因为approvalStep=1，所以应该是pending_sales
    approvalStep = 1
WHERE
    status = 'draft'
    AND approvalStatus = 'pending'
    AND approvalStep = 1
    AND approvalInstanceId IS NOT NULL;


-- 2.3 对于更复杂的情况：根据ApprovalInstance的状态同步Quotation的status
UPDATE biz_quotation q
INNER JOIN sys_approval_instance ai
    ON ai.bizType = 'quotation' AND ai.bizId = q.id
SET
    q.status = CASE
        WHEN ai.status = 'pending' THEN
            CASE ai.currentStep
                WHEN 1 THEN 'pending_sales'
                WHEN 2 THEN 'pending_finance'
                WHEN 3 THEN 'pending_lab'
                ELSE q.status
            END
        WHEN ai.status = 'approved' THEN 'approved'
        WHEN ai.status = 'rejected' THEN 'rejected'
        WHEN ai.status = 'cancelled' THEN 'draft'
        ELSE q.status
    END,
    q.approvalStatus = ai.status,
    q.approvalStep = ai.currentStep
WHERE q.status = 'draft' AND ai.status IN ('pending', 'approved', 'rejected');


-- 3️⃣ 验证修复结果
-- ---------------------

-- 3.1 检查是否还有status=draft但有ApprovalInstance的报价单
-- ✅ 预期结果：0条（除非是cancelled状态的审批）
SELECT COUNT(*) AS still_have_issues
FROM biz_quotation q
INNER JOIN sys_approval_instance ai
    ON ai.bizType = 'quotation' AND ai.bizId = q.id
WHERE q.status = 'draft' AND ai.status != 'cancelled';

-- 3.2 检查status和approvalStatus的一致性
SELECT
    status,
    approvalStatus,
    COUNT(*) AS count
FROM biz_quotation
WHERE approvalInstanceId IS NOT NULL
GROUP BY status, approvalStatus
ORDER BY status, approvalStatus;

-- 3.3 检查特定报价单 BJ202601150002 的当前状态
SELECT
    q.id,
    q.quotationNo,
    q.status,
    q.approvalStatus,
    q.approvalStep,
    ai.status AS approval_instance_status,
    ai.currentStep AS approval_instance_step
FROM biz_quotation q
LEFT JOIN sys_approval_instance ai
    ON ai.bizType = 'quotation' AND ai.bizId = q.id
WHERE q.quotationNo = 'BJ202601150002';


-- 4️⃣ 清理孤立数据（可选）
-- ---------------------

-- 4.1 查找没有对应ApprovalInstance但有approvalInstanceId的报价单
SELECT
    q.id,
    q.quotationNo,
    q.status,
    q.approvalInstanceId
FROM biz_quotation q
WHERE q.approvalInstanceId IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM sys_approval_instance ai
      WHERE ai.id = q.approvalInstanceId
  );

-- 4.2 清理这些孤立数据（⚠️ 谨慎操作）
-- UPDATE biz_quotation
-- SET approvalInstanceId = NULL
-- WHERE approvalInstanceId IS NOT NULL
--   AND NOT EXISTS (
--       SELECT 1 FROM sys_approval_instance ai
--       WHERE ai.id = biz_quotation.approvalInstanceId
--   );

-- ============================================
-- 执行建议：
-- 1. 先执行第1步的检查查询，确认问题范围
-- 2. 备份数据库！
-- 3. 按顺序执行第2步的修复语句
-- 4. 执行第3步验证修复结果
-- 5. 如果一切正常，可以执行第4步清理孤立数据
-- ============================================
