/**
 * @file optimistic-lock.ts
 * @desc 乐观锁实现 - 防止并发更新冲突
 */

import { prisma } from './prisma'
import { badRequest } from './api-handler'

/**
 * 乐观锁更新选项
 */
interface OptimisticUpdateOptions<T> {
  /** 表名 */
  table: 'consumable' | 'sample' | 'testTask' | 'financeReceivable'
  /** 记录 ID */
  id: string
  /** 期望的版本号（updatedAt 时间戳） */
  expectedVersion: Date | string
  /** 更新数据 */
  data: Partial<T>
  /** 实体名称（用于错误消息） */
  entityName?: string
}

/**
 * 使用乐观锁更新记录
 * 通过 updatedAt 字段实现版本控制
 *
 * @example
 * ```ts
 * const result = await optimisticUpdate({
 *   table: 'consumable',
 *   id: 'xxx',
 *   expectedVersion: '2024-01-01T00:00:00.000Z',
 *   data: { stockQuantity: 100 },
 *   entityName: '易耗品'
 * })
 * ```
 */
export async function optimisticUpdate<T extends Record<string, unknown>>({
  table,
  id,
  expectedVersion,
  data,
  entityName = '记录'
}: OptimisticUpdateOptions<T>): Promise<T> {
  const expectedDate = typeof expectedVersion === 'string'
    ? new Date(expectedVersion)
    : expectedVersion

  // 根据表名获取对应的 Prisma 模型
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = prisma[table] as any

  // 1. 先查询当前版本
  const current = await model.findUnique({ where: { id } })

  if (!current) {
    badRequest(`${entityName}不存在`)
  }

  // 2. 检查版本是否匹配
  const currentVersion = current!.updatedAt.getTime()
  const expectedVersionTime = expectedDate.getTime()

  if (currentVersion !== expectedVersionTime) {
    badRequest(`${entityName}已被其他用户修改，请刷新后重试`)
  }

  // 3. 执行更新
  const result = await model.update({
    where: { id },
    data: data as Partial<T>,
  })

  return result
}

/**
 * 带重试的乐观锁更新
 *
 * @param options 更新选项
 * @param maxRetries 最大重试次数
 * @param updateFn 更新函数，接收当前数据，返回新数据
 */
export async function optimisticUpdateWithRetry<T extends Record<string, unknown>>(
  table: 'consumable' | 'sample' | 'testTask' | 'financeReceivable',
  id: string,
  updateFn: (current: T) => Partial<T>,
  maxRetries: number = 3,
  entityName: string = '记录'
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = prisma[table] as any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // 1. 获取当前数据
    const current = await model.findUnique({ where: { id } })

    if (!current) {
      badRequest(`${entityName}不存在`)
    }

    // 2. 计算新数据
    const newData = updateFn(current!)

    try {
      // 3. 尝试更新（使用 updatedAt 作为版本号）
      const result = await model.update({
        where: {
          id,
          updatedAt: current.updatedAt
        },
        data: newData,
      })
      return result
    } catch (error) {
      // 如果是版本冲突，继续重试
      if (attempt < maxRetries - 1) {
        continue
      }
      throw error
    }
  }

  badRequest(`${entityName}更新失败，请稍后重试`)
  throw new Error('Unreachable')
}

/**
 * 库存操作的乐观锁更新
 * 专门用于易耗品库存的增减操作
 */
export async function updateStockWithLock(
  consumableId: string,
  quantityChange: number,
  expectedVersion: Date | string
): Promise<{ newStock: number; updatedAt: Date }> {
  const expectedDate = typeof expectedVersion === 'string'
    ? new Date(expectedVersion)
    : expectedVersion

  // 1. 获取当前库存
  const current = await prisma.consumable.findUnique({
    where: { id: consumableId },
    select: { stockQuantity: true, updatedAt: true, minStock: true }
  })

  if (!current) {
    badRequest('易耗品不存在')
  }

  // 2. 检查版本
  if (current!.updatedAt.getTime() !== expectedDate.getTime()) {
    badRequest('库存已被其他用户修改，请刷新后重试')
  }

  // 3. 计算新库存
  const currentStock = Number(current!.stockQuantity)
  const newStock = currentStock + quantityChange

  if (newStock < 0) {
    badRequest(`库存不足，当前库存: ${currentStock}`)
  }

  // 4. 计算新状态
  let status = 1 // 正常
  if (newStock === 0) {
    status = 0 // 缺货
  } else if (current!.minStock && newStock < Number(current!.minStock)) {
    status = 2 // 低库存
  }

  // 5. 更新库存
  const updated = await prisma.consumable.update({
    where: { id: consumableId },
    data: { stockQuantity: newStock, status }
  })

  return {
    newStock,
    updatedAt: updated.updatedAt
  }
}
