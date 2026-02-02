/**
 * @file UI统一提示工具测试
 * @desc 测试confirm.ts中的所有提示函数
 */

import {
  showConfirm,
  showWarning,
  showSuccess,
  showError,
  showInfo
} from '@/lib/confirm'

// Mock Ant Design Modal
jest.mock('antd', () => ({
  Modal: {
    confirm: jest.fn(),
    warning: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

import { Modal } from 'antd'

describe('UI统一提示工具测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('showConfirm - 确认对话框', () => {
    it('应该调用Modal.confirm并传入正确参数', () => {
      const onOk = jest.fn()
      const onCancel = jest.fn()

      showConfirm('删除确认', '确定要删除这条记录吗？', onOk, onCancel)

      expect(Modal.confirm).toHaveBeenCalledWith({
        title: '删除确认',
        content: '确定要删除这条记录吗？',
        okText: '确认',
        cancelText: '取消',
        onOk,
        onCancel,
      })
    })

    it('应该处理只有标题的情况', () => {
      showConfirm('确认删除')

      expect(Modal.confirm).toHaveBeenCalledWith({
        title: '确认删除',
        content: '',
        okText: '确认',
        cancelText: '取消',
        onOk: undefined,
        onCancel: undefined,
      })
    })
  })

  describe('showWarning - 警告对话框', () => {
    it('应该调用Modal.warning并传入正确参数', () => {
      showWarning('操作警告', '此操作不可撤销')

      expect(Modal.warning).toHaveBeenCalledWith({
        title: '操作警告',
        content: '此操作不可撤销',
      })
    })

    it('应该处理只有标题的情况', () => {
      showWarning('注意')

      expect(Modal.warning).toHaveBeenCalledWith({
        title: '注意',
        content: '',
      })
    })
  })

  describe('showSuccess - 成功提示', () => {
    it('应该调用Modal.success并传入正确参数', () => {
      showSuccess('操作成功', '数据已保存')

      expect(Modal.success).toHaveBeenCalledWith({
        title: '操作成功',
        content: '数据已保存',
      })
    })
  })

  describe('showError - 错误提示', () => {
    it('应该调用Modal.error并传入正确参数', () => {
      showError('操作失败', '网络连接失败')

      expect(Modal.error).toHaveBeenCalledWith({
        title: '操作失败',
        content: '网络连接失败',
      })
    })

    it('应该处理只有标题的情况', () => {
      showError('保存失败')

      expect(Modal.error).toHaveBeenCalledWith({
        title: '保存失败',
        content: '',
      })
    })
  })

  describe('showInfo - 信息提示', () => {
    it('应该调用Modal.info并传入正确参数', () => {
      showInfo('提示', '系统将于今晚维护')

      expect(Modal.info).toHaveBeenCalledWith({
        title: '提示',
        content: '系统将于今晚维护',
      })
    })
  })

  describe('函数签名一致性', () => {
    it('所有提示函数应该接受两个参数', () => {
      // 测试函数签名一致性
      expect(showConfirm).toHaveLength(4) // title, content, onOk, onCancel
      expect(showWarning).toHaveLength(2) // title, content
      expect(showSuccess).toHaveLength(2) // title, content
      expect(showError).toHaveLength(2) // title, content
      expect(showInfo).toHaveLength(2) // title, content
    })
  })
})
