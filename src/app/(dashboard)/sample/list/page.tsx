'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Tag, Modal, Form, Input, Select, DatePicker, Drawer, Descriptions, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Sample {
  id: string
  sampleNo: string
  name: string
  type: string | null
  specification: string | null
  quantity: string | null
  unit: string | null
  storageLocation: string | null
  status: string
  receivedDate: string | null
  remark: string | null
  createdAt: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  received: { text: '已接收', color: 'default' },
  testing: { text: '检测中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
  returned: { text: '已归还', color: 'warning' },
}

export default function SampleListPage() {
  const router = useRouter()
  const [data, setData] = useState<Sample[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)

  // 查看抽屉状态
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [currentSample, setCurrentSample] = useState<Sample | null>(null)

  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/sample?page=${p}&pageSize=10`)
    const json = await res.json()
    if (json.success && json.data) {
      setData(json.data.list || [])
      setTotal(json.data.total || 0)
    } else {
      setData(json.list || [])
      setTotal(json.total || 0)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page])

  const handleAdd = () => {
    router.push('/sample/list/create')
  }

  const handleView = (record: Sample) => {
    setCurrentSample(record)
    setViewDrawerOpen(true)
  }

  const handleEdit = (record: Sample) => {
    router.push(`/sample/list/edit/${record.id}`)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/sample/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      showSuccess('删除成功')
      fetchData()
    } else {
      showError(json.error?.message || '删除失败')
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      receivedDate: values.receivedDate?.toISOString()
    }
    await fetch('/api/sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    showSuccess('创建成功')
    setModalOpen(false)
    fetchData()
  }

  const columns: ColumnsType<Sample> = [
    { title: '样品编号', dataIndex: 'sampleNo', width: 150 },
    { title: '样品名称', dataIndex: 'name' },
    { title: '样品类型', dataIndex: 'type', width: 100 },
    { title: '规格型号', dataIndex: 'specification', width: 120 },
    { title: '数量', dataIndex: 'quantity', width: 80 },
    { title: '存放位置', dataIndex: 'storageLocation', width: 120 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>
    },
    {
      title: '接收日期', dataIndex: 'receivedDate', width: 120,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '操作', fixed: 'right',
      render: (_, record) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除该样品？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>样品列表</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增样品</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
      />

      {/* 查看抽屉 */}
      <Drawer
        title="样品详情"
        placement="right"
        width={800}
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
      >
        {currentSample && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="样品编号">{currentSample.sampleNo}</Descriptions.Item>
            <Descriptions.Item label="样品名称">{currentSample.name}</Descriptions.Item>
            <Descriptions.Item label="样品类型">{currentSample.type || '-'}</Descriptions.Item>
            <Descriptions.Item label="规格型号">{currentSample.specification || '-'}</Descriptions.Item>
            <Descriptions.Item label="数量">{currentSample.quantity || '-'}</Descriptions.Item>
            <Descriptions.Item label="单位">{currentSample.unit || '-'}</Descriptions.Item>
            <Descriptions.Item label="存放位置">{currentSample.storageLocation || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[currentSample.status]?.color}>
                {statusMap[currentSample.status]?.text || currentSample.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="接收日期">
              {currentSample.receivedDate ? dayjs(currentSample.receivedDate).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(currentSample.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {currentSample.remark || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal
        title="新增样品"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="样品名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="样品类型">
            <Select options={[
              { value: '金属', label: '金属' },
              { value: '塑料', label: '塑料' },
              { value: '复合材料', label: '复合材料' },
              { value: '其他', label: '其他' },
            ]} />
          </Form.Item>
          <Form.Item name="specification" label="规格型号">
            <Input />
          </Form.Item>
          <Form.Item name="quantity" label="数量">
            <Input />
          </Form.Item>
          <Form.Item name="unit" label="单位">
            <Input placeholder="如：个、件、kg" />
          </Form.Item>
          <Form.Item name="storageLocation" label="存放位置">
            <Input />
          </Form.Item>
          <Form.Item name="receivedDate" label="接收日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
