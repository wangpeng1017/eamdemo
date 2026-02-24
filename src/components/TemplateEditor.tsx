import { useState, useEffect, useMemo, useRef } from 'react'
import { showSuccess, showError, showWarningMessage } from '@/lib/confirm'
import { Button, Card, Form, Input, Switch, InputNumber, Space, Modal, Dropdown, Menu, Select, Tag, Tooltip } from 'antd'
import { PlusOutlined, DeleteOutlined, SettingOutlined, HolderOutlined, ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons'
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
  const defaultSchema = getDefaultSchema()
  const [schema, setSchema] = useState<TemplateSchema>(() => {
    if (!initialValue) return defaultSchema
    return {
      ...defaultSchema,
      ...initialValue,
      columns: initialValue.columns || defaultSchema.columns,
      header: initialValue.header || {},
      statistics: initialValue.statistics || [],
    }
  })
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null)
  const [showColumnModal, setShowColumnModal] = useState(false)
  const [inspectionStandards, setInspectionStandards] = useState<InspectionStandard[]>([])

  // 加载检测标准数据
  useEffect(() => {
    fetch('/api/inspection-standard?pageSize=1000')
      .then(res => res.json())
      .then(data => {
        setInspectionStandards(data.list || [])
      })
      .catch(() => {
        showError('加载检测标准失败')
      })
  }, [])

  // 用于输入框的组件级防抖
  const [localTitle, setLocalTitle] = useState(schema.title);
  const [localSampleType, setLocalSampleType] = useState(schema.header?.sampleType || '');

  useEffect(() => {
    setLocalTitle(schema.title);
    setLocalSampleType(schema.header?.sampleType || '');
  }, [schema.title, schema.header?.sampleType])

  useEffect(() => {
    if (localTitle === schema.title) return;
    const timer = setTimeout(() => {
      updateSchema({ title: localTitle });
    }, 500);
    return () => clearTimeout(timer);
  }, [localTitle])

  useEffect(() => {
    if (localSampleType === (schema.header?.sampleType || '')) return;
    const timer = setTimeout(() => {
      updateSchema({
        header: { ...(schema.header || {}), sampleType: localSampleType }
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [localSampleType])

  useEffect(() => {
    form.setFieldsValue({
      name: schema.title,
      sampleType: schema.header?.sampleType,
      defaultRows: schema.defaultRows
    })
  }, [schema, form])

  const handleSave = async () => {
    try {
      if (!schema.title || schema.title.trim() === '') {
        showError('请输入模版名称')
        return
      }
      if (schema.columns.length === 0) {
        showError('请至少添加一列')
        return
      }
      await onSave(schema)
    } catch (e) {
      console.error("[TemplateEditor] Save Error:", e);
      showError('保存失败: ' + (e as Error).message);
    }
  }

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

  const isUpdatingSchemaRef = useRef(false);

  const updateSchema = (updates: Partial<TemplateSchema>) => {
    isUpdatingSchemaRef.current = true;
    setSchema(prev => {
      const next = { ...prev, ...updates };
      if (typeof next.title !== 'string') next.title = String(next.title || '');
      return next;
    });
    setTimeout(() => {
      isUpdatingSchemaRef.current = false;
    }, 300);
  }

  const updateColumn = (index: number, column: ColumnConfig) => {
    const newColumns = [...schema.columns]
    newColumns[index] = column
    updateSchema({ columns: newColumns })
  }

  // 添加列
  const addColumn = () => {
    const newColumn: ColumnConfig = {
      title: '新列',
      dataIndex: `column${Date.now()}`,
      width: 120,
      dataType: 'string'
    }
    updateSchema({ columns: [...schema.columns, newColumn] })
    setSelectedColumn(schema.columns.length)
    showSuccess('列已添加')
  }

  // 删除列
  const deleteColumn = (index: number) => {
    if (schema.columns.length <= 1) {
      showWarningMessage('至少保留一列')
      return
    }
    const newColumns = schema.columns.filter((_, idx) => idx !== index)
    updateSchema({ columns: newColumns })
    if (selectedColumn === index) setSelectedColumn(null)
    else if (selectedColumn !== null && selectedColumn > index) setSelectedColumn(selectedColumn - 1)
    showSuccess('列已删除')
  }

  // 移动列
  const moveColumn = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= schema.columns.length) return
    const newColumns = [...schema.columns]
      ;[newColumns[index], newColumns[targetIdx]] = [newColumns[targetIdx], newColumns[index]]
    updateSchema({ columns: newColumns })
    setSelectedColumn(targetIdx)
  }

  // 统计相关
  const addStatistic = (type: 'avg' | 'std' | 'cv') => {
    if (selectedColumn === null) {
      showWarningMessage('请先选择一列')
      return
    }
    const column = schema.columns[selectedColumn]
    const labels: Record<string, string> = { avg: '平均值', std: '标准差', cv: '离散系数' }
    const existing = schema.statistics.findIndex(s => s.column === column.dataIndex)
    if (existing >= 0) {
      showWarningMessage('该列已添加统计')
      return
    }
    updateSchema({
      statistics: [...schema.statistics, { type, column: column.dataIndex, label: `${labels[type]} (${column.title})` }]
    })
    showSuccess(`已添加${labels[type]}统计`)
  }

  const removeStatistic = (index: number) => {
    const newStatistics = schema.statistics.filter((_, idx) => idx !== index)
    updateSchema({ statistics: newStatistics })
    showSuccess('统计已删除')
  }

  // 数据类型标签颜色
  const typeColors: Record<string, string> = {
    string: 'blue', number: 'green', formula: 'orange', select: 'purple'
  }
  const typeLabels: Record<string, string> = {
    string: '文本', number: '数字', formula: '公式', select: '选择'
  }

  return (
    <div className="flex flex-col h-[700px] gap-4">
      {/* 左右分栏布局 */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* 左侧：可视化表格列编辑器 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Card
            title={
              <div className="flex items-center gap-3">
                <span>📊 模板列结构</span>
                <Tag color="blue">{schema.columns.length} 列</Tag>
              </div>
            }
            extra={
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={addColumn}>
                添加列
              </Button>
            }
            className="flex-1 overflow-hidden"
            bodyStyle={{ padding: 0, height: '100%', overflow: 'auto' }}
          >
            {/* 可视化表格预览 */}
            <div className="p-4">
              {/* 表格表头预览 */}
              <div className="border rounded-lg overflow-hidden mb-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-50">
                      {schema.columns.map((col, idx) => (
                        <th
                          key={col.dataIndex}
                          className={`border border-blue-200 px-3 py-2 text-sm font-medium text-center cursor-pointer transition-colors ${selectedColumn === idx
                            ? 'bg-blue-500 text-white'
                            : 'text-blue-700 hover:bg-blue-100'
                            }`}
                          style={{ minWidth: Math.max(col.width || 100, 80) }}
                          onClick={() => setSelectedColumn(idx)}
                        >
                          {col.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* 示例数据行 */}
                    {[1, 2, 3].map(row => (
                      <tr key={row} className="hover:bg-gray-50">
                        {schema.columns.map((col, idx) => (
                          <td
                            key={col.dataIndex}
                            className={`border border-gray-200 px-3 py-2 text-sm text-center text-gray-400 ${selectedColumn === idx ? 'bg-blue-50' : ''
                              }`}
                          >
                            {col.dataType === 'number' ? '0.00' : col.dataType === 'formula' ? 'fx' : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 选中列的详细编辑区域 */}
              {selectedColumn !== null && schema.columns[selectedColumn] && (
                <Card
                  size="small"
                  title={
                    <span>
                      编辑列：<Tag color="blue">{schema.columns[selectedColumn].title}</Tag>
                    </span>
                  }
                  extra={
                    <Space size="small">
                      <Tooltip title="左移">
                        <Button
                          size="small"
                          icon={<ArrowLeftOutlined />}
                          disabled={selectedColumn === 0}
                          onClick={() => moveColumn(selectedColumn, 'left')}
                        />
                      </Tooltip>
                      <Tooltip title="右移">
                        <Button
                          size="small"
                          icon={<ArrowRightOutlined />}
                          disabled={selectedColumn === schema.columns.length - 1}
                          onClick={() => moveColumn(selectedColumn, 'right')}
                        />
                      </Tooltip>
                      <Tooltip title="列属性">
                        <Button
                          size="small"
                          icon={<SettingOutlined />}
                          onClick={() => setShowColumnModal(true)}
                        />
                      </Tooltip>
                      <Tooltip title="删除列">
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => deleteColumn(selectedColumn)}
                        />
                      </Tooltip>
                    </Space>
                  }
                  className="mb-4"
                >
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">列标题</label>
                      <Input
                        size="small"
                        value={schema.columns[selectedColumn].title}
                        onChange={e => {
                          const col = { ...schema.columns[selectedColumn], title: e.target.value }
                          updateColumn(selectedColumn, col)
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">数据标识</label>
                      <Input
                        size="small"
                        value={schema.columns[selectedColumn].dataIndex}
                        onChange={e => {
                          const col = { ...schema.columns[selectedColumn], dataIndex: e.target.value }
                          updateColumn(selectedColumn, col)
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">列宽度</label>
                      <InputNumber
                        size="small"
                        min={60}
                        max={500}
                        value={schema.columns[selectedColumn].width}
                        onChange={val => {
                          const col = { ...schema.columns[selectedColumn], width: val || 120 }
                          updateColumn(selectedColumn, col)
                        }}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-xs text-gray-500 mb-1 block">数据类型</label>
                    <Select
                      size="small"
                      value={schema.columns[selectedColumn].dataType}
                      onChange={val => {
                        const col = { ...schema.columns[selectedColumn], dataType: val }
                        updateColumn(selectedColumn, col)
                      }}
                      style={{ width: 200 }}
                      options={[
                        { value: 'string', label: '文本' },
                        { value: 'number', label: '数字' },
                        { value: 'formula', label: '公式' },
                        { value: 'select', label: '下拉选择' },
                      ]}
                    />
                  </div>
                </Card>
              )}

              {selectedColumn === null && (
                <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  👆 点击上方表头列可选中并编辑
                </div>
              )}

              {/* 列概览列表 */}
              <div className="mt-4">
                <div className="text-sm font-medium text-gray-600 mb-2">全部列 ({schema.columns.length})</div>
                <div className="grid grid-cols-2 gap-2">
                  {schema.columns.map((col, idx) => (
                    <div
                      key={col.dataIndex}
                      className={`flex items-center justify-between px-3 py-2 rounded border cursor-pointer transition-all ${selectedColumn === idx
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      onClick={() => setSelectedColumn(idx)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5">{idx + 1}</span>
                        <span className="text-sm font-medium">{col.title}</span>
                      </div>
                      <Tag color={typeColors[col.dataType || 'string']} className="text-xs">
                        {typeLabels[col.dataType || 'string']}
                      </Tag>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 右侧：基础配置面板 */}
        <div className="w-80 overflow-y-auto">
          <Card title="基础配置" size="small">
            <Form form={form} layout="vertical" size="small">
              <Form.Item label="模版名称" rules={[{ required: true, message: '此项为必填' }]}>
                <Select
                  showSearch
                  placeholder="请选择检测标准作为模版"
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  value={localTitle || undefined}
                  options={inspectionStandards.map(std => ({
                    value: std.name,
                    label: `${std.name}（${std.standardNo}）`
                  }))}
                  onChange={(value) => {
                    // 选中标准后：名称设为标准名，自动带出标准号
                    setLocalTitle(value)
                    // 收集该名称下所有标准号
                    const matched = inspectionStandards.filter(s => s.name === value)
                    const stdNos = matched.map(s => s.standardNo).join('、')
                    updateSchema({
                      title: value,
                      header: { ...(schema.header || {}), methodBasis: stdNos }
                    })
                  }}
                />
              </Form.Item>

              <Form.Item label="检测标准">
                {schema.header?.methodBasis ? (
                  <div className="flex flex-wrap gap-1">
                    {schema.header.methodBasis.split('、').map((std, i) => (
                      <Tag key={i} color="blue">{std}</Tag>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">选择模版名称后自动带出</span>
                )}
              </Form.Item>

              <Form.Item label="样品类型" name="sampleType">
                <Input
                  placeholder="如: 定向纤维增强聚合物基复合材料"
                  value={localSampleType}
                  onChange={(e) => setLocalSampleType(e.target.value)}
                />
              </Form.Item>

              {/* 表格设置 */}
              <Card size="small" title="表格设置" style={{ marginBottom: 12 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <div className="flex items-center justify-between">
                    <span>环境条件行</span>
                    <Switch size="small" checked={schema.environment} onChange={(c) => updateSchema({ environment: c })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>设备信息行</span>
                    <Switch size="small" checked={schema.equipment} onChange={(c) => updateSchema({ equipment: c })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>人员信息行</span>
                    <Switch size="small" checked={schema.personnel} onChange={(c) => updateSchema({ personnel: c })} />
                  </div>
                  <Form.Item label="默认数据行数" style={{ marginBottom: 0 }}>
                    <InputNumber
                      min={1} max={100}
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
                extra={
                  <Dropdown
                    overlay={
                      <Menu onClick={({ key }) => addStatistic(key as any)}>
                        <Menu.Item key="avg">平均值</Menu.Item>
                        <Menu.Item key="std">标准差</Menu.Item>
                        <Menu.Item key="cv">离散系数</Menu.Item>
                      </Menu>
                    }
                    trigger={['click']}
                  >
                    <Button size="small" icon={<PlusOutlined />}>添加</Button>
                  </Dropdown>
                }
              >
                {schema.statistics.length === 0 ? (
                  <div className="text-gray-400 text-xs py-1">暂无统计配置</div>
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size={4}>
                    {schema.statistics.map((stat, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-xs">
                        <span>{stat.label}</span>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeStatistic(idx)} />
                      </div>
                    ))}
                  </Space>
                )}
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
