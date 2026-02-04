/**
 * @file page.tsx
 * @desc 主数据管理页面
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
  Popconfirm,
  Descriptions,
  Progress,
  Badge,
  Tabs,
  Alert,
} from 'antd'
import {
  SearchOutlined,
  SyncOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CloudSyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { mockMasterDataRecords, mockSyncLogs } from '@/data/basic-data-mock'
import {
  MasterDataRecord,
  masterDataStatusMap,
  dataSourceSystemMap,
  DataSourceSystem,
  MasterDataStatus,
  SyncLog,
} from '@/lib/basic-data-types'

const { Search } = Input
const { Option } = Select

export default function MasterDataPage() {
  const [searchText, setSearchText] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [dataSource, setDataSource] = useState<MasterDataRecord[]>(mockMasterDataRecords)
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(mockSyncLogs)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MasterDataRecord | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<MasterDataRecord | null>(null)
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('records')

  // 筛选数据
  const filteredData = dataSource.filter((item) => {
    const matchText =
      item.equipmentCode.toLowerCase().includes(searchText.toLowerCase()) ||
      item.equipmentName.includes(searchText) ||
      item.manufacturer.includes(searchText)
    const matchSource = !sourceFilter || item.sourceSystem === sourceFilter
    const matchStatus = !statusFilter || item.syncStatus === statusFilter
    return matchText && matchSource && matchStatus
  })

  // 统计数据
  const stats = {
    total: dataSource.length,
    active: dataSource.filter((d) => d.syncStatus === 'active').length,
    synced: dataSource.filter((d) => d.syncStatus === 'synced').length,
    pending: dataSource.filter((d) => d.syncStatus === 'pending_sync').length,
    failed: dataSource.filter((d) => d.syncStatus === 'sync_failed').length,
    avgQuality: parseFloat((dataSource.reduce((sum, item) => sum + item.dataQuality, 0) / dataSource.length).toFixed(1)),
  }

  // 打开新增弹框
  const openAddModal = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({
      sourceSystem: 'manual',
      syncStatus: 'active',
      dataQuality: 100,
    })
    setModalOpen(true)
  }

  // 打开编辑弹框
  const openEditModal = (record: MasterDataRecord) => {
    setEditingRecord(record)
    form.setFieldsValue({
      equipmentCode: record.equipmentCode,
      equipmentName: record.equipmentName,
      category: record.category,
      specification: record.specification,
      manufacturer: record.manufacturer,
      sourceSystem: record.sourceSystem,
      syncStatus: record.syncStatus,
      dataQuality: record.dataQuality,
    })
    setModalOpen(true)
  }

  // 查看详情
  const viewDetail = (record: MasterDataRecord) => {
    setSelectedRecord(record)
    setDetailModalOpen(true)
  }

  // 提交表单
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingRecord) {
        message.success(`主数据 "${values.equipmentName}" 更新成功`)
        setDataSource(prev => prev.map(item =>
          item.id === editingRecord.id
            ? {
                ...item,
                ...values,
                customFields: { ...item.customFields },
                updatedAt: new Date().toISOString(),
              }
            : item
        ))
      } else {
        const newRecord: MasterDataRecord = {
          id: `MD${String(dataSource.length + 1).padStart(4, '0')}`,
          equipmentCode: values.equipmentCode,
          equipmentName: values.equipmentName,
          category: values.category,
          specification: values.specification,
          manufacturer: values.manufacturer,
          technicalParams: {},
          sourceSystem: values.sourceSystem,
          sourceId: `${values.sourceSystem.toUpperCase()}-${Date.now()}`,
          syncStatus: values.syncStatus,
          lastSyncTime: null,
          dataQuality: values.dataQuality,
          validationErrors: [],
          customFields: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        message.success(`主数据 "${values.equipmentName}" 添加成功`)
        setDataSource(prev => [...prev, newRecord])
      }

      setModalOpen(false)
      form.resetFields()
      setEditingRecord(null)
    })
  }

  // 删除记录
  const handleDelete = (record: MasterDataRecord) => {
    setDataSource(prev => prev.filter(item => item.id !== record.id))
    message.success(`主数据 "${record.equipmentName}" 已删除`)
  }

  // 手动同步
  const handleSync = (record: MasterDataRecord) => {
    message.loading({ content: `正在同步 ${record.equipmentName}...`, key: 'sync' })
    setTimeout(() => {
      setDataSource(prev => prev.map(item =>
        item.id === record.id
          ? {
              ...item,
              syncStatus: 'synced',
              lastSyncTime: new Date().toISOString(),
              dataQuality: Math.floor(85 + Math.random() * 15),
            }
          : item
      ))
      message.success({ content: `${record.equipmentName} 同步成功`, key: 'sync', duration: 2 })
    }, 1500)
  }

  // 批量同步
  const handleBatchSync = () => {
    message.loading({ content: '正在批量同步主数据...', key: 'batchSync' })
    setTimeout(() => {
      setDataSource(prev => prev.map(item => ({
        ...item,
        syncStatus: 'synced' as MasterDataStatus,
        lastSyncTime: new Date().toISOString(),
        dataQuality: Math.floor(85 + Math.random() * 15),
      })))
      message.success({ content: '批量同步完成！', key: 'batchSync', duration: 2 })

      // 添加同步日志
      const newLog: SyncLog = {
        id: `SYNC${String(syncLogs.length + 1).padStart(4, '0')}`,
        sourceSystem: 'SAP',
        syncType: 'full',
        startTime: new Date(Date.now() - 30000).toISOString(),
        endTime: new Date().toISOString(),
        status: 'success',
        totalRecords: dataSource.length,
        successRecords: dataSource.length,
        failedRecords: 0,
        errors: [],
        triggeredBy: '管理员',
        createdAt: new Date().toISOString(),
      }
      setSyncLogs(prev => [newLog, ...prev])
    }, 2000)
  }

  const columns = [
    {
      title: '设备编码',
      dataIndex: 'equipmentCode',
      key: 'equipmentCode',
      width: 120,
      render: (code: string) => (
        <span style={{ color: '#0097BA', fontWeight: 500 }}>{code}</span>
      ),
    },
    {
      title: '设备名称',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
      width: 150,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
    },
    {
      title: '规格型号',
      dataIndex: 'specification',
      key: 'specification',
      width: 120,
    },
    {
      title: '制造商',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 100,
    },
    {
      title: '数据源',
      dataIndex: 'sourceSystem',
      key: 'sourceSystem',
      width: 100,
      render: (source: DataSourceSystem) => (
        <Tag color={dataSourceSystemMap[source].color}>
          {dataSourceSystemMap[source].label}
        </Tag>
      ),
    },
    {
      title: '同步状态',
      dataIndex: 'syncStatus',
      key: 'syncStatus',
      width: 100,
      render: (status: MasterDataStatus) => {
        const config = masterDataStatusMap[status]
        return (
          <Tag color={config.color} icon={config.icon === '✓' ? <CheckCircleOutlined /> :
                                      config.icon === '✗' ? <CloseCircleOutlined /> :
                                      config.icon === '↻' ? <SyncOutlined spin /> :
                                      config.icon === '⟳' ? <SyncOutlined /> :
                                      <ExclamationCircleOutlined />}>
            {config.label}
          </Tag>
        )
      },
    },
    {
      title: '数据质量',
      dataIndex: 'dataQuality',
      key: 'dataQuality',
      width: 120,
      render: (quality: number) => (
        <Progress
          percent={quality}
          size="small"
          status={quality >= 90 ? 'success' : quality >= 70 ? 'normal' : 'exception'}
          format={percent => `${percent}%`}
        />
      ),
    },
    {
      title: '最后同步',
      dataIndex: 'lastSyncTime',
      key: 'lastSyncTime',
      width: 150,
      render: (time: string | null) =>
        time ? new Date(time).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right' as const,
      render: (_: any, record: MasterDataRecord) => (
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
            icon={<SyncOutlined />}
            onClick={() => handleSync(record)}
            disabled={record.sourceSystem === 'manual'}
          >
            同步
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条主数据吗？"
            onConfirm={() => handleDelete(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // 同步日志列
  const syncLogColumns = [
    {
      title: '源系统',
      dataIndex: 'sourceSystem',
      key: 'sourceSystem',
      width: 100,
      render: (source: DataSourceSystem) => (
        <Tag color={dataSourceSystemMap[source].color}>
          {dataSourceSystemMap[source].label}
        </Tag>
      ),
    },
    {
      title: '同步类型',
      dataIndex: 'syncType',
      key: 'syncType',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'full' ? 'blue' : 'green'}>
          {type === 'full' ? '全量同步' : '增量同步'}
        </Tag>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 150,
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          running: { label: '运行中', color: 'blue' },
          success: { label: '成功', color: 'green' },
          failed: { label: '失败', color: 'red' },
          partial: { label: '部分成功', color: 'orange' },
        }
        const config = statusMap[status] || statusMap.running
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '进度',
      key: 'progress',
      width: 150,
      render: (_: any, record: SyncLog) => (
        <span>
          {record.successRecords}/{record.totalRecords}
          {record.failedRecords > 0 && <span style={{ color: 'red' }}> ({record.failedRecords}失败)</span>}
        </span>
      ),
    },
    {
      title: '触发者',
      dataIndex: 'triggeredBy',
      key: 'triggeredBy',
      width: 100,
    },
    {
      title: '错误信息',
      dataIndex: 'errors',
      key: 'errors',
      width: 200,
      ellipsis: true,
      render: (errors: string[]) => (
        errors.length > 0 ? (
          <Alert
            message={errors[0]}
            type="error"
            showIcon
            style={{ fontSize: 11 }}
          />
        ) : '-'
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#00405C', marginBottom: 16 }}>
          主数据管理
        </h2>
        <Row gutter={16}>
          <Col span={4}>
            <Card>
              <Statistic
                title="主数据总数"
                value={stats.total}
                suffix="条"
                prefix={<CloudSyncOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="已启用"
                value={stats.active}
                suffix="条"
                valueStyle={{ color: '#2BA471' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="已同步"
                value={stats.synced}
                suffix="条"
                valueStyle={{ color: '#0097BA' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="待同步"
                value={stats.pending}
                suffix="条"
                valueStyle={{ color: '#E37318' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="同步失败"
                value={stats.failed}
                suffix="条"
                valueStyle={{ color: '#D54941' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="平均质量"
                value={stats.avgQuality}
                suffix="%"
                precision={1}
                valueStyle={{ color: stats.avgQuality >= 80 ? '#2BA471' : '#E37318' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'records',
              label: (
                <span>
                  主数据记录
                  <Badge count={stats.total} style={{ marginLeft: 8 }} />
                </span>
              ),
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
                    <Search
                      placeholder="搜索设备编码/名称/制造商"
                      allowClear
                      style={{ width: 300 }}
                      onChange={(e) => setSearchText(e.target.value)}
                      prefix={<SearchOutlined />}
                    />
                    <Select
                      placeholder="筛选数据源"
                      allowClear
                      style={{ width: 150 }}
                      onChange={setSourceFilter}
                    >
                      <Option value="SAP">SAP系统</Option>
                      <Option value="MES">MES系统</Option>
                      <Option value="ERP">ERP系统</Option>
                      <Option value="PLM">PLM系统</Option>
                      <Option value="manual">手工录入</Option>
                    </Select>
                    <Select
                      placeholder="筛选同步状态"
                      allowClear
                      style={{ width: 150 }}
                      onChange={setStatusFilter}
                    >
                      <Option value="active">启用</Option>
                      <Option value="synced">已同步</Option>
                      <Option value="pending_sync">待同步</Option>
                      <Option value="sync_failed">同步失败</Option>
                    </Select>
                    <div style={{ flex: 1 }} />
                    <Button
                      type="primary"
                      icon={<SyncOutlined />}
                      onClick={handleBatchSync}
                      style={{ marginRight: 8 }}
                    >
                      批量同步
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
                      新增主数据
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
                </div>
              ),
            },
            {
              key: 'logs',
              label: (
                <span>
                  同步日志
                  <Badge count={syncLogs.length} style={{ marginLeft: 8 }} />
                </span>
              ),
              children: (
                <Table
                  rowKey="id"
                  dataSource={syncLogs}
                  columns={syncLogColumns}
                  scroll={{ x: 1200 }}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 新增/编辑主数据弹窗 */}
      <Modal
        title={editingRecord ? '编辑主数据' : '新增主数据'}
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
                name="equipmentCode"
                label="设备编码"
                rules={[{ required: true, message: '请输入设备编码' }]}
              >
                <Input placeholder="EQ-0001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="equipmentName"
                label="设备名称"
                rules={[{ required: true, message: '请输入设备名称' }]}
              >
                <Input placeholder="请输入设备名称" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="设备分类"
                rules={[{ required: true, message: '请选择设备分类' }]}
              >
                <Select placeholder="请选择设备分类">
                  <Option value="数控机床">数控机床</Option>
                  <Option value="注塑机">注塑机</Option>
                  <Option value="焊接机器人">焊接机器人</Option>
                  <Option value="检测设备">检测设备</Option>
                  <Option value="输送线">输送线</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="manufacturer"
                label="制造商"
                rules={[{ required: true, message: '请选择制造商' }]}
              >
                <Select placeholder="请选择制造商">
                  <Option value="西门子">西门子</Option>
                  <Option value="发那科">发那科</Option>
                  <Option value="三菱">三菱</Option>
                  <Option value="欧姆龙">欧姆龙</Option>
                  <Option value="ABB">ABB</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="specification" label="规格型号">
            <Input placeholder="请输入规格型号" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 主数据详情弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloudSyncOutlined />
            <span>主数据详情</span>
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
        width={800}
      >
        {selectedRecord && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="设备编码">{selectedRecord.equipmentCode}</Descriptions.Item>
                <Descriptions.Item label="设备名称">{selectedRecord.equipmentName}</Descriptions.Item>
                <Descriptions.Item label="设备分类">{selectedRecord.category}</Descriptions.Item>
                <Descriptions.Item label="规格型号">{selectedRecord.specification}</Descriptions.Item>
                <Descriptions.Item label="制造商">{selectedRecord.manufacturer}</Descriptions.Item>
                <Descriptions.Item label="数据源">
                  <Tag color={dataSourceSystemMap[selectedRecord.sourceSystem].color}>
                    {dataSourceSystemMap[selectedRecord.sourceSystem].label}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="源系统ID">{selectedRecord.sourceId}</Descriptions.Item>
                <Descriptions.Item label="同步状态">
                  <Tag color={masterDataStatusMap[selectedRecord.syncStatus].color}>
                    {masterDataStatusMap[selectedRecord.syncStatus].label}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="数据质量">
                  <Progress
                    percent={selectedRecord.dataQuality}
                    size="small"
                    status={selectedRecord.dataQuality >= 90 ? 'success' : 'normal'}
                    style={{ width: 100 }}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="最后同步">
                  {selectedRecord.lastSyncTime
                    ? new Date(selectedRecord.lastSyncTime).toLocaleString('zh-CN')
                    : '未同步'}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {new Date(selectedRecord.createdAt).toLocaleString('zh-CN')}
                </Descriptions.Item>
                <Descriptions.Item label="更新时间">
                  {new Date(selectedRecord.updatedAt).toLocaleString('zh-CN')}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {Object.keys(selectedRecord.technicalParams).length > 0 && (
              <Card size="small" title="技术参数" style={{ marginBottom: 16 }}>
                <Descriptions column={2} size="small">
                  {Object.entries(selectedRecord.technicalParams).map(([key, value]) => (
                    <Descriptions.Item key={key} label={key}>
                      {value}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </Card>
            )}

            {selectedRecord.validationErrors.length > 0 && (
              <Card size="small" title="验证错误">
                <Alert
                  message="数据验证失败"
                  description={selectedRecord.validationErrors.join('、')}
                  type="error"
                  showIcon
                />
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
