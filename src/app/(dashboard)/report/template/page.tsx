'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Upload, message, Space, Tag, Card } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FileOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'

interface ReportTemplate {
  id: string
  name: string
  code: string
  category: string
  fileUrl: string
  status: string
}

const categoryMap: Record<string, string> = {
  physics: '物理性能',
  chemical: '化学性能',
  mechanical: '力学性能',
  electrical: '电气性能',
  environmental: '环境试验',
  other: '其他',
}

const statusMap: Record<string, { text: string; color: string }> = {
  active: { text: '启用', color: 'success' },
  inactive: { text: '停用', color: 'default' },
}

export default function ReportTemplatePage() {
  const [data, setData] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ReportTemplate | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: '10',
      ...(categoryFilter && { category: categoryFilter }),
    })
    try {
      const res = await fetch('/api/report/template?' + params)
      const json = await res.json()
      if (json.success && json.data) {
      setData(json.data.list || [])
      setTotal(json.data.total || 0)
    } else {
      setData(json.list || [])
      setTotal(json.total || 0)
    }
    } catch (error) {
      message.error('获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page, categoryFilter])

  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldValue('status', 'active')
    setFileList([])
    setModalOpen(true)
  }

  const handleEdit = (record: ReportTemplate) => {
    setEditingRecord(record)
    form.setFieldsValue(record)
    setFileList(record.fileUrl ? [{
      uid: '-1',
      name: record.fileUrl.split('/').pop() || 'template.docx',
      status: 'done',
      url: record.fileUrl,
    }] : [])
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该模板吗？',
      onOk: async () => {
        try {
          const res = await fetch('/api/report/template/' + id, {
            method: 'DELETE',
          })
          if (res.ok) {
            message.success('删除成功')
            fetchData()
          } else {
            message.error('删除失败')
          }
        } catch (error) {
          message.error('删除失败')
        }
      },
    })
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()

    const fileUrl = fileList.length > 0 && fileList[0].url
      ? fileList[0].url
      : editingRecord?.fileUrl
      ? editingRecord.fileUrl
      : '/templates/default.docx'

    try {
      const url = editingRecord
        ? '/api/report/template/' + editingRecord.id
        : '/api/report/template'
      const method = editingRecord ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          fileUrl,
        }),
      })

      if (res.ok) {
        message.success(editingRecord ? '更新成功' : '创建成功')
        setModalOpen(false)
        fetchData()
      } else {
        message.error(editingRecord ? '更新失败' : '创建失败')
      }
    } catch (error) {
      message.error(editingRecord ? '更新失败' : '创建失败')
    }
  }

  const columns: ColumnsType<ReportTemplate> = [
    { title: '模板编号', dataIndex: 'code', width: 120 },
    { title: '模板名称', dataIndex: 'name', width: 200 },
    {
      title: '类别',
      dataIndex: 'category',
      width: 120,
      render: (c) => categoryMap[c] || c,
    },
    {
      title: '模板文件',
      dataIndex: 'fileUrl',
      width: 150,
      render: (url) => (
        <a href={url} target="_blank" rel="noreferrer">
          <FileOutlined /> 查看文件
        </a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>,
    },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="p-4">
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card>
          <div className="text-2xl font-bold">{data.length}</div>
          <div className="text-gray-500">模板总数</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-green-600">
            {data.filter((d) => d.status === 'active').length}
          </div>
          <div className="text-gray-500">启用模板</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-blue-600">
            {data.filter((d) => d.category === 'physics').length}
          </div>
          <div className="text-gray-500">物理性能</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-orange-600">
            {data.filter((d) => d.category === 'chemical').length}
          </div>
          <div className="text-gray-500">化学性能</div>
        </Card>
      </div>

      <div className="mb-4 flex gap-4">
        <Select
          placeholder="类别筛选"
          allowClear
          style={{ width: 150 }}
          value={categoryFilter}
          onChange={(v) => setCategoryFilter(v)}
        >
          <Select.Option value="physics">物理性能</Select.Option>
          <Select.Option value="chemical">化学性能</Select.Option>
          <Select.Option value="mechanical">力学性能</Select.Option>
          <Select.Option value="electrical">电气性能</Select.Option>
          <Select.Option value="environmental">环境试验</Select.Option>
          <Select.Option value="other">其他</Select.Option>
        </Select>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增模板
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          onChange: (p) => setPage(p),
        }}
      />

      <Modal
        title={editingRecord ? '编辑模板' : '新增模板'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="模板名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="请输入模板名称" />
          </Form.Item>
          <Form.Item label="模板编号" name="code" rules={[{ required: true }]}>
            <Input placeholder="如: TMP-PH-001" />
          </Form.Item>
          <Form.Item label="类别" name="category" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="physics">物理性能</Select.Option>
              <Select.Option value="chemical">化学性能</Select.Option>
              <Select.Option value="mechanical">力学性能</Select.Option>
              <Select.Option value="electrical">电气性能</Select.Option>
              <Select.Option value="environmental">环境试验</Select.Option>
              <Select.Option value="other">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="模板文件" name="fileUrl">
            <Upload
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
              maxCount={1}
              accept=".docx,.doc,.xlsx"
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
            <div className="text-gray-400 text-sm mt-1">
              支持 Word、Excel 格式模板
            </div>
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="active">启用</Select.Option>
              <Select.Option value="inactive">停用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
