/**
 * @file approval-utils.ts
 * @desc 审批流工具函数 - 统一处理审批流相关逻辑
 */

/**
 * 从审批流节点提取审批人姓名
 * @param node 审批流节点
 * @returns 审批人姓名（纯文本，不含手机号）
 *
 * @example
 * const node = { targetName: "张馨 (15952575002)" }
 * extractApproverName(node) // "张馨"
 */
export function extractApproverName(node: any): string | null {
  if (!node) {
    return null
  }

  // ✅ 优先使用targetName字段（标准格式："张馨 (15952575002)"）
  if (node.targetName) {
    const name = node.targetName.split(' (')[0]
    return name
  }

  // ✅ 兼容其他可能的字段名
  if (node.approverName) {
    return node.approverName
  }

  if (node.userName) {
    return node.userName
  }

  if (node.assigneeName) {
    return node.assigneeName
  }

  // ⚠️ 兼容旧格式：assigneeNames数组
  if (node.assigneeNames && node.assigneeNames.length > 0) {
    return node.assigneeNames[0]
  }

  // ⚠️ 兼容targets数组
  if (node.targets && node.targets.length > 0) {
    const target = node.targets[0]
    if (target.targetName) {
      const name = target.targetName.split(' (')[0]
      return name
    }
    if (target.name) {
      return target.name
    }
  }

  // 🔄 降级方案：返回节点名称（角色名，如"业务负责人"）
  if (node.name) {
    return node.name
  }

  return null
}

/**
 * 格式化审批流节点供前端显示
 * @param nodes 原始审批流节点数组
 * @returns 格式化后的节点数组
 *
 * @example
 * const rawNodes = [
 *   { name: "业务负责人", targetName: "张馨 (15952575002)" }
 * ]
 * formatApprovalNodes(rawNodes)
 * // [
 * //   { step: 1, name: "业务负责人", role: "张馨" }
 * // ]
 */
export function formatApprovalNodes(nodes: any[]): Array<{ step: number; name: string; role: string }> {
  if (!nodes || !Array.isArray(nodes)) {
    return []
  }

  return nodes.map((node, index) => ({
    step: index + 1,
    name: node.name || `审批节点${index + 1}`,
    role: extractApproverName(node) || '审批人',
  }))
}

/**
 * 为列表数据附加当前审批人信息
 * @param items 业务数据列表
 * @param prisma Prisma客户端实例
 * @returns Promise<附加了currentApproverName的列表>
 *
 * @example
 * const quotations = await prisma.quotation.findMany(...)
 * const formatted = await addCurrentApproverInfo(quotations, prisma, 'quotation')
 */
export async function addCurrentApproverInfo(
  items: any[],
  prisma: any,
  bizType: 'quotation' | 'contract' | 'entrustment' | 'report'
): Promise<any[]> {
  return await Promise.all(
    items.map(async (item) => {
      let currentApproverName = null

      // 如果是pending状态，查询审批实例获取当前审批人
      if (item.status && item.status.startsWith('pending_')) {
        const approvalInstance = await prisma.approvalInstance.findFirst({
          where: {
            bizType,
            bizId: item.id,
            status: 'pending',
          },
          orderBy: { submittedAt: 'desc' },
        })

        if (approvalInstance) {
          // 查询审批流配置获取节点信息
          const approvalFlow = await prisma.approvalFlow.findUnique({
            where: { code: approvalInstance.flowCode },
          })

          if (approvalFlow?.nodes) {
            try {
              const nodes = JSON.parse(approvalFlow.nodes)
              const currentNode = nodes[approvalInstance.currentStep - 1]
              currentApproverName = extractApproverName(currentNode)
            } catch (e) {
              console.error('解析审批流节点失败:', e)
            }
          }
        }
      }

      return {
        ...item,
        currentApproverName,
      }
    })
  )
}
