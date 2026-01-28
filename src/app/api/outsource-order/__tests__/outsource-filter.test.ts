/**
 * @file outsource-filter.test.ts
 * @desc 委外订单过滤功能测试 - TDD功能2：我的委外 filter=my
 */

import { GET } from '@/app/api/outsource-order/route'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
    }
  }))
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    outsourceOrder: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  }
}))

describe('GET /api/outsource-order - 委外订单过滤', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('filter=my 参数', () => {
    it('应该只返回当前用户作为内部负责人的订单', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          orderNo: 'OUT001',
          task: {
            project: {
              subcontractAssignee: 'test-user-id',
              subcontractAssigneeName: 'Test User'
            }
          }
        }
      ]

      ;(prisma.outsourceOrder.findMany as jest.Mock).mockResolvedValue(mockOrders)
      ;(prisma.outsourceOrder.count as jest.Mock).mockResolvedValue(1)

      const request = new NextRequest('http://localhost/api/outsource-order?filter=my')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.list).toHaveLength(1)
      expect(data.data.list[0].task.project.subcontractAssignee).toBe('test-user-id')

      // 验证 Prisma 查询使用了正确的 where 条件
      expect(prisma.outsourceOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            task: expect.objectContaining({
              project: expect.objectContaining({
                subcontractAssignee: 'test-user-id'
              })
            })
          })
        })
      )
    })

    it('没有filter参数时应该返回所有订单', async () => {
      const mockOrders = [
        { id: 'order-1', orderNo: 'OUT001' },
        { id: 'order-2', orderNo: 'OUT002' },
      ]

      ;(prisma.outsourceOrder.findMany as jest.Mock).mockResolvedValue(mockOrders)
      ;(prisma.outsourceOrder.count as jest.Mock).mockResolvedValue(2)

      const request = new NextRequest('http://localhost/api/outsource-order')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.list).toHaveLength(2)

      // 验证 Prisma 查询没有 subcontractAssignee 过滤
      expect(prisma.outsourceOrder.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({
          where: expect.objectContaining({
            task: expect.objectContaining({
              project: expect.objectContaining({
                subcontractAssignee: expect.anything()
              })
            })
          })
        })
      )
    })

    it('filter=my 且用户未登录时应该返回401', async () => {
      // Mock未登录状态
      const auth = require('@/lib/auth')
      auth.auth.mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost/api/outsource-order?filter=my')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('关联数据返回', () => {
    it('应该包含 task.project.subcontractAssigneeName 字段', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          orderNo: 'OUT001',
          task: {
            id: 'task-1',
            project: {
              id: 'project-1',
              subcontractAssignee: 'user-1',
              subcontractAssigneeName: '张三'
            }
          }
        }
      ]

      ;(prisma.outsourceOrder.findMany as jest.Mock).mockResolvedValue(mockOrders)
      ;(prisma.outsourceOrder.count as jest.Mock).mockResolvedValue(1)

      const request = new NextRequest('http://localhost/api/outsource-order')
      const response = await GET(request)
      const data = await response.json()

      expect(data.data.list[0].task.project).toHaveProperty('subcontractAssigneeName')
      expect(data.data.list[0].task.project.subcontractAssigneeName).toBe('张三')

      // 验证 Prisma include 包含了关联查询
      expect(prisma.outsourceOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            task: expect.objectContaining({
              include: expect.objectContaining({
                project: true
              })
            })
          })
        })
      )
    })
  })
})
