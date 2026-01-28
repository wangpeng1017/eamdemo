/**
 * @file 重新评估弹窗 - 修改需求并重新评估
 * @desc 当评估未通过时，可以修改需求并选择新的评估人重新评估
 */

'use client'

import { useState, useEffect } from 'react'
import { Modal, Form, Select, Input, message, Divider } from 'antd'
import SampleTestItemTable, { SampleTestItemData } from './SampleTestItemTable'

const { TextArea } = Input

interface User {
  id: string
  name: string
  username: string
  dept?: { name: string }
}

interface ReassessmentModalProps {
  open: boolean
  consultationId: string | null
  consultationNo?: string
  currentTestItems?: any[]
  currentRequirement?: string
  onCancel: () => void
  onSuccess: () => void
}

export default function ReassessmentModal({
  open,
  consultationId,
  consultationNo,
  currentTestItems,
  currentRequirement,
  onCancel,
  onSuccess,
}: ReassessmentModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [sampleTestItems, setSampleTestItems] = useState<SampleTestItemData[]>([])

  useEffect(() => {
    if (open) {
      fetchUsers()
      // 初始化检测项目
      if (currentTestItems && currentTestItems.length > 0) {
        setSampleTestItems(currentTestItems.map((item, index) => ({
          key: index.toString(),
          sampleName: item.sampleName || '',
          testItems: item.testItems || [],
        })))
      } else {
        setSampleTestItems([])
      }
      // 初始化客户需求
      form.setFieldsValue({
        clientRequirement: currentRequirement || '',
      })
    }
  }, [open, currentTestItems, currentRequirement, form])

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

      // 转换评估人数据
      const assessors = values.assessorIds.map((id: string) => {
        const user = users.find(u => u.id === id)
        return {
          id,
          name: user?.name || ''
        }
      })

      // 准备请求数据
      const requestData: any = {
        assessors,
      }

      // 如果有修改检测项目或客户需求，则添加到请求中
      if (sampleTestItems.length > 0 || values.clientRequirement) {
        requestData.consultationData = {}

        if (sampleTestItems.length > 0) {
          requestData.consultationData.testItems = sampleTestItems.map(item => ({
            sampleName: item.sampleName,
            testItems: item.testItems,
          }))
        }

        if (values.clientRequirement) {
          requestData.consultationData.clientRequirement = values.clientRequirement
        }
      }

      const res = await fetch(`/api/consultation/${consultationId}/reassess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })

      const json = await res.json()

      if (json.success) {
        message.success(json.data.message || `已开始第 ${json.data.round} 轮评估`)
        form.resetFields()
        setSampleTestItems([])
        onSuccess()
      } else {
        message.error(json.error?.message || '发起重新评估失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      console.error('发起重新评估失败:', error)
      message.error('发起重新评估失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setSampleTestItems([])
    onCancel()
  }

  return (
    <Modal
      title={`重新评估 - ${consultationNo || ''}`}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={900}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 24 }}
      >
        <Divider orientation="left">修改需求（可选）</Divider>

        <Form.Item
          label="检测项目"
          extra="可以修改检测项目，如不修改请留空"
        >
          <SampleTestItemTable
            value={sampleTestItems}
            onChange={setSampleTestItems}
          />
        </Form.Item>

        <Form.Item
          label="客户需求说明"
          name="clientRequirement"
          extra="可以补充或修改客户的具体需求"
        >
          <TextArea
            rows={4}
            placeholder="请输入客户需求说明..."
            showCount
            maxLength={500}
          />
        </Form.Item>

        <Divider orientation="left">选择评估人（必填）</Divider>

        <Form.Item
          label="评估人"
          name="assessorIds"
          rules={[{ required: true, message: '请选择至少一个评估人' }]}
          extra="选择新的评估人进行重新评估"
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
