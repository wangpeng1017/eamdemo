'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, Tag, message, Card, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface InspectionStandard {
  id: string
  standardNo: string
  name: string
  description?: string
  validity: string
  devices: string[]
  parameters: string[]
  personnel: string[]
  defaultTemplateId?: string
  createdAt: string
}

const validityMap: Record<string, { text: string; color: string }> = {
  valid: { text: '现行有效', color: 'success' },
  invalid: { text: '已作废', color: 'error' },
}

export default function InspectionStandardsPage() {
  const [data, setData] = useState<InspectionStandard[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/inspection-standard?page=${p}&pageSize=10`)
      const json = await res.json()
      setData(json.list || [])
      setTotal(json.total || 0)
    } catch {
      message.error('加载数据失败')
    }
    setLoading(false)
  }

  const fetchDevices = async () => {
    const res = await fetch('/api/device/list')
    const json = await res.json()
    setDevices(json.list || [])
  }

  const fetchUsers = async () => {
    const res = await fetch('/api/user')
    const json = await res.json()
    setUsers(json.list || [])
  }

  const fetchTemplates = async () => {
    const res = await fetch('/api/test-template?pageSize=100')
    const json = await res.json()
    setTemplates(json.list || [])
  }

  useEffect(() => { fetchData(); fetchDevices(); fetchUsers(); fetchTemplates() }, [page])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({ devices: [], parameters: [''], personnel: [] })
    setModalOpen(true)
  }

  const handleEdit = (record: InspectionStandard) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      parameters: record.parameters.length > 0 ? record.parameters : [''],
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/inspection-standard/${id}`, { method: 'DELETE' })
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
    // 过滤空参数
    const parameters = values.parameters?.filter((p: string) => p.trim()) || []

    const data = { ...values, parameters }
    const url = editingId ? `/api/inspection-standard/${editingId}` : '/api/inspection-standard'
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

  const columns: ColumnsType<InspectionStandard> = [
    { title: '标准编号', dataIndex: 'standardNo', width: 150 },
    { title: '标准名称', dataIndex: 'name', ellipsis: true },
    {
      title: '有效性', dataIndex: 'validity', width: 100,
      render: (v) => <Tag color={validityMap[v]?.color}>{validityMap[v]?.text || v}</Tag>
    },
    {
      title: '关联设备', dataIndex: 'devices', width: 100,
      render: (d) => `${d.length} 个`
    },
    {
      title: '检测参数', dataIndex: 'parameters', width: 100,
      render: (p) => `${p.length} 个`
    },
    {
      title: '可检测人员', dataIndex: 'personnel', width: 100,
      render: (p) => `${p.length} 人`
    },
    {
      title: '默认模版', dataIndex: 'defaultTemplateId', width: 120,
      render: (id: string) => {
        if (!id) return '-'
        const template = templates.find(t => t.code === id)
        return template ? template.name : id
      }
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作', width: 150, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>检查标准/依据管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增标准</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={{ current: page, total, onChange: setPage }}
      />

      <Modal
        title={editingId ? '编辑检查标准' : '新增检查标准'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="standardNo" label="标准编号" rules={[{ required: true }]}>
                <Input placeholder="如：GB/T 228.1-2021" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="validity" label="有效性" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="valid">现行有效</Select.Option>
                  <Select.Option value="invalid">已作废</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="name" label="标准名称" rules={[{ required: true }]}>
            <Input placeholder="如：金属材料 拉伸试验 第1部分：室温试验方法" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="标准适用范围说明" />
          </Form.Item>

          <Card title="关联设备" size="small" style={{ marginBottom: 16 }}>
            <Form.Item name="devices" label="" style={{ marginBottom: 0 }}>
              <Select
                mode="multiple"
                placeholder="选择可用于该标准的设备"
                options={devices.map((d: any) => ({ value: d.id, label: `${d.deviceNo} - ${d.name}` }))}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Card>

          <Card title="可检测人员" size="small" style={{ marginBottom: 16 }}>
            <Form.Item name="personnel" label="" style={{ marginBottom: 0 }}>
              <Select
                mode="multiple"
                placeholder="选择有该标准资质的人员"
                options={users.map((u: any) => ({ value: u.id, label: u.name }))}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Card>

          <Card title="默认检测模版" size="small" style={{ marginBottom: 16 }}>
            <Form.Item name="defaultTemplateId" label="" style={{ marginBottom: 0 }}>
              <Select
                allowClear
                showSearch
                placeholder="选择该标准的默认检测模版"
                options={templates.map((t: any) => ({ value: t.code, label: `${t.code} - ${t.name}` }))}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Card>

          <Card title="检测参数" size="small">
            <Form.List name="parameters">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => (
                    <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...field}
                        style={{ marginBottom: 0, flex: 1 }}
                        rules={[{ required: true, message: '请输入参数名称' }]}
                      >
                        <Input placeholder="如：拉伸强度" />
                      </Form.Item>
                      {fields.length > 1 && (
                        <Button type="link" danger onClick={() => remove(field.name)}>删除</Button>
                      )}
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} block>+ 添加参数</Button>
                </>
              )}
            </Form.List>
          </Card>
        </Form>
      </Modal>
    </div>
  )
}
