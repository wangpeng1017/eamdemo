
/**
 * @file page.tsx
 * @desc 备品备件库存列表页面
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
  Progress,
  message,
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  ImportOutlined,
  ExportOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import { mockSpareParts } from '@/data/spareparts-data'
import { SparePart, sparePartStatusMap, sparePartCategoryMap, sparePartUnitMap } from '@/lib/spareparts-types'
import dayjs from 'dayjs'

const { Search } = Input
const { Option } = Select

export default function SparePartsListPage() {
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>()
  const [dataSource] = useState<SparePart[]>(mockSpareParts)

  // 筛选数据
  const filteredData = dataSource.filter((item) => {
    const matchText =
      item.name.includes(searchText) ||
      item.code.includes(searchText) ||
      item.model.includes(searchText)
    const matchCategory = !categoryFilter || item.category === categoryFilter
    return matchText && matchCategory
  })

  // 统计数据
  const stats = {
    total: dataSource.length,
    inStock: dataSource.filter((d) => d.currentStock > d.reorderPoint).length,
    lowStock: dataSource.filter((d) => d.currentStock <= d.reorderPoint && d.currentStock > 0).length,
    outOfStock: dataSource.filter((d) => d.currentStock === 0).length,
    totalValue: dataSource.reduce((sum, d) => sum + d.unitPrice * d.currentStock, 0),
  }

  // 删除备件
  const handleDelete = (id: string) => {
    message.success('删除成功')
  }

  const columns = [
    {
      title: '备件编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string, record: SparePart) => (
        <Link href={`/admin/spareparts/${record.id}`} style={{ color: '#0097BA' }}>
          {code}
        </Link>
      ),
    },
    {
      title: '备件名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '型号规格',
      dataIndex: 'model',
      key: 'model',
      width: 100,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 80,
      render: (category: keyof typeof sparePartCategoryMap) => sparePartCategoryMap[category],
    },
    {
      title: '制造商',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 100,
    },
    {
      title: '当前库存',
      dataIndex: 'currentStock',
      key: 'currentStock',
      width: 100,
      render: (stock: number, record: SparePart) => {
        const percent = Math.min((stock / record.safetyStock) * 100, 100)
        const color = stock === 0 ? '#D54941' : stock <= record.reorderPoint ? '#E37318' : '#2BA471'
        return (
          <div>
            <div style={{ fontWeight: 600, color }}>
              {stock} {sparePartUnitMap[record.unit]}
            </div>
            <Progress
              percent={percent}
              showInfo={false}
              strokeColor={color}
              size="small"
              style={{ marginTop: 4 }}
            />
          </div>
        )
      },
    },
    {
      title: '安全库存',
      dataIndex: 'safetyStock',
      key: 'safetyStock',
      width: 80,
      render: (stock: number, record: SparePart) => `${stock} ${sparePartUnitMap[record.unit]}`,
    },
    {
      title: '已预留',
      dataIndex: 'reservedStock',
      key: 'reservedStock',
      width: 80,
      render: (stock: number, record: SparePart) => `${stock} ${sparePartUnitMap[record.unit]}`,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 80,
      render: (price: number) => `¥${price.toLocaleString()}`,
    },
    {
      title: '存放位置',
      dataIndex: 'location',
      key: 'location',
      width: 150,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: SparePart) => (
        <Space size="small">
          <Link href={`/admin/spareparts/${record.id}`}>
            <Button type="link" size="small" icon={<EyeOutlined />}>
              详情
            </Button>
          </Link>
          <Button type="link" size="small" icon={<ImportOutlined />}>
            入库
          </Button>
          <Button type="link" size="small" icon={<ExportOutlined />}>
            出库
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#00405C', marginBottom: 16 }}>
          备品备件
        </h2>
        <Row gutter={16}>
          <Col span={4}>
            <Card>
              <Statistic title="备件总数" value={stats.total} suffix="种" />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic
                title="库存正常"
                value={stats.inStock}
                suffix="种"
                valueStyle={{ color: '#2BA471' }}
              />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic
                title="库存预警"
                value={stats.lowStock}
                suffix="种"
                valueStyle={{ color: '#E37318' }}
              />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic
                title="缺货"
                value={stats.outOfStock}
                suffix="种"
                valueStyle={{ color: '#D54941' }}
              />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic
                title="库存总价值"
                value={stats.totalValue}
                prefix="¥"
                precision={0}
                valueStyle={{ color: '#00405C' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <Search
            placeholder="搜索备件名称/编码/型号"
            allowClear
            style={{ width: 300 }}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="筛选分类"
            allowClear
            style={{ width: 120 }}
            onChange={setCategoryFilter}
          >
            <Option value="electrical">电气件</Option>
            <Option value="mechanical">机械件</Option>
            <Option value="hydraulic">液压件</Option>
            <Option value="pneumatic">气动件</Option>
            <Option value="control">控制件</Option>
            <Option value="consumable">消耗品</Option>
            <Option value="other">其他</Option>
          </Select>
          <div style={{ flex: 1 }} />
          <Button type="primary" icon={<PlusOutlined />}>
            新增备件
          </Button>
        </div>
        <Table
          rowKey="id"
          dataSource={filteredData}
          columns={columns}
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>
    </div>
  )
}
