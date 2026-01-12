
'use client'

import { Form, Input, Select, InputNumber, Switch, Space } from 'antd'
import { useEffect } from 'react'
import type { ColumnConfig } from '@/lib/template-converter'

interface ColumnPropertyFormProps {
  column: ColumnConfig
  onChange: (column: ColumnConfig) => void
}

export default function ColumnPropertyForm({ column, onChange }: ColumnPropertyFormProps) {
  const [form] = Form.useForm()

  useEffect(() => {
    form.setFieldsValue(column)
  }, [column, form])

  const handleValuesChange = (_: any, allValues: ColumnConfig) => {
    onChange(allValues)
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onValuesChange={handleValuesChange}
    >
      <Form.Item
        label="列标题"
        name="title"
        rules={[{ required: true, message: '请输入列标题' }]}
      >
        <Input placeholder="如: 拉伸强度" />
      </Form.Item>

      <Form.Item
        label="数据字段"
        name="dataIndex"
        rules={[{ required: true, message: '请输入数据字段名' }]}
        extra="用于数据存储和引用的字段名，建议使用英文"
      >
        <Input placeholder="如: tensileStrength" />
      </Form.Item>

      <Form.Item label="列宽" name="width">
        <InputNumber min={50} max={500} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item label="数据类型" name="dataType">
        <Select>
          <Select.Option value="string">文本</Select.Option>
          <Select.Option value="number">数字</Select.Option>
          <Select.Option value="date">日期</Select.Option>
          <Select.Option value="select">下拉选择</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prev, curr) => prev.dataType !== curr.dataType}
      >
        {({ getFieldValue }) =>
          getFieldValue('dataType') === 'select' && (
            <Form.Item
              label="选项"
              name="options"
              extra="每行一个选项"
            >
              <Input.TextArea
                rows={4}
                placeholder="选项1&#10;选项2&#10;选项3"
              />
            </Form.Item>
          )
        }
      </Form.Item>

      <Form.Item
        label="必填"
        name="required"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>

      {/* 数字类型验证 */}
      <Form.Item
        noStyle
        shouldUpdate={(prev, curr) => prev.dataType !== curr.dataType}
      >
        {({ getFieldValue }) =>
          getFieldValue('dataType') === 'number' && (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item
                label={`最小值${column.required ? ' (必填)' : ''}`}
                name={['validation', 'min']}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="不限制则留空"
                />
              </Form.Item>
              <Form.Item
                label={`最大值${column.required ? ' (必填)' : ''}`}
                name={['validation', 'max']}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="不限制则留空"
                />
              </Form.Item>
            </Space>
          )
        }
      </Form.Item>

      {/* 文本类型验证 */}
      <Form.Item
        noStyle
        shouldUpdate={(prev, curr) => prev.dataType !== curr.dataType}
      >
        {({ getFieldValue }) =>
          getFieldValue('dataType') === 'string' && (
            <Form.Item
              label="验证规则"
              name={['validation', 'pattern']}
              extra="正则表达式，如：^[0-9]+$"
            >
              <Input placeholder="留空则不验证" />
            </Form.Item>
          )
        }
      </Form.Item>
    </Form>
  )
}
