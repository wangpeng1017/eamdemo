
/**
 * @file page.tsx
 * @desc 备品备件详情页面
 */
'use client'

import { useParams, useRouter } from 'next/navigation'
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Tabs,
  Table,
  Progress,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  ImportOutlined,
  ExportOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { mockSpareParts, mockStockInRecords, mockStockOutRecords } from '../../../data/spareparts-data'
import { sparePartCategoryMap, sparePartUnitMap, stockInTypeMap, stockOutTypeMap } from '../../../lib/spareparts-types'
import dayjs from 'dayjs'

export default function SparePartDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sparePart = mockSpareParts.find((s) => s.id === params.id)

  if (!sparePart) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <h2>备件不存在</h2>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    )
  }

  // 关联入库记录
  const relatedStockIn = mockStockInRecords.filter((r) => r.sparePartId === sparePart.id)

  // 关联出库记录
  const relatedStockOut = mockStockOutRecords.filter((r) => r.sparePartId === sparePart.id)

  // 库存状态
  const stockStatus = sparePart.currentStock === 0
    ? { label: '缺货', color: '#D54941' }
    : sparePart.currentStock <= sparePart.reorderPoint
    ? { label: '库存预警', color: '#E37318' }
    : { label: '库存正常', color: '#2BA471' }

  const stockPercent = Math.min((sparePart.currentStock / sparePart.safetyStock) * 100, 100)

  const stockInColumns = [
    { title: '入库单号', dataIndex: 'orderNo', key: 'orderNo' },
    { title: '入库类型', dataIndex: 'type', key: 'type', render: (type: keyof typeof stockInTypeMap) => stockInTypeMap[type] },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '单价', dataIndex: 'unitPrice', key: 'unitPrice', render: (p: number) => `¥${p.toLocaleString()}` },
    { title: '总价', dataIndex: 'totalPrice', key: 'totalPrice', render: (p: number) => `¥${p.toLocaleString()}` },
    { title: '供应商', dataIndex: 'supplier', key: 'supplier' },
    { title: '操作人', dataIndex: 'operator', key: 'operator' },
    { title: '入库时间', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => dayjs(d).format('YYYY-MM-DD') },
  ]

  const stockOutColumns = [
    { title: '出库单号', dataIndex: 'orderNo', key: 'orderNo' },
    { title: '出库类型', dataIndex: 'type', key: 'type', render: (type: keyof typeof stockOutTypeMap) => stockOutTypeMap[type] },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '关联单据', dataIndex: 'requestNo', key: 'requestNo' },
    { title: '领用部门', dataIndex: 'department', key: 'department' },
    { title: '领用人', dataIndex: 'receiver', key: 'receiver' },
    { title: '出库时间', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => dayjs(d).format('YYYY-MM-DD') },
  ]

  const handleStockIn = () => {
    message.info('入库功能开发中...')
  }

  const handleStockOut = () => {
    message.info('出库功能开发中...')
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
            返回
          </Button>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#00405C', margin: 0 }}>
            {sparePart.name}
          </h2>
          <Tag color={stockStatus.color}>{stockStatus.label}</Tag>
        </div>
        <Space>
          <Button type="primary" icon={<ImportOutlined />} onClick={handleStockIn}>
            入库
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleStockOut}>
            出库
          </Button>
          <Button icon={<EditOutlined />}>编辑</Button>
        </Space>
      </div>

      <Tabs
        defaultActiveKey="basic"
        items={[
          {
            key: 'basic',
            label: '基本信息',
            children: (
              <Card>
                <Descriptions column={2} bordered>
                  <Descriptions.Item label="备件编码">{sparePart.code}</Descriptions.Item>
                  <Descriptions.Item label="备件名称">{sparePart.name}</Descriptions.Item>
                  <Descriptions.Item label="型号规格">{sparePart.model}</Descriptions.Item>
                  <Descriptions.Item label="分类">{sparePartCategoryMap[sparePart.category]}</Descriptions.Item>
                  <Descriptions.Item label="单位">{sparePartUnitMap[sparePart.unit]}</Descriptions.Item>
                  <Descriptions.Item label="制造商">{sparePart.manufacturer}</Descriptions.Item>
                  <Descriptions.Item label="供应商">{sparePart.supplier}</Descriptions.Item>
                  <Descriptions.Item label="单价">¥{sparePart.unitPrice.toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="当前库存">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <span style={{ fontSize: 18, fontWeight: 600, color: stockStatus.color }}>
                        {sparePart.currentStock} {sparePartUnitMap[sparePart.unit]}
                      </span>
                      <Progress
                        percent={stockPercent}
                        strokeColor={stockStatus.color}
                        showInfo={false}
                      />
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="安全库存">{sparePart.safetyStock} {sparePartUnitMap[sparePart.unit]}</Descriptions.Item>
                  <Descriptions.Item label="重订货点">{sparePart.reorderPoint} {sparePartUnitMap[sparePart.unit]}</Descriptions.Item>
                  <Descriptions.Item label="已预留库存">{sparePart.reservedStock} {sparePartUnitMap[sparePart.unit]}</Descriptions.Item>
                  <Descriptions.Item label="仓库">{sparePart.warehouse}</Descriptions.Item>
                  <Descriptions.Item label="存放位置">{sparePart.location}</Descriptions.Item>
                  <Descriptions.Item label="库存总值" span={2}>
                    ¥{(sparePart.currentStock * sparePart.unitPrice).toLocaleString()}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间" span={2}>
                    {dayjs(sparePart.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                  <Descriptions.Item label="备注" span={2}>
                    {sparePart.description || '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'stock-in',
            label: `入库记录 (${relatedStockIn.length})`,
            children: (
              <Card>
                <Table
                  rowKey="id"
                  dataSource={relatedStockIn}
                  columns={stockInColumns}
                  pagination={{ pageSize: 5 }}
                />
              </Card>
            ),
          },
          {
            key: 'stock-out',
            label: `出库记录 (${relatedStockOut.length})`,
            children: (
              <Card>
                <Table
                  rowKey="id"
                  dataSource={relatedStockOut}
                  columns={stockOutColumns}
                  pagination={{ pageSize: 5 }}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}
