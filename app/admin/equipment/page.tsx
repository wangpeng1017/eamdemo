
/**
 * @file page.tsx
 * @desc 设备台账列表页面
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
  Popconfirm,
  Modal,
  Form,
  message,
  DatePicker,
  InputNumber,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import { mockEquipments } from '@/data/mock-data'
import { Equipment, equipmentStatusMap, criticalityMap } from '@/lib/types'
import dayjs from 'dayjs'

const { Search } = Input
const { Option } = Select

export default function EquipmentListPage() {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [dataSource, setDataSource] = useState<Equipment[]>(mockEquipments)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Equipment | null>(null)
  const [form] = Form.useForm()

  // 筛选数据
  const filteredData = dataSource.filter((item) => {
    const matchText =
      item.name.includes(searchText) ||
      item.code.includes(searchText) ||
      item.model.includes(searchText)
    const matchStatus = !statusFilter || item.status === statusFilter
    return matchText && matchStatus
  })

  // 统计数据
  const stats = {
    total: dataSource.length,
    running: dataSource.filter((d) => d.status === 'running').length,
    maintenance: dataSource.filter((d) => d.status === 'maintenance').length,
    repair: dataSource.filter((d) => d.status === 'repair').length,
  }

  // 删除设备
  const handleDelete = (id: string) => {
    setDataSource(dataSource.filter((d) => d.id !== id))
    message.success('删除成功')
  }

  // 打开新增弹框
  const openAddModal = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({
      status: 'running',
      criticality: 'normal',
      purchaseDate: dayjs(),
    })
    setModalOpen(true)
  }

  // 打开编辑弹框
  const openEditModal = (record: Equipment) => {
    setEditingRecord(record)
    form.setFieldsValue({
      name: record.name,
      model: record.model,
      manufacturer: record.manufacturer,
      category: record.category,
      location: record.location,
      department: record.department,
      status: record.status,
      criticality: record.criticality,
      responsiblePerson: record.responsiblePerson,
      originalValue: record.originalValue,
      purchaseDate: dayjs(record.purchaseDate),
      description: record.description,
    })
    setModalOpen(true)
  }

  // 提交表单
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingRecord) {
        // 编辑模式
        message.success(`设备 "${values.name}" 更新成功`)
        setDataSource(prev => prev.map(item =>
          item.id === editingRecord.id
            ? {
                ...item,
                ...values,
                purchaseDate: values.purchaseDate.toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : item
        ))
      } else {
        // 新增模式
        const newEquipment: Equipment = {
          id: `EQ${String(dataSource.length + 1).padStart(4, '0')}`,
          code: `EQ-${String(dataSource.length + 1).padStart(4, '0')}`,
          ...values,
          purchaseDate: values.purchaseDate.toISOString(),
          installDate: values.purchaseDate.toISOString(),
          warrantyDate: dayjs(values.purchaseDate).add(3, 'year').toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        message.success(`设备 "${values.name}" 添加成功`)
        setDataSource(prev => [...prev, newEquipment])
      }

      setModalOpen(false)
      form.resetFields()
      setEditingRecord(null)
    })
  }

  const columns = [
    {
      title: '设备编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string, record: Equipment) => (
        <Link href={`/admin/equipment/${record.id}`} style={{ color: '#0097BA' }}>
          {code}
        </Link>
      ),
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '型号规格',
      dataIndex: 'model',
      key: 'model',
      width: 100,
    },
    {
      title: '制造商',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 100,
    },
    {
      title: '安装位置',
      dataIndex: 'location',
      key: 'location',
      width: 100,
    },
    {
      title: '设备状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: keyof typeof equipmentStatusMap) => {
        const config = equipmentStatusMap[status]
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '关键性',
      dataIndex: 'criticality',
      key: 'criticality',
      width: 100,
      render: (criticality: keyof typeof criticalityMap) => {
        const config = criticalityMap[criticality]
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '购置日期',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '负责人',
      dataIndex: 'responsiblePerson',
      key: 'responsiblePerson',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Equipment) => (
        <Space size="small">
          <Link href={`/admin/equipment/${record.id}`}>
            <Button type="link" size="small" icon={<EyeOutlined />}>
              详情
            </Button>
          </Link>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该设备吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
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

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#00405C', marginBottom: 16 }}>
          设备台账
        </h2>
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic title="设备总数" value={stats.total} suffix="台" />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="运行中"
                value={stats.running}
                suffix="台"
                valueStyle={{ color: '#2BA471' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="保养中"
                value={stats.maintenance}
                suffix="台"
                valueStyle={{ color: '#E37318' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="维修中"
                value={stats.repair}
                suffix="台"
                valueStyle={{ color: '#D54941' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <Search
            placeholder="搜索设备名称/编码/型号"
            allowClear
            style={{ width: 300 }}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="筛选状态"
            allowClear
            style={{ width: 150 }}
            onChange={setStatusFilter}
          >
            <Option value="running">运行中</Option>
            <Option value="standby">待机</Option>
            <Option value="maintenance">保养中</Option>
            <Option value="repair">维修中</Option>
            <Option value="scrapped">已报废</Option>
          </Select>
          <div style={{ flex: 1 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            新增设备
          </Button>
        </div>
        <Table
          rowKey="id"
          dataSource={filteredData}
          columns={columns}
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 新增/编辑设备弹窗 */}
      <Modal
        title={editingRecord ? '编辑设备' : '新增设备'}
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
                name="name"
                label="设备名称"
                rules={[{ required: true, message: '请输入设备名称' }]}
              >
                <Input placeholder="请输入设备名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="model"
                label="型号规格"
                rules={[{ required: true, message: '请输入型号规格' }]}
              >
                <Input placeholder="请输入型号规格" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
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
                  <Option value="库卡">库卡</Option>
                  <Option value="大族激光">大族激光</Option>
                  <Option value="华工激光">华工激光</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="设备分类"
                rules={[{ required: true, message: '请选择设备分类' }]}
              >
                <Select placeholder="请选择设备分类">
                  <Option value="数控机床">数控机床</Option>
                  <Option value="注塑机">注塑机</Option>
                  <Option value="冲压机">冲压机</Option>
                  <Option value="焊接机器人">焊接机器人</Option>
                  <Option value="热处理炉">热处理炉</Option>
                  <Option value="检测设备">检测设备</Option>
                  <Option value="输送线">输送线</Option>
                  <Option value="包装机">包装机</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="location"
                label="存放位置"
                rules={[{ required: true, message: '请选择存放位置' }]}
              >
                <Select placeholder="请选择存放位置">
                  <Option value="一车间">一车间</Option>
                  <Option value="二车间">二车间</Option>
                  <Option value="三车间">三车间</Option>
                  <Option value="精工车间">精工车间</Option>
                  <Option value="装配车间">装配车间</Option>
                  <Option value="包装车间">包装车间</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="department"
                label="使用部门"
                rules={[{ required: true, message: '请选择使用部门' }]}
              >
                <Select placeholder="请选择使用部门">
                  <Option value="生产部">生产部</Option>
                  <Option value="设备部">设备部</Option>
                  <Option value="质量部">质量部</Option>
                  <Option value="维护部">维护部</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="status"
                label="设备状态"
                rules={[{ required: true, message: '请选择设备状态' }]}
              >
                <Select placeholder="请选择设备状态">
                  <Option value="running">运行中</Option>
                  <Option value="standby">待机</Option>
                  <Option value="maintenance">保养中</Option>
                  <Option value="repair">维修中</Option>
                  <Option value="scrapped">已报废</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="criticality"
                label="重要性"
                rules={[{ required: true, message: '请选择重要性' }]}
              >
                <Select placeholder="请选择重要性">
                  <Option value="core">核心设备</Option>
                  <Option value="important">重要设备</Option>
                  <Option value="normal">一般设备</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="originalValue"
                label="设备原值"
                rules={[{ required: true, message: '请输入设备原值' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入设备原值"
                  precision={2}
                  min={0}
                  prefix="¥"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="purchaseDate"
                label="购置日期"
                rules={[{ required: true, message: '请选择购置日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="responsiblePerson"
                label="责任人"
                rules={[{ required: true, message: '请输入责任人' }]}
              >
                <Input placeholder="请输入责任人" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="设备描述">
            <Input.TextArea rows={4} placeholder="请输入设备描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
