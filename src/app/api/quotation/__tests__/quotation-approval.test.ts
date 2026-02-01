/**
 * @file quotation-approval.test.ts
 * @desc 报价单审批流程测试 - 验证状态一致性修复
 *
 * 测试场景：
 * 1. 提交审批：draft → pending_sales，创建ApprovalInstance，不创建QuotationApproval
 * 2. 审批通过：pending_sales → pending_finance，创建QuotationApproval（level=1）
 * 3. 审批驳回：pending_sales → rejected，创建QuotationApproval（level=1）
 * 4. 撤回审批：pending_sales → draft，删除ApprovalInstance
 *
 * Bug验证：
 * - submit操作不应该创建action='submit'且level=0的QuotationApproval记录
 * - draft状态不应该有ApprovalInstance记录（除非是cancelled）
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { approvalEngine } from '@/lib/approval/engine'

describe('报价单审批流程测试', () => {
  let testQuotationId: string
  let testUserId: string

  beforeEach(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: `test_user_${Date.now()}`,
        password: 'test123',
        name: '测试用户',
      },
    })
    testUserId = user.id

    // 创建测试报价单（draft状态）
    const quotation = await prisma.quotation.create({
      data: {
        quotationNo: `TEST${Date.now()}`,
        status: 'draft',
        approvalStatus: 'pending',
        approvalStep: 0,
        clientId: null,
        subtotal: 1000,
        taxTotal: 1060,
        discountTotal: 1060,
        createdById: testUserId,
        items: {
          create: [
            {
              serviceItem: '测试项目',
              methodStandard: 'GB/T 1234',
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000,
            },
          ],
        },
      },
    })
    testQuotationId = quotation.id
  })

  afterEach(async () => {
    // 清理测试数据
    await prisma.quotationApproval.deleteMany({
      where: { quotationId: testQuotationId },
    })
    await prisma.approvalRecord.deleteMany({
      where: {
        instance: {
          bizId: testQuotationId,
        },
      },
    })
    await prisma.approvalInstance.deleteMany({
      where: { bizId: testQuotationId },
    })
    await prisma.quotationItem.deleteMany({
      where: { quotationId: testQuotationId },
    })
    await prisma.quotation.delete({
      where: { id: testQuotationId },
    })
    await prisma.user.delete({
      where: { id: testUserId },
    })
  })

  /**
   * ✅ 测试1：提交审批 - 核心bug修复验证
   *
   * Bug原象：submit操作创建了action='submit'且level=0的QuotationApproval记录
   * 预期行为：submit操作只创建ApprovalInstance，不创建QuotationApproval
   */
  it('提交审批：draft → pending_sales，不创建旧的QuotationApproval记录', async () => {
    // 1. 提交审批
    await approvalEngine.submit({
      bizType: 'quotation',
      bizId: testQuotationId,
      flowCode: 'QUOTATION_APPROVAL',
      submitterId: testUserId,
      submitterName: '测试用户',
    })

    // 2. 检查ApprovalInstance是否创建成功
    const approvalInstance = await prisma.approvalInstance.findUnique({
      where: {
        bizType_bizId: {
          bizType: 'quotation',
          bizId: testQuotationId,
        },
      },
    })
    expect(approvalInstance).not.toBeNull()
    expect(approvalInstance!.status).toBe('pending')
    expect(approvalInstance!.currentStep).toBe(1)

    // 3. ✅ 核心断言：不应该创建旧的QuotationApproval记录
    const oldApprovalRecords = await prisma.quotationApproval.findMany({
      where: { quotationId: testQuotationId },
    })
    expect(oldApprovalRecords).toHaveLength(0)

    // 4. 检查报价单状态是否正确更新
    const quotation = await prisma.quotation.findUnique({
      where: { id: testQuotationId },
    })
    expect(quotation!.status).toBe('pending_sales')
    expect(quotation!.approvalStatus).toBe('pending')
    expect(quotation!.approvalStep).toBe(1)
  })

  /**
   * ✅ 测试2：审批通过 - 创建旧的QuotationApproval记录
   *
   * 预期行为：approve操作创建QuotationApproval记录（level=1/2/3）
   */
  it('审批通过：pending_sales → pending_finance，创建QuotationApproval记录（level=1）', async () => {
    // 1. 先提交审批
    const instance = await approvalEngine.submit({
      bizType: 'quotation',
      bizId: testQuotationId,
      flowCode: 'QUOTATION_APPROVAL',
      submitterId: testUserId,
      submitterName: '测试用户',
    })

    // 2. 审批通过（销售经理）
    await approvalEngine.approve({
      instanceId: instance.id,
      action: 'approve',
      approverId: testUserId,
      approverName: '销售经理',
      comment: '审批通过',
    })

    // 3. 检查ApprovalInstance状态
    const updatedInstance = await prisma.approvalInstance.findUnique({
      where: { id: instance.id },
    })
    expect(updatedInstance!.status).toBe('pending')
    expect(updatedInstance!.currentStep).toBe(2)

    // 4. ✅ 检查旧的QuotationApproval记录是否创建
    const oldApprovalRecords = await prisma.quotationApproval.findMany({
      where: { quotationId: testQuotationId },
    })
    expect(oldApprovalRecords).toHaveLength(1)
    expect(oldApprovalRecords[0].level).toBe(1)
    expect(oldApprovalRecords[0].role).toBe('sales_manager')
    expect(oldApprovalRecords[0].action).toBe('approve')

    // 5. 检查报价单状态
    const quotation = await prisma.quotation.findUnique({
      where: { id: testQuotationId },
    })
    expect(quotation!.status).toBe('pending_finance')
    expect(quotation!.approvalStatus).toBe('pending')
    expect(quotation!.approvalStep).toBe(2)
  })

  /**
   * ✅ 测试3：审批驳回 - 创建QuotationApproval记录，状态变为rejected
   */
  it('审批驳回：pending_sales → rejected，创建QuotationApproval记录（level=1）', async () => {
    // 1. 先提交审批
    const instance = await approvalEngine.submit({
      bizType: 'quotation',
      bizId: testQuotationId,
      flowCode: 'QUOTATION_APPROVAL',
      submitterId: testUserId,
      submitterName: '测试用户',
    })

    // 2. 审批驳回
    await approvalEngine.approve({
      instanceId: instance.id,
      action: 'reject',
      approverId: testUserId,
      approverName: '销售经理',
      comment: '价格不合理',
    })

    // 3. 检查ApprovalInstance状态
    const updatedInstance = await prisma.approvalInstance.findUnique({
      where: { id: instance.id },
    })
    expect(updatedInstance!.status).toBe('rejected')

    // 4. 检查旧的QuotationApproval记录
    const oldApprovalRecords = await prisma.quotationApproval.findMany({
      where: { quotationId: testQuotationId },
    })
    expect(oldApprovalRecords).toHaveLength(1)
    expect(oldApprovalRecords[0].action).toBe('reject')

    // 5. 检查报价单状态
    const quotation = await prisma.quotation.findUnique({
      where: { id: testQuotationId },
    })
    expect(quotation!.status).toBe('rejected')
    expect(quotation!.approvalStatus).toBe('rejected')
  })

  /**
   * ✅ 测试4：撤回审批 - 状态回到draft
   */
  it('撤回审批：pending_sales → draft', async () => {
    // 1. 先提交审批
    const instance = await approvalEngine.submit({
      bizType: 'quotation',
      bizId: testQuotationId,
      flowCode: 'QUOTATION_APPROVAL',
      submitterId: testUserId,
      submitterName: '测试用户',
    })

    // 2. 撤回审批
    await approvalEngine.cancel({
      instanceId: instance.id,
      operatorId: testUserId,
    })

    // 3. 检查ApprovalInstance状态
    const updatedInstance = await prisma.approvalInstance.findUnique({
      where: { id: instance.id },
    })
    expect(updatedInstance!.status).toBe('cancelled')

    // 4. 检查报价单状态回到draft
    const quotation = await prisma.quotation.findUnique({
      where: { id: testQuotationId },
    })
    expect(quotation!.status).toBe('draft')
    expect(quotation!.approvalStatus).toBe('cancelled')
  })

  /**
   * ✅ 测试5：验证数据库中不再有错误的submit记录
   */
  it('数据库验证：不应该存在action=submit且level=0的QuotationApproval记录', async () => {
    // 执行多次提交审批操作
    await approvalEngine.submit({
      bizType: 'quotation',
      bizId: testQuotationId,
      flowCode: 'QUOTATION_APPROVAL',
      submitterId: testUserId,
      submitterName: '测试用户',
    })

    // 查询所有action=submit且level=0的记录
    const wrongRecords = await prisma.quotationApproval.findMany({
      where: {
        action: 'submit',
        level: 0,
      },
    })

    // ✅ 断言：不应该有这种错误的记录
    expect(wrongRecords).toHaveLength(0)
  })

  /**
   * ✅ 测试6：状态一致性验证
   */
  it('状态一致性：draft状态不应该有pending的ApprovalInstance', async () => {
    // 查询所有status=draft的报价单
    const draftQuotations = await prisma.quotation.findMany({
      where: {
        status: 'draft',
      },
      include: {
        approvalInstance: true,
      },
    })

    // ✅ 断言：draft状态的报价单不应该有pending的ApprovalInstance
    for (const q of draftQuotations) {
      if (q.approvalInstance) {
        expect(q.approvalInstance.status).not.toBe('pending')
      }
    }
  })
})
