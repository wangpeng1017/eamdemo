/**
 * @file 样品检测项表格组件
 * @desc 统一的样品+检测项目可编辑表格，用于业务单据
 * @see PRD: docs/plans/2026-01-27-sample-test-item-design.md
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Input, InputNumber, Select, Space, message, Popconfirm } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

// 样品检测项数据类型
export interface SampleTestItemData {
  id?: string
  key: string // 前端临时 key
  sampleName: string
  batchNo?: string
  material?: string
  appearance?: string
  quantity: number
  testTemplateId?: string
  testItemName: string
  testStandard?: string
  judgmentStandard?: string
}

// 检测项目选项类型
interface TestTemplateOption {
  id: string
  code: string
  name: string
  method: string // 检测标准
}

interface SampleTestItemTableProps {
  bizType: string
  bizId?: string
  value?: SampleTestItemData[]
  onChange?: (items: SampleTestItemData[]) => void
  readonly?: boolean
}

export default function SampleTestItemTable({
  bizType,
  bizId,
  value,
  onChange,
  readonly = false,
}: SampleTestItemTableProps) {
  const [items, setItems] = useState<SampleTestItemData[]>(value || [])
  const [testTemplates, setTestTemplates] = useState<TestTemplateOption[]>([])
  const [loading, setLoading] = useState(false)

  // 加载检测项目选项
  useEffect(() => {
    const fetchTestTemplates = async () => {
      try {
        const res = await fetch('/api/test-template?pageSize=1000&status=active')
        const json = await res.json()
        if (json.success && json.data?.list) {
          setTestTemplates(json.data.list)
        } else if (json.list) {
          setTestTemplates(json.list)
        }
      } catch (error) {
        // 静默处理错误，使用空数组
        setTestTemplates([])
      }
    }
    fetchTestTemplates()
  }, [])

  // 从服务器加载数据
  useEffect(() => {
    if (bizId) {
      loadData()
    }
  }, [bizId])

  // 同步外部 value 变化
  useEffect(() => {
    if (value) {
      setItems(value)
    }
  }, [value])

  const loadData = async () => {
    if (!bizId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/sample-test-item?bizType=${bizType}&bizId=${bizId}`)
      const json = await res.json()
      if (json.success && json.data) {
        const loadedItems = json.data.map((item: any) => ({
          ...item,
          key: item.id || `temp_${Date.now()}_${Math.random()}`,
        }))
        setItems(loadedItems)
        onChange?.(loadedItems)
      }
    } catch (error) {
      // 静默处理加载错误
      setItems([])
    }
    setLoading(false)
  }

  // 添加新行
  const handleAdd = () => {
    const newItem: SampleTestItemData = {
      key: `temp_${Date.now()}_${Math.random()}`,
      sampleName: '',
      batchNo: '',
      material: '',
      appearance: '',
      quantity: 1,
      testTemplateId: '',
      testItemName: '',
      testStandard: '',
      judgmentStandard: '',
    }
    const newItems = [...items, newItem]
    setItems(newItems)
    onChange?.(newItems)
  }

  // 删除行
  const handleDelete = (key: string) => {
    const newItems = items.filter((item) => item.key !== key)
    setItems(newItems)
    onChange?.(newItems)
  }

  // 更新单元格
  const handleCellChange = useCallback((key: string, field: keyof SampleTestItemData, value: any) => {
    setItems((prevItems) => {
      const newItems = prevItems.map((item) => {
        if (item.key === key) {
          const updated = { ...item, [field]: value }

          // 如果选择了检测项目，自动填充检测标准
          if (field === 'testTemplateId' && value) {
            const template = testTemplates.find((t) => t.id === value)
            if (template) {
              updated.testItemName = template.name
              updated.testStandard = template.method
            }
          }

          return updated
        }
        return item
      })
      onChange?.(newItems)
      return newItems
    })
  }, [testTemplates, onChange])

  // 表格列定义
  const columns: ColumnsType<SampleTestItemData> = [
    {
      title: '序号',
      width: 60,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: <span><span style={{ color: 'red' }}>*</span> 样品名称</span>,
      dataIndex: 'sampleName',
      width: 150,
      render: (text, record) =>
        readonly ? (
          text
        ) : (
          <Input
            value={text}
            placeholder="请输入"
            onChange={(e) => handleCellChange(record.key, 'sampleName', e.target.value)}
          />
        ),
    },
    {
      title: '生产批次号',
      dataIndex: 'batchNo',
      width: 120,
      render: (text, record) =>
        readonly ? (
          text
        ) : (
          <Input
            value={text}
            placeholder="请输入"
            onChange={(e) => handleCellChange(record.key, 'batchNo', e.target.value)}
          />
        ),
    },
    {
      title: '材质/牌号',
      dataIndex: 'material',
      width: 120,
      render: (text, record) =>
        readonly ? (
          text
        ) : (
          <Input
            value={text}
            placeholder="请输入"
            onChange={(e) => handleCellChange(record.key, 'material', e.target.value)}
          />
        ),
    },
    {
      title: '样品外观',
      dataIndex: 'appearance',
      width: 120,
      render: (text, record) =>
        readonly ? (
          text
        ) : (
          <Input
            value={text}
            placeholder="请输入"
            onChange={(e) => handleCellChange(record.key, 'appearance', e.target.value)}
          />
        ),
    },
    {
      title: <span><span style={{ color: 'red' }}>*</span> 检测项目</span>,
      dataIndex: 'testTemplateId',
      width: 180,
      render: (value, record) =>
        readonly ? (
          record.testItemName
        ) : (
          <Select
            value={value || undefined}
            placeholder="请选择"
            style={{ width: '100%' }}
            showSearch
            optionFilterProp="label"
            onChange={(val) => handleCellChange(record.key, 'testTemplateId', val)}
            options={testTemplates.map((t) => ({
              value: t.id,
              label: t.name,
            }))}
          />
        ),
    },
    {
      title: '检测标准',
      dataIndex: 'testStandard',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: '评判标准',
      dataIndex: 'judgmentStandard',
      width: 150,
      render: (text, record) =>
        readonly ? (
          text || '-'
        ) : (
          <Input
            value={text}
            placeholder="请输入"
            onChange={(e) => handleCellChange(record.key, 'judgmentStandard', e.target.value)}
          />
        ),
    },
    {
      title: <span><span style={{ color: 'red' }}>*</span> 样品数量</span>,
      dataIndex: 'quantity',
      width: 100,
      render: (value, record) =>
        readonly ? (
          value
        ) : (
          <InputNumber
            value={value}
            min={1}
            style={{ width: '100%' }}
            onChange={(val) => handleCellChange(record.key, 'quantity', val || 1)}
          />
        ),
    },
  ]

  // 非只读模式添加操作列
  if (!readonly) {
    columns.push({
      title: '操作',
      width: 60,
      align: 'center',
      render: (_, record) => (
        <Popconfirm
          title="确认删除"
          description="确定要删除这一行吗？"
          onConfirm={() => handleDelete(record.key)}
          okText="确认"
          cancelText="取消"
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 500 }}>样品检测项</span>
        {!readonly && (
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd}>
            添加行
          </Button>
        )}
      </div>
      <Table
        rowKey="key"
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: 1200 }}
        bordered
      />
    </div>
  )
}
