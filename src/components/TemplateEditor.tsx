import { useState, useEffect, useMemo } from 'react'
import { Button, Card, Form, Input, Switch, InputNumber, Space, message, Modal, Dropdown, Menu, Select } from 'antd'
import { PlusOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons'
import DataSheet from './DataSheet'
import ColumnPropertyForm from './ColumnPropertyForm'
import {
  TemplateSchema,
  ColumnConfig,
  StatisticsConfig,
  convertSchemaToPreviewData,
  getDefaultSchema
} from '@/lib/template-converter'

interface TemplateEditorProps {
  initialValue?: TemplateSchema
  onSave: (schema: TemplateSchema) => Promise<void>
  onCancel: () => void
}

interface InspectionStandard {
  id: string
  standardNo: string
  name: string
  validity: string
}

export default function TemplateEditor({ initialValue, onSave, onCancel }: TemplateEditorProps) {
  const [form] = Form.useForm()
  const [sheetData, setSheetData] = useState<any[]>([])
  const [schema, setSchema] = useState<TemplateSchema>(initialValue || getDefaultSchema())
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null)
  const [showColumnModal, setShowColumnModal] = useState(false)
  const [inspectionStandards, setInspectionStandards] = useState<InspectionStandard[]>([])

  // 加载检测标准数据
  useEffect(() => {
    fetch('/api/inspection-standard?pageSize=1000&validity=valid')
      .then(res => res.json())
      .then(data => {
        setInspectionStandards(data.list || [])
      })
      .catch(() => {
        message.error('加载检测标准失败')
      })
  }, [])

  // 初始化表格数据
  useEffect(() => {
    const data = convertSchemaToPreviewData(schema)
    setSheetData(data)
  }, [schema])

  // 初始化表单
  useEffect(() => {
    form.setFieldsValue({
      name: schema.title,
      method: schema.header.methodBasis,
      sampleType: schema.header.sampleType,
      defaultRows: schema.defaultRows
    })
  }, [schema, form])

  // 保存处理
  const handleSave = async () => {
    try {
      // 验证
      if (!schema.title || schema.title.trim() === '') {
        message.error('请输入模版名称')
        return
      }
      if (schema.columns.length === 0) {
        message.error('请至少添加一列')
        return
      }

      await onSave(schema)
    } catch (e) {
      message.error('保存失败')
    }
  }

  // 预览处理
  const handlePreview = () => {
    Modal.info({
      title: 'JSON 预览',
      width: 800,
      content: (
        <pre style={{
          background: '#f5f5f5',
          padding: 16,
          borderRadius: 4,
          maxHeight: 500,
          overflow: 'auto'
        }}>
          {JSON.stringify(schema, null, 2)}
        </pre>
      )
    })
  }

  // 更新 Schema
  const updateSchema = (updates: Partial<TemplateSchema>) => {
    setSchema(prev => ({ ...prev, ...updates }))
  }

  // 更新列
  const updateColumn = (index: number, column: ColumnConfig) => {
    const newColumns = [...schema.columns]
    newColumns[index] = column
    updateSchema({ columns: newColumns })
  }

  // ===== 右键菜单操作 =====

  // 插入列
  const insertColumn = (position: 'left' | 'right') => {
    const newColumn: ColumnConfig = {
      title: '新列',
      dataIndex: `column${Date.now()}`,
      width: 120,
      dataType: 'string'
    }

    const newColumns = [...schema.columns]
    if (selectedColumn !== null) {
      const idx = position === 'left' ? selectedColumn : selectedColumn + 1
      newColumns.splice(idx, 0, newColumn)
    } else {
      newColumns.push(newColumn)
    }

    updateSchema({ columns: newColumns })
    message.success('列已插入')
  }

  // 删除列
  const deleteColumn = () => {
    if (selectedColumn === null) return

    if (schema.columns.length <= 1) {
      message.warning('至少保留一列')
      return
    }

    const newColumns = schema.columns.filter((_, idx) => idx !== selectedColumn)
    updateSchema({ columns: newColumns })
    setSelectedColumn(null)
    message.success('列已删除')
  }

  // 添加统计列
  const addStatistic = (type: 'avg' | 'std' | 'cv') => {
    if (selectedColumn === null) {
      message.warning('请先选择一列')
      return
    }

    const column = schema.columns[selectedColumn]
    const labels: Record<string, string> = {
      avg: '平均值',
      std: '标准差',
      cv: '离散系数'
    }

    // 检查是否已存在
    const existing = schema.statistics.findIndex(s => s.column === column.dataIndex)
    if (existing >= 0) {
      message.warning('该列已添加统计')
      return
    }

    updateSchema({
      statistics: [
        ...schema.statistics,
        {
          type,
          column: column.dataIndex,
          label: `${labels[type]} (${column.title})`
        }
      ]
    })
    message.success(`已添加${labels[type]}统计`)
  }

  // 删除统计
  const removeStatistic = (index: number) => {
    const newStatistics = schema.statistics.filter((_, idx) => idx !== index)
    updateSchema({ statistics: newStatistics })
    message.success('统计已删除')
  }

  // 右键菜单
  const contextMenu = useMemo(() => (
    <Menu onClick={({ key }) => {
      const [action, ...params] = key.split('-')
      switch (action) {
        case 'insertColumnLeft':
          insertColumn('left')
          break
        case 'insertColumnRight':
          insertColumn('right')
          break
        case 'deleteColumn':
          deleteColumn()
          break
        case 'editColumn':
          setShowColumnModal(true)
          break
        case 'addStatistic':
          addStatistic(params[0] as any)
          break
        case 'removeStatistic':
          if (selectedColumn !== null) {
            const column = schema.columns[selectedColumn]
            const idx = schema.statistics.findIndex(s => s.column === column.dataIndex)
            if (idx >= 0) removeStatistic(idx)
          }
          break
      }
    }}>
      <Menu.Item key="insertColumnLeft">插入列（左侧）</Menu.Item>
      <Menu.Item key="insertColumnRight">插入列（右侧）</Menu.Item>
      <Menu.Item key="deleteColumn" danger>删除此列</Menu.Item>
      <Menu.Divider />
      <Menu.Item key="editColumn" icon={<SettingOutlined />}>设置列属性...</Menu.Item>
      <Menu.Divider />
      <Menu.Item key="addStatistic-avg">设为统计列: 平均值</Menu.Item>
      <Menu.Item key="addStatistic-std">设为统计列: 标准差</Menu.Item>
      <Menu.Item key="addStatistic-cv">设为统计列: 离散系数</Menu.Item>
      <Menu.Item key="removeStatistic">取消统计列</Menu.Item>
    </Menu>
  ), [selectedColumn, schema.columns, schema.statistics])

  return (
    <div className="flex flex-col h-[700px] gap-4">
      {/* 左右分栏布局 */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* 左侧：表格编辑区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Card title="表格预览" className="flex-1 overflow-hidden">
            <div className="h-full overflow-auto">
              <DataSheet
                data={sheetData}
                onChange={setSheetData}
                height={500}
              />
            </div>
          </Card>
        </div>

        {/* 右侧：属性配置面板 */}
        <div className="w-96 overflow-y-auto">
          <Card title="属性配置">
            <Form form={form} layout="vertical">
              {/* 基本信息 */}
              <Form.Item label="模版名称" name="name" rules={[{ required: true }]}>
                <Input
                  placeholder="如: 拉伸性能测试"
                  onChange={(e) => updateSchema({ title: e.target.value })}
                />
              </Form.Item>

              <Form.Item label="检测标准" name="method">
                <Select
                  placeholder="请选择检测标准"
                  showSearch
                  allowClear
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={inspectionStandards.map(std => ({
                    value: std.standardNo,
                    label: `${std.standardNo} - ${std.name}`
                  }))}
                  onChange={(value) => updateSchema({
                    header: { ...schema.header, methodBasis: value || '' }
                  })}
                />
              </Form.Item>

              <Form.Item label="样品类型" name="sampleType">
                <Input
                  placeholder="如: 定向纤维增强聚合物基复合材料"
                  onChange={(e) => updateSchema({
                    header: { ...schema.header, sampleType: e.target.value }
                  })}
                />
              </Form.Item>

              {/* 表格设置 */}
              <Card size="small" title="表格设置" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div className="flex items-center justify-between">
                    <span>包含环境条件行</span>
                    <Switch
                      checked={schema.environment}
                      onChange={(c) => updateSchema({ environment: c })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>包含设备信息行</span>
                    <Switch
                      checked={schema.equipment}
                      onChange={(c) => updateSchema({ equipment: c })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>包含人员信息行</span>
                    <Switch
                      checked={schema.personnel}
                      onChange={(c) => updateSchema({ personnel: c })}
                    />
                  </div>
                  <Form.Item label="默认数据行数" style={{ marginBottom: 0 }}>
                    <InputNumber
                      min={1}
                      max={100}
                      value={schema.defaultRows}
                      onChange={(val) => updateSchema({ defaultRows: val || 5 })}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Space>
              </Card>

              {/* 统计配置 */}
              <Card
                size="small"
                title="统计配置"
                extra={(
                  <Dropdown
                    overlay={(
                      <Menu onClick={({ key }) => {
                        addStatistic(key as any)
                      }}>
                        <Menu.Item key="avg">平均值</Menu.Item>
                        <Menu.Item key="std">标准差</Menu.Item>
                        <Menu.Item key="cv">离散系数</Menu.Item>
                      </Menu>
                    )}
                    trigger={['click']}
                  >
                    <Button size="small" icon={<PlusOutlined />}>添加</Button>
                  </Dropdown>
                )}
                style={{ marginBottom: 16 }}
              >
                {schema.statistics.length === 0 ? (
                  <div className="text-gray-400 text-sm py-2">
                    暂无统计配置
                  </div>
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    {schema.statistics.map((stat, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm">{stat.label}</span>
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeStatistic(idx)}
                        />
                      </div>
                    ))}
                  </Space>
                )}
              </Card>

              {/* 列管理 */}
              <Card
                size="small"
                title="列管理"
                extra={(
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => insertColumn('right')}
                  >
                    添加列
                  </Button>
                )}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {schema.columns.map((col, idx) => (
                    <div
                      key={col.dataIndex}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer border ${selectedColumn === idx ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      onClick={() => setSelectedColumn(idx)}
                    >
                      <span className="text-sm">{col.title}</span>
                      <Button
                        size="small"
                        type="text"
                        icon={<SettingOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedColumn(idx)
                          setShowColumnModal(true)
                        }}
                      />
                    </div>
                  ))}
                </Space>
              </Card>
            </Form>
          </Card>
        </div>
      </div>

      {/* 列属性配置弹窗 */}
      <Modal
        title="列属性配置"
        open={showColumnModal}
        onOk={() => setShowColumnModal(false)}
        onCancel={() => setShowColumnModal(false)}
        width={500}
      >
        {selectedColumn !== null && (
          <ColumnPropertyForm
            column={schema.columns[selectedColumn]}
            onChange={(col) => updateColumn(selectedColumn, col)}
          />
        )}
      </Modal>

      {/* 底部操作按钮 */}
      <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
        <Button onClick={onCancel}>取消</Button>
        <Button onClick={handlePreview}>预览 JSON</Button>
        <Button type="primary" onClick={handleSave}>保存</Button>
      </div>
    </div>
  )
}
