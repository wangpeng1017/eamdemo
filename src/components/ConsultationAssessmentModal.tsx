/**
 * @file 咨询评估弹窗 - 发起评估
 * @desc 选择评估人并发起评估
 */

'use client'

import { useState, useEffect } from 'react'
import { Modal, Form, Select, message } from 'antd'

interface User {
  id: string
  name: string
  username: string
  dept?: { name: string }
}

interface ConsultationAssessmentModalProps {
  open: boolean
  consultationId: string | null
  consultationNo?: string
  onCancel: () => void
  onSuccess: () => void
}

export default function ConsultationAssessmentModal({
  open,
  consultationId,
  consultationNo,
  onCancel,
  onSuccess,
}: ConsultationAssessmentModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  // 获取用户列表
  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open])

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await fetch('/api/user?pageSize=1000')
      const json = await res.json()
      if (json.success && json.data) {
        setUsers(json.data.list || [])
      } else {
        setUsers(json.list || [])
      }
    } catch (error) {
      console.error('获取用户列表失败:', error)
      message.error('获取用户列表失败')
    } finally {
      setUsersLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      // 转换为API需要的格式
      const assessors = values.assessorIds.map((id: string) => {
        const user = users.find(u => u.id === id)
        return {
          id,
          name: user?.name || ''
        }
      })

      const res = await fetch(`/api/consultation/${consultationId}/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessors }),
      })

      const json = await res.json()

      if (json.success) {
        message.success(json.data.message || `评估已发起，等待 ${assessors.length} 人反馈`)
        form.resetFields()
        onSuccess()
      } else {
        message.error(json.error?.message || '发起评估失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误，不显示message
        return
      }
      console.error('发起评估失败:', error)
      message.error('发起评估失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title={`发起评估 - ${consultationNo || ''}`}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 24 }}
      >
        <Form.Item
          label="选择评估人"
          name="assessorIds"
          rules={[{ required: true, message: '请选择至少一个评估人' }]}
          extra="可以选择多个评估人进行评估"
        >
          <Select
            mode="multiple"
            placeholder="请选择评估人"
            showSearch
            loading={usersLoading}
            optionFilterProp="label"
            options={users.map(u => ({
              value: u.id,
              label: `${u.name}${u.dept ? ` (${u.dept.name})` : ''}`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
