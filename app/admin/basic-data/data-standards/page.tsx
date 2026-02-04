/**
 * @file page.tsx
 * @desc 数据标准管理页面
 */
'use client'

import { useState } from 'react'
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Card,
  Statistic,
  Row,
  Col,
  Modal,
  Form,
  message,
  Descriptions,
  Alert,
  List,
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { mockDataStandards } from '@/data/basic-data-mock'
import {
  DataStandard,
  dataStandardTypeMap,
  standardStatusMap,
  DataStandardType,
  StandardStatus,
} from '@/lib/basic-data-types'

const { Search } = Input
const { Option } = Select
const { TextArea } = Input

export default function DataStandardPage() {
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [dataSource, setDataSource] = useState<DataStandard[]>(mockDataStandards)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<DataStandard | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<DataStandard | null>(null)
  const [form] = Form.useForm()

  // 筛选数据
  const filteredData = dataSource.filter((item) => {
    const matchText =
      item.standardCode.toLowerCase().includes(searchText.toLowerCase()) ||
      item.standardName.includes(searchText) ||
      item.description.includes(searchText)
    const matchType = !typeFilter || item.type === typeFilter
    const matchStatus = !statusFilter || item.status === statusFilter
    return matchText && matchType && matchStatus
  })

  // 统计数据
  const stats = {
    total: dataSource.length,
    published: dataSource.filter((d) => d.status === 'published').length,
    draft: dataSource.filter((d) => d.status === 'draft').length,
    code: dataSource.filter((d) => d.type === 'code').length,
    attribute: dataSource.filter((d) => d.type === 'attribute').length,
    validation: dataSource.filter((d) => d.type === 'validation').length,
    format: dataSource.filter((d) => d.type === 'format').length,
  }

  // 打开新增弹框
  const openAddModal = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({
      status: 'draft',
      version: 'v1.0',
    })
    setModalOpen(true)
  }

  // 打开编辑弹框
  const openEditModal = (record: DataStandard) => {
    setEditingRecord(record)
    form.setFieldsValue({
      standardCode: record.standardCode,
      standardName: record.standardName,
      type: record.type,
      category: record.category,
      version: record.version,
      status: record.status,
      description: record.description,
    })
    setModalOpen(true)
  }

  // 查看详情
  const viewDetail = (record: DataStandard) => {
    setSelectedRecord(record)
    setDetailModalOpen(true)
  }

  // 提交表单
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingRecord) {
        message.success(`标准 "${values.standardName}" 更新成功`)
        setDataSource(prev => prev.map(item =>
          item.id === editingRecord.id
            ? {
                ...item,
                ...values,
                updatedAt: new Date().toISOString(),
              }
            : item
        ))
      } else {
        const newRecord: DataStandard = {
          id: `STD${String(dataSource.length + 1).padStart(4, '0')}`,
          ...values,
          rules: [],
          applicableTo: [],
          createdBy: '管理员',
          effectiveDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        message.success(`标准 "${values.standardName}" 添加成功`)
        setDataSource(prev => [...prev, newRecord])
      }

      setModalOpen(false)
      form.resetFields()
      setEditingRecord(null)
    })
  }

  // 删除记录
  const handleDelete = (record: DataStandard) => {
    setDataSource(prev => prev.filter(item => item.id !== record.id))
    message.success(`标准 "${record.standardName}" 已删除`)
  }

  const columns = [
    {
      title: '标准编码',
      dataIndex: 'standardCode',
      key: 'standardCode',
      width: 150,
      render: (code: string) => (
        <span style={{ color: '#0097BA', fontWeight: 500 }}>{code}</span>
      ),
    },
    {
      title: '标准名称',
      dataIndex: 'standardName',
      key: 'standardName',
      width: 200,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: DataStandardType) => (
        <Tag color={dataStandardTypeMap[type].color}>
          {dataStandardTypeMap[type].label}
        </Tag>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      render: (version: string) => (
        <Tag color="blue">{version}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: StandardStatus) => {
        const config = standardStatusMap[status]
        return (
          <Tag
            color={config.color}
            icon={status === 'published' ? <CheckCircleOutlined /> :
                  status === 'draft' ? <EditOutlined /> :
                  <CloseCircleOutlined />}
          >
            {config.label}
          </Tag>
        )
      },
    },
    {
      title: '规则数量',
      dataIndex: 'rules',
      key: 'rules',
      width: 100,
      render: (rules: any[]) => (
        <Tag color="default">{rules.length} 条</Tag>
      ),
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      width: 120,
      render: (date: string) => date,
    },
    {
      title: '创建人',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: DataStandard) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => viewDetail(record)}>
            详情
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#00405C', marginBottom: 16 }}>
          数据标准管理
        </h2>
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="标准总数"
                value={stats.total}
                suffix="个"
                prefix={<BookOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已发布"
                value={stats.published}
                suffix="个"
                valueStyle={{ color: '#2BA471' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="草稿"
                value={stats.draft}
                suffix="个"
                valueStyle={{ color: '#E37318' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="发布率"
                value={stats.total > 0 ? ((stats.published / stats.total) * 100).toFixed(0) : 0}
                suffix="%"
                valueStyle={{ color: '#0097BA' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card
        title="标准分类统计"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="编码规则"
                value={stats.code}
                suffix="个"
                valueStyle={{ color: '#1890ff', fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="属性标准"
                value={stats.attribute}
                suffix="个"
                valueStyle={{ color: '#52c41a', fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="验证规则"
                value={stats.validation}
                suffix="个"
                valueStyle={{ color: '#faad14', fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="格式标准"
                value={stats.format}
                suffix="个"
                valueStyle={{ color: '#722ed1', fontSize: 20 }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <Search
            placeholder="搜索标准编码/名称/描述"
            allowClear
            style={{ width: 300 }}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="筛选类型"
            allowClear
            style={{ width: 150 }}
            onChange={setTypeFilter}
          >
            <Option value="code">编码规则</Option>
            <Option value="attribute">属性标准</Option>
            <Option value="validation">验证规则</Option>
            <Option value="format">格式标准</Option>
          </Select>
          <Select
            placeholder="筛选状态"
            allowClear
            style={{ width: 120 }}
            onChange={setStatusFilter}
          >
            <Option value="published">已发布</Option>
            <Option value="draft">草稿</Option>
            <Option value="deprecated">已废弃</Option>
          </Select>
          <div style={{ flex: 1 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            新增标准
          </Button>
        </div>
        <Table
          rowKey="id"
          dataSource={filteredData}
          columns={columns}
          scroll={{ x: 1600 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 新增/编辑标准弹窗 */}
      <Modal
        title={editingRecord ? '编辑数据标准' : '新增数据标准'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
          setEditingRecord(null)
        }}
        width={700}
        okText="提交"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="standardCode"
                label="标准编码"
                rules={[{ required: true, message: '请输入标准编码' }]}
              >
                <Input placeholder="EQ-CODE-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="standardName"
                label="标准名称"
                rules={[{ required: true, message: '请输入标准名称' }]}
              >
                <Input placeholder="请输入标准名称" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="标准类型"
                rules={[{ required: true, message: '请选择标准类型' }]}
              >
                <Select placeholder="请选择标准类型">
                  <Option value="code">编码规则</Option>
                  <Option value="attribute">属性标准</Option>
                  <Option value="validation">验证规则</Option>
                  <Option value="format">格式标准</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="标准分类"
                rules={[{ required: true, message: '请输入标准分类' }]}
              >
                <Input placeholder="如: 基础数据" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="version"
                label="版本号"
                rules={[{ required: true, message: '请输入版本号' }]}
              >
                <Input placeholder="v1.0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  <Option value="draft">草稿</Option>
                  <Option value="published">已发布</Option>
                  <Option value="deprecated">已废弃</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="effectiveDate"
            label="生效日期"
            rules={[{ required: true, message: '请选择生效日期' }]}
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item name="description" label="标准描述">
            <TextArea rows={4} placeholder="请输入标准描述" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 标准详情弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOutlined />
            <span>数据标准详情</span>
          </div>
        }
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false)
          setSelectedRecord(null)
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            关闭
          </Button>,
        ]}
        width={900}
      >
        {selectedRecord && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="标准编码">{selectedRecord.standardCode}</Descriptions.Item>
                <Descriptions.Item label="标准名称">{selectedRecord.standardName}</Descriptions.Item>
                <Descriptions.Item label="标准类型">
                  <Tag color={dataStandardTypeMap[selectedRecord.type].color}>
                    {dataStandardTypeMap[selectedRecord.type].label}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="标准分类">{selectedRecord.category}</Descriptions.Item>
                <Descriptions.Item label="版本">
                  <Tag color="blue">{selectedRecord.version}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={standardStatusMap[selectedRecord.status].color}>
                    {standardStatusMap[selectedRecord.status].label}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="生效日期">{selectedRecord.effectiveDate}</Descriptions.Item>
                <Descriptions.Item label="失效日期">
                  {selectedRecord.expiryDate || '无'}
                </Descriptions.Item>
                <Descriptions.Item label="创建人">{selectedRecord.createdBy}</Descriptions.Item>
                <Descriptions.Item label="批准人">
                  {selectedRecord.approvedBy || '待批准'}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {new Date(selectedRecord.createdAt).toLocaleString('zh-CN')}
                </Descriptions.Item>
                <Descriptions.Item label="更新时间">
                  {new Date(selectedRecord.updatedAt).toLocaleString('zh-CN')}
                </Descriptions.Item>
                <Descriptions.Item label="标准描述" span={2}>
                  {selectedRecord.description}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card size="small" title="规则定义">
              {selectedRecord.rules.length > 0 ? (
                <List
                  size="small"
                  dataSource={selectedRecord.rules}
                  renderItem={(rule, index) => (
                    <List.Item>
                      <Card size="small" style={{ width: '100%' }}>
                        <Row gutter={16}>
                          <Col span={6}>
                            <strong>字段名：</strong>
                            <Tag color="blue">{rule.fieldName}</Tag>
                          </Col>
                          <Col span={4}>
                            <strong>数据类型：</strong>
                            <Tag>{rule.dataType}</Tag>
                          </Col>
                          <Col span={2}>
                            <strong>必填：</strong>
                            <Tag color={rule.required ? 'red' : 'default'}>
                              {rule.required ? '是' : '否'}
                            </Tag>
                          </Col>
                          <Col span={12}>
                            {rule.pattern && (
                              <div>
                                <strong>正则表达式：</strong>
                                <code style={{ fontSize: 11 }}>{rule.pattern}</code>
                              </div>
                            )}
                            {rule.enumValues && (
                              <div>
                                <strong>枚举值：</strong>
                                {rule.enumValues.join(', ')}
                              </div>
                            )}
                            {rule.defaultValue !== undefined && (
                              <div>
                                <strong>默认值：</strong>
                                {String(rule.defaultValue)}
                              </div>
                            )}
                          </Col>
                        </Row>
                      </Card>
                    </List.Item>
                  )}
                />
              ) : (
                <Alert message="暂无规则定义" type="info" showIcon />
              )}
            </Card>

            {selectedRecord.applicableTo.length > 0 && (
              <Card size="small" title="适用范围" style={{ marginTop: 16 }}>
                <Space wrap>
                  {selectedRecord.applicableTo.map(item => (
                    <Tag key={item} color="geekblue">
                      {item}
                    </Tag>
                  ))}
                </Space>
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
