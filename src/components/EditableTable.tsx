'use client'

import { useState, useCallback } from 'react'
import { Table, Form, Input, Button, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

interface EditableTableProps {
  dataSource?: any[][]
  columnsCount?: number
  rowCount?: number
  onChange?: (data: any[][]) => void
  readonly?: boolean
}

/**
 * EditableTable - 基于 Ant Design Table 的可编辑表格
 *
 * 简单、稳定、可控，替代 Fortune-sheet
 */
export default function EditableTable({
  dataSource = [],
  columnsCount = 6,
  rowCount = 30,
  onChange,
  readonly = false
}: EditableTableProps) {
  const [data, setData] = useState<any[][]>(
    dataSource.length > 0 ? dataSource : Array(rowCount).fill([]).map(() => Array(columnsCount).fill(''))
  )

  // 生成列定义
  const columns = Array.from({ length: columnsCount }, (_, colIndex) => ({
    title: `列 ${colIndex + 1}`,
    dataIndex: colIndex,
    width: 150,
    render: (text: string, record: any, rowIndex: number) => (
      <Form.Item
        name={[rowIndex, colIndex]}
        style={{ margin: 0 }}
        initialValue={text || ''}
      >
        {readonly ? (
          <div style={{ padding: '4px 0' }}>{text || ''}</div>
        ) : (
          <Input
            value={text}
            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
            placeholder="输入内容"
          />
        )}
      </Form.Item>
    )
  }))

  // 处理单元格变化
  const handleCellChange = useCallback((rowIndex: number, colIndex: number, value: string) => {
    const newData = [...data]
    if (!newData[rowIndex]) {
      newData[rowIndex] = Array(columnsCount).fill('')
    }
    newData[rowIndex][colIndex] = value
    setData(newData)
    onChange?.(newData)
  }, [data, columnsCount, onChange])

  // 添加行
  const handleAddRow = () => {
    const newData = [...data, Array(columnsCount).fill('')]
    setData(newData)
    onChange?.(newData)
  }

  return (
    <div className="border border-gray-200 rounded">
      <Form component={false}>
        <Table
          columns={columns}
          dataSource={data.map((row, index) => ({ ...row, key: index }))}
          pagination={false}
          scroll={{ y: 600 }}
          size="small"
          bordered
        />
      </Form>

      {!readonly && (
        <div className="p-2 border-t border-gray-200">
          <Space>
            <Button
              type="dashed"
              onClick={handleAddRow}
              icon={<PlusOutlined />}
              size="small"
            >
              添加行
            </Button>
            <span className="text-gray-400 text-sm">
              当前 {data.length} 行
            </span>
          </Space>
        </div>
      )}
    </div>
  )
}

/**
 * 转换二维数组为 JSON Schema 格式
 */
export function convertToSchema(data: any[][]) {
  if (!data || data.length === 0) {
    return { title: '未命名模板', header: { sampleType: '' }, rows: [] }
  }

  const headers = data[0] || []
  const rows = data.slice(1).filter(row => row && row.some(cell => cell))

  return {
    title: headers[0] || '未命名模板',
    titleType: headers[1] || 'string',
    columnsCount: headers.length,
    header: {
      sampleType: headers[2] || ''
    },
    rows: rows.map(row => ({
      values: row
    }))
  }
}

/**
 * 转换 JSON Schema 为二维数组
 */
export function convertFromSchema(schema: any): any[][] {
  if (!schema || !schema.rows) {
    return [['检测项目', '检测方法', '技术要求', '实测值', '单项判定', '备注']]
  }

  const headers = [
    schema.title || '检测项目',
    schema.titleType || 'string',
    schema.header?.sampleType || '',
    ...Array(schema.columnsCount ? schema.columnsCount - 3 : 3).fill('')
  ]

  return [
    headers,
    ...schema.rows.map((row: any) => row.values || Array(headers.length).fill(''))
  ]
}

/**
 * 获取默认数据
 */
export function getDefaultData() {
  return [
    ['检测项目', '检测方法', '技术要求', '实测值', '单项判定', '备注']
  ]
}
