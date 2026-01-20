'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, Tag, message, DatePicker } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'

interface PersonnelCapability {
  id: string
  userId: string
  user: { id: string; name: string }
  standardId: string
  standard: { id: string; standardNo: string; name: string }
  parameter: string
  certificate: string
  expiryDate: string
}

// 计算有效期状态
const getExpiryStatus = (expiryDate: string) => {
  const today = dayjs()
  const expiry = dayjs(expiryDate)
  const daysLeft = expiry.diff(today, 'day')

  if (daysLeft < 0) {
    return { status: 'expired', text: '(已过期)', color: 'error' }
  } else if (daysLeft <= 30) {
    return { status: 'warning', text: `(${daysLeft}天后过期)`, color: 'warning' }
  } else {
    return { status: 'normal', text: '', color: 'success' }
  }
}

export default function PersonnelCapabilityPage() {
  const [data, setData] = useState<PersonnelCapability[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [standards, setStandards] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/personnel-capability?page=${p}&pageSize=10`)
      const json = await res.json()
      setData(json.list || [])
      setTotal(json.total || 0)
    } catch {
      message.error('加载数据失败')
    }
    setLoading(false)
  }

  const fetchUsers = async () => {
    const res = await fetch('/api/user')
    const json = await res.json()
    setUsers(json.list || [])
  }

  const fetchStandards = async () => {
    const res = await fetch('/api/inspection-standard')
    const json = await res.json()
    setStandards(json.list || [])
  }

  useEffect(() => { fetchData(); fetchUsers(); fetchStandards() }, [page])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: PersonnelCapability) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      expiryDate: dayjs(record.expiryDate),
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/personnel-capability/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      message.success('删除成功')
      fetchData()
    } else {
      message.error(json.error?.message || '删除失败')
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      expiryDate: values.expiryDate.toISOString(),
    }
    const url = editingId ? `/api/personnel-capability/${editingId}` : '/api/personnel-capability'
    const method = editingId ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    message.success(editingId ? '更新成功' : '创建成功')
    setModalOpen(false)
    fetchData()
  }

  // 根据选择的标准获取参数选项
  const handleStandardChange = (standardId: string) => {
    const standard = standards.find(s => s.id === standardId)
    if (standard && standard.parameters.length > 0) {
      form.setFieldsValue({ parameter: undefined })
    }
  }

  const columns: ColumnsType<PersonnelCapability> = [
    { title: '员工姓名', dataIndex: ['user', 'name'], width: 100 },
    {
      title: '检查标准',
      dataIndex: ['standard', 'name'],
      ellipsis: true,
      render: (name, record) => `${record.standard.standardNo} ${name}`
    },
    { title: '检测参数', dataIndex: 'parameter', width: 120 },
    { title: '证书/资质', dataIndex: 'certificate', ellipsis: true },
    {
      title: '有效期至', dataIndex: 'expiryDate', width: 140,
      render: (date: string) => {
        const status = getExpiryStatus(date)
        return (
          <span style={{ color: status.color === 'error' ? '#ff4d4f' : status.color === 'warning' ? '#faad14' : undefined }}>
            {dayjs(date).format('YYYY-MM-DD HH:mm:ss')} {status.text}
          </span>
        )
      }
    },
    {
      title: '状态', dataIndex: 'expiryDate', width: 80,
      render: (date: string) => {
        const status = getExpiryStatus(date)
        if (status.status === 'expired') {
          return <Tag icon={<WarningOutlined />} color="error">已过期</Tag>
        } else if (status.status === 'warning') {
          return <Tag color="warning">即将过期</Tag>
        } else {
          return <Tag color="success">正常</Tag>
        }
      }
    },
    {
      title: '操作', width: 100, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}/>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>人员资质管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增资质</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={{ current: page, total, onChange: setPage }}
      />

      <Modal
        title={editingId ? '编辑人员资质' : '新增人员资质'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="userId" label="员工" rules={[{ required: true }]}>
            <Select
              placeholder="选择员工"
              options={users.map((u: any) => ({ value: u.id, label: u.name }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="standardId" label="检查标准" rules={[{ required: true }]}>
            <Select
              placeholder="选择检查标准"
              options={standards.map((s: any) => ({
                value: s.id,
                label: `${s.standardNo} ${s.name}`,
                parameters: s.parameters
              }))}
              onChange={handleStandardChange}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.standardId !== curr.standardId}>
            {({ getFieldValue }) => {
              const standardId = getFieldValue('standardId')
              const standard = standards.find(s => s.id === standardId)
              const parameters = standard?.parameters || []
              return (
                <Form.Item name="parameter" label="检测参数" rules={[{ required: true }]}>
                  {parameters.length > 0 ? (
                    <Select
                      placeholder="选择检测参数"
                      options={parameters.map((p: string) => ({ value: p, label: p }))}
                    />
                  ) : (
                    <Input placeholder="请先选择检查标准，或手动输入参数" />
                  )}
                </Form.Item>
              )
            }}
          </Form.Item>
          <Form.Item name="certificate" label="证书/资质" rules={[{ required: true }]}>
            <Input placeholder="如：力学检测员证" />
          </Form.Item>
          <Form.Item name="expiryDate" label="有效期至" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
