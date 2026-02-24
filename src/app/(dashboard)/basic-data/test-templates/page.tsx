
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Tag, Popconfirm, Input } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface TestTemplate {
  id: string
  code: string
  name: string
  category: string
  method: string
  version: string
  status: string
  author: string
  createdAt: string
  schema?: string | null
}

const statusMap: Record<string, { text: string; color: string }> = {
  active: { text: '启用', color: 'success' },
  archived: { text: '归档', color: 'default' },
}

export default function TestTemplatesPage() {
  const [data, setData] = useState<TestTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const router = useRouter()

  const fetchData = async (p = page) => {
    setLoading(true)
    try {
      const keywordParam = keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''
      const res = await fetch(`/api/test-template?page=${p}&pageSize=10${keywordParam}`)
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data.list || [])
        setTotal(json.data.total || 0)
      } else {
        setData(json.list || [])
        setTotal(json.total || 0)
      }
    } catch (e) {
      showError('加载数据失败')
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page, keyword])

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const res = await fetch(`/api/test-template/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-status' })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess(currentStatus === 'active' ? '已禁用' : '已启用')
        fetchData()
      } else {
        showError(json.error?.message || '操作失败')
      }
    } catch (e) {
      showError('操作失败，请重试')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/test-template/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('删除成功')
        fetchData()
      } else {
        showError(json.error?.message || '删除失败')
      }
    } catch (e) {
      showError('删除失败，请重试')
    }
  }

  const columns: ColumnsType<TestTemplate> = [
    { title: '项目编号', dataIndex: 'code', width: 140 },
    { title: '检测项目', dataIndex: 'name', width: 200 },
    {
      title: '分类', dataIndex: 'category', width: 100,
      render: (cat) => <Tag>{cat}</Tag>
    },
    { title: '检测标准', dataIndex: 'method', ellipsis: true },
    { title: '版本', dataIndex: 'version', width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (s) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作', fixed: 'right',
      render: (_, record) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => router.push(`/basic-data/test-templates/edit/${record.id}`)}
          >
            编辑模版
          </Button>
          <Button
            size="small"
            onClick={() => handleToggleStatus(record.id, record.status)}
          >
            {record.status === 'active' ? '禁用' : '启用'}
          </Button>
          <Popconfirm
            title="确认删除？"
            description="确定要删除这个检测项目吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>检测项目管理</h2>
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Input.Search
            placeholder="项目名称 / 项目编号"
            allowClear
            style={{ width: 220 }}
            onSearch={(v) => { setPage(1); setKeyword(v) }}
            enterButton
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/basic-data/test-templates/create')}
          >
            新增检测项目
          </Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{ current: page, total, onChange: setPage }}
      />
    </div>
  )
}
