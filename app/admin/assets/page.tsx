/**
 * @file page.tsx
 * @desc 资产管理列表页面
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
  DatePicker,
  InputNumber,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import { mockAssets } from '@/data/asset-data'
import { Asset, assetStatusMap, assetCategoryMap, depreciationMethodMap, AssetCategory, AssetSource, DepreciationMethod } from '@/lib/asset-types'
import dayjs from 'dayjs'

const { Search } = Input
const { Option } = Select
const { TextArea } = Input

export default function AssetListPage() {
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [dataSource, setDataSource] = useState<Asset[]>(mockAssets)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Asset | null>(null)
  const [form] = Form.useForm()

  // 筛选数据
  const filteredData = dataSource.filter((item) => {
    const matchText =
      item.assetNo.toLowerCase().includes(searchText.toLowerCase()) ||
      item.name.includes(searchText) ||
      item.model.includes(searchText)
    const matchCategory = !categoryFilter || item.category === categoryFilter
    const matchStatus = !statusFilter || item.status === statusFilter
    return matchText && matchCategory && matchStatus
  })

  // 统计数据
  const stats = {
    total: dataSource.length,
    totalValue: dataSource.reduce((sum, item) => sum + item.currentValue, 0),
    normal: dataSource.filter((d) => d.status === 'normal').length,
    depreciating: dataSource.filter((d) => d.status === 'depreciating').length,
  }

  // 打开新增弹框
  const openAddModal = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({
      usefulLife: 120, // 默认10年
      depreciationMethod: 'straight_line',
      purchaseDate: dayjs(),
    })
    setModalOpen(true)
  }

  // 打开编辑弹框
  const openEditModal = (record: Asset) => {
    setEditingRecord(record)
    form.setFieldsValue({
      name: record.name,
      category: record.category,
      source: record.source,
      originalValue: record.originalValue,
      purchaseDate: dayjs(record.purchaseDate),
      usefulLife: record.usefulLife,
      depreciationMethod: record.depreciationMethod,
      location: record.location,
      department: record.department,
      responsiblePerson: record.responsiblePerson,
      custodian: record.custodian,
      manufacturer: record.manufacturer,
      model: record.model,
      serialNumber: record.serialNumber,
      description: record.description,
    })
    setModalOpen(true)
  }

  // 提交表单
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingRecord) {
        // 编辑模式
        message.success(`资产 "${values.name}" 更新成功`)
        setDataSource(prev => prev.map(item =>
          item.id === editingRecord.id
            ? {
                ...item,
                ...values,
                purchaseDate: values.purchaseDate.toISOString(),
              }
            : item
        ))
      } else {
        // 新增模式
        const newAsset: Asset = {
          id: `AS${String(dataSource.length + 1).padStart(4, '0')}`,
          assetNo: `AS-${dayjs().year()}-${String(dataSource.length + 1).padStart(4, '0')}`,
          ...values,
          purchaseDate: values.purchaseDate.toISOString(),
          startDepreciationDate: values.purchaseDate.toISOString(),
          lastDepreciationDate: dayjs().toISOString(),
          currentValue: values.originalValue,
          netResidualValue: Math.floor(values.originalValue * 0.05),
          accumulatedDepreciation: 0,
          depreciationRate: 0.0083,
          usedMonths: 0,
          status: 'normal',
          supplier: '供应商A',
          createdAt: dayjs().toISOString(),
          updatedAt: dayjs().toISOString(),
        }
        message.success(`资产 "${values.name}" 添加成功`)
        setDataSource(prev => [...prev, newAsset])
      }

      setModalOpen(false)
      form.resetFields()
      setEditingRecord(null)
    })
  }

  // 删除资产
  const handleDelete = (record: Asset) => {
    setDataSource(prev => prev.filter(item => item.id !== record.id))
    message.success(`资产 "${record.name}" 已删除`)
  }

  const columns = [
    {
      title: '资产编号',
      dataIndex: 'assetNo',
      key: 'assetNo',
      width: 180,
      render: (assetNo: string, record: Asset) => (
        <Link href={`/admin/assets/${record.id}`} style={{ color: '#0097BA' }}>
          {assetNo}
        </Link>
      ),
    },
    {
      title: '资产名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: keyof typeof assetCategoryMap) => (
        <span>{assetCategoryMap[category].icon} {assetCategoryMap[category].label}</span>
      ),
    },
    {
      title: '原值',
      dataIndex: 'originalValue',
      key: 'originalValue',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '当前价值',
      dataIndex: 'currentValue',
      key: 'currentValue',
      width: 120,
      render: (value: number, record: Asset) => {
        const depreciationRate = ((record.originalValue - value) / record.originalValue * 100)
        return (
          <div>
            <div style={{ fontWeight: 600 }}>¥{value.toLocaleString()}</div>
            {record.status === 'depreciating' && (
              <Tag color="orange" icon={<FallOutlined />} style={{ fontSize: 11, marginTop: 4 }}>
                {depreciationRate.toFixed(1)}%
              </Tag>
            )}
          </div>
        )
      },
    },
    {
      title: '累计折旧',
      dataIndex: 'accumulatedDepreciation',
      key: 'accumulatedDepreciation',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '使用情况',
      key: 'usage',
      width: 150,
      render: (_: any, record: Asset) => (
        <div>
          <div style={{ fontSize: 12, color: '#666' }}>
            已使用 {record.usedMonths}个月 / {record.usefulLife}个月
          </div>
          <div style={{ marginTop: 4, fontSize: 12 }}>
            <Progress
              percent={parseFloat((record.usedMonths / record.usefulLife * 100).toFixed(1))}
              showInfo={false}
              strokeColor={record.usedMonths / record.usefulLife > 0.8 ? '#E37318' : '#0097BA'}
              size="small"
            />
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: keyof typeof assetStatusMap) => {
        const config = assetStatusMap[status]
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '存放位置',
      dataIndex: 'location',
      key: 'location',
      width: 120,
    },
    {
      title: '责任人',
      dataIndex: 'responsiblePerson',
      key: 'responsiblePerson',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: Asset) => (
        <Space size="small">
          <Link href={`/admin/assets/${record.id}`}>
            <Button type="link" size="small" icon={<EyeOutlined />}>
              详情
            </Button>
          </Link>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个资产吗？删除后无法恢复。"
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

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#00405C', marginBottom: 16 }}>
          资产管理
        </h2>
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="资产总数"
                value={stats.total}
                suffix="件"
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="资产总值"
                value={stats.totalValue}
                suffix="元"
                precision={0}
                valueStyle={{ color: '#0097BA' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="正常资产"
                value={stats.normal}
                suffix="件"
                valueStyle={{ color: '#2BA471' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="折旧中"
                value={stats.depreciating}
                suffix="件"
                valueStyle={{ color: '#E37318' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <Search
            placeholder="搜索资产编号/名称/型号"
            allowClear
            style={{ width: 300 }}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="筛选分类"
            allowClear
            style={{ width: 150 }}
            onChange={setCategoryFilter}
          >
            <Option value="equipment">设备类</Option>
            <Option value="building">建筑物</Option>
            <Option value="vehicle">车辆</Option>
            <Option value="tool">工具类</Option>
            <Option value="it">IT设备</Option>
            <Option value="other">其他</Option>
          </Select>
          <Select
            placeholder="筛选状态"
            allowClear
            style={{ width: 120 }}
            onChange={setStatusFilter}
          >
            <Option value="normal">正常</Option>
            <Option value="appreciating">增值</Option>
            <Option value="depreciating">贬值</Option>
            <Option value="scrapped">报废</Option>
          </Select>
          <div style={{ flex: 1 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            新增资产
          </Button>
        </div>
        <Table
          rowKey="id"
          dataSource={filteredData}
          columns={columns}
          scroll={{ x: 1800 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 新增/编辑资产弹窗 */}
      <Modal
        title={editingRecord ? '编辑资产' : '新增资产'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
          setEditingRecord(null)
        }}
        width={800}
        okText="提交"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="资产名称"
                rules={[{ required: true, message: '请输入资产名称' }]}
              >
                <Input placeholder="请输入资产名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="资产分类"
                rules={[{ required: true, message: '请选择资产分类' }]}
              >
                <Select placeholder="请选择资产分类">
                  <Option value="equipment">设备类</Option>
                  <Option value="building">建筑物</Option>
                  <Option value="vehicle">车辆</Option>
                  <Option value="tool">工具类</Option>
                  <Option value="it">IT设备</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="source"
                label="资产来源"
                rules={[{ required: true, message: '请选择资产来源' }]}
              >
                <Select placeholder="请选择资产来源">
                  <Option value="purchase">购入</Option>
                  <Option value="self_built">自建</Option>
                  <Option value="donation">捐赠</Option>
                  <Option value="transfer">调入</Option>
                  <Option value="lease">租赁</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="originalValue"
                label="资产原值"
                rules={[{ required: true, message: '请输入资产原值' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入资产原值"
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
                name="usefulLife"
                label="使用年限（月）"
                rules={[{ required: true, message: '请输入使用年限' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入使用年限"
                  min={1}
                  max={600}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="depreciationMethod"
                label="折旧方法"
                rules={[{ required: true, message: '请选择折旧方法' }]}
              >
                <Select placeholder="请选择折旧方法">
                  <Option value="straight_line">平均年限法</Option>
                  <Option value="double_declining">双倍余额递减法</Option>
                  <Option value="sum_of_years">年数总和法</Option>
                  <Option value="none">不计提折旧</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="department"
                label="使用部门"
                rules={[{ required: true, message: '请输入使用部门' }]}
              >
                <Select placeholder="请选择使用部门">
                  <Option value="生产部">生产部</Option>
                  <Option value="设备部">设备部</Option>
                  <Option value="质量部">质量部</Option>
                  <Option value="研发部">研发部</Option>
                  <Option value="行政部">行政部</Option>
                  <Option value="信息部">信息部</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="location"
                label="存放位置"
                rules={[{ required: true, message: '请输入存放位置' }]}
              >
                <Select placeholder="请选择存放位置">
                  <Option value="一车间">一车间</Option>
                  <Option value="二车间">二车间</Option>
                  <Option value="办公楼">办公楼</Option>
                  <Option value="实验室">实验室</Option>
                  <Option value="仓库">仓库</Option>
                  <Option value="停车场">停车场</Option>
                </Select>
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="manufacturer" label="制造商">
                <Input placeholder="请输入制造商" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="model" label="型号规格">
                <Input placeholder="请输入型号规格" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="serialNumber" label="序列号">
                <Input placeholder="请输入序列号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="custodian" label="保管人">
                <Input placeholder="请输入保管人" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="备注">
            <TextArea rows={4} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// 添加Progress组件导入
import { Progress } from 'antd'
