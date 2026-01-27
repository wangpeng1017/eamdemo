'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Client {
  id: string
  name: string
  contact: string | null
  phone: string | null
  address: string | null
  creditCode: string | null  // 税号
  bankName: string | null    // 开户行
  bankAccount: string | null // 银行账号
  remark: string | null
  status: string
  createdAt: string
}

interface ClientRelations {
  clientName: string
  entrustmentCount: number
  quotationCount: number
  contractCount: number
  canDelete: boolean
  message: string
}

export default function ClientPage() {
  const [data, setData] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [modal, contextHolder] = Modal.useModal()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/client?page=${p}&pageSize=10`)
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
    setEditingId(null)
    form.resetFields()
    // 新增时不设置状态,由后端默认为pending,通过审批流程控制
    setModalOpen(true)
  }

  const handleEdit = (record: Client) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  // 获取委托单位的关联数据
  const checkClientRelations = async (id: string, name: string) => {
    const hide = message.loading('正在检查关联数据...', 0)
    console.log(`[Client] checking relations for ${id} (${name})`)
    try {
      const res = await fetch(`/api/client/${id}/relations`)
      console.log(`[Client] api response status: ${res.status}`)

      const json = await res.json()
      console.log(`[Client] api response json:`, json)

      if (json.success && json.data) {
        const relations = json.data as ClientRelations
        showDeleteConfirm(id, name, relations)
      } else {
        console.error('[Client] api failed:', json)
        message.error(json.error?.message || '获取关联数据失败')
      }
    } catch (error) {
      console.error('[Client] check relations error:', error)
      message.error('获取关联数据失败，请检查网络或重试')
    } finally {
      hide()
    }
  }

  // 显示删除确认对话框
  const showDeleteConfirm = (id: string, name: string, relations: ClientRelations) => {
    console.log('[Client] showDeleteConfirm called', { id, name, relations })

    if (!relations.canDelete) {
      console.log('[Client] Cannot delete, showing warning')
      // 有关联数据，显示详细信息
      modal.confirm({
        title: '无法删除委托单位',
        icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
        content: (
          <div>
            <p style={{ marginBottom: 16, fontSize: 16 }}>
              <strong>{name}</strong> {relations.message}
            </p>
            <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>关联数据详情：</div>
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
                {relations.entrustmentCount > 0 && (
                  <li>委托单：<strong style={{ color: '#1890ff' }}>{relations.entrustmentCount}</strong> 个</li>
                )}
                {relations.quotationCount > 0 && (
                  <li>报价单：<strong style={{ color: '#1890ff' }}>{relations.quotationCount}</strong> 个</li>
                )}
                {relations.contractCount > 0 && (
                  <li>合同：<strong style={{ color: '#1890ff' }}>{relations.contractCount}</strong> 个</li>
                )}
              </ul>
            </div>
            <p style={{ marginTop: 16, color: '#ff4d4f', fontSize: 13 }}>
              请先删除或取消关联这些数据后，再删除该委托单位。
            </p>
          </div>
        ),
        okText: '知道了',
        okType: 'danger',
        cancelButtonProps: { style: { display: 'none' } },
      })
    } else {
      console.log('[Client] Can delete, showing confirm')
      // 无关联数据，显示删除确认
      modal.confirm({
        title: '确认删除委托单位',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>确定要删除委托单位 <strong>{name}</strong> 吗？</p>
            <p style={{ color: '#999', fontSize: 13 }}>此操作不可恢复</p>
          </div>
        ),
        okText: '确认删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          console.log('[Client] Executing delete...')
          const res = await fetch(`/api/client/${id}`, { method: 'DELETE' })
          const json = await res.json()
          if (res.ok && json.success) {
            message.success('删除成功')
            fetchData()
          } else {
            message.error(json.error?.message || '删除失败')
          }
        },
      })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    await checkClientRelations(id, name)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const url = editingId ? `/api/client/${editingId}` : '/api/client'
    const method = editingId ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    })
    message.success(editingId ? '更新成功' : '创建成功')
    setModalOpen(false)
    fetchData()
  }

  const columns: ColumnsType<Client> = [
    { title: '单位名称', dataIndex: 'name', width: 200 },
    { title: '地址', dataIndex: 'address', width: 150, ellipsis: true },
    {
      title: '开票信息',
      width: 280,
      render: (_, record) => (
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          {record.creditCode && <div><span style={{ color: '#1890ff' }}>税号:</span> {record.creditCode}</div>}
          {record.bankName && <div><span style={{ color: '#1890ff' }}>银行:</span> {record.bankName}</div>}
          {record.bankAccount && <div><span style={{ color: '#1890ff' }}>账号:</span> {record.bankAccount}</div>}
          {!record.creditCode && !record.bankName && !record.bankAccount && <span style={{ color: '#999' }}>-</span>}
        </div>
      ),
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (s: string) => <Tag color={s === 'approved' ? 'success' : 'default'}>{s === 'approved' ? '已批准' : s}</Tag>
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    { title: '联系人', dataIndex: 'contact', width: 100 },
    { title: '联系方式', dataIndex: 'phone', width: 130 },
    {
      title: '操作', width: 80, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id, record.name)}
          />
        </Space>
      )
    }
  ]

  return (
    <div>
      {contextHolder}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>业务单位管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增单位</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage, showSizeChanger: false }}
      />
      <Modal
        title={editingId ? '编辑单位' : '新增单位'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="单位名称" rules={[{ required: true, message: '请输入单位名称' }]}>
            <Input placeholder="请输入单位全称" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="contact" label="联系人">
              <Input placeholder="请输入联系人" />
            </Form.Item>
            <Form.Item name="phone" label="联系方式">
              <Input placeholder="请输入联系电话" />
            </Form.Item>
          </div>
          <Form.Item name="address" label="地址">
            <Input placeholder="请输入地址" />
          </Form.Item>
          <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, marginBottom: 16 }}>
            <div style={{ fontWeight: 500, marginBottom: 12 }}>开票信息</div>
            <Form.Item name="creditCode" label="税号" style={{ marginBottom: 12 }}>
              <Input placeholder="如: 91340200713920435C" />
            </Form.Item>
            <Form.Item name="bankName" label="开户银行" style={{ marginBottom: 12 }}>
              <Input placeholder="如: 中国工商银行芜湖分行" />
            </Form.Item>
            <Form.Item name="bankAccount" label="银行账号" style={{ marginBottom: 0 }}>
              <Input placeholder="如: 1307023009022100123" />
            </Form.Item>
          </div>
          {/* 状态字段仅在编辑时显示,新增时状态由审批流程控制 */}
          {editingId && (
            <Form.Item name="status" label="状态">
              <Select options={[
                { value: 'approved', label: '已批准' },
                { value: 'pending', label: '待审批' },
                { value: 'rejected', label: '已拒绝' },
              ]} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}
