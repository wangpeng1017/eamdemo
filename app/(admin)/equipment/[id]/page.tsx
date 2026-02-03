
/**
 * @file page.tsx
 * @desc 设备详情页面
 */
'use client'

import { use } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Tabs,
  Table,
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { mockEquipments, mockRepairOrders } from '@/data/mock-data'
import { equipmentStatusMap, criticalityMap } from '@/lib/types'
import dayjs from 'dayjs'

export default function EquipmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const equipment = mockEquipments.find((e) => e.id === params.id)

  if (!equipment) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <h2>设备不存在</h2>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    )
  }

  // 关联维修工单
  const relatedRepairs = mockRepairOrders.filter((r) => r.equipmentId === equipment.id)

  const repairColumns = [
    { title: '工单编号', dataIndex: 'orderNo', key: 'orderNo' },
    { title: '故障类型', dataIndex: 'faultType', key: 'faultType' },
    { title: '故障描述', dataIndex: 'faultDescription', key: 'faultDescription' },
    { title: '报修时间', dataIndex: 'reportTime', key: 'reportTime', render: (d: string) => dayjs(d).format('YYYY-MM-DD') },
    { title: '状态', dataIndex: 'status', key: 'status' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
            返回
          </Button>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#00405C', margin: 0 }}>
            {equipment.name}
          </h2>
          <Tag color={equipmentStatusMap[equipment.status as keyof typeof equipmentStatusMap]?.color}>
            {equipmentStatusMap[equipment.status as keyof typeof equipmentStatusMap]?.label}
          </Tag>
          <Tag color={criticalityMap[equipment.criticality as keyof typeof criticalityMap]?.color}>
            {criticalityMap[equipment.criticality as keyof typeof criticalityMap]?.label}
          </Tag>
        </div>
        <Space>
          <Button icon={<EditOutlined />}>编辑</Button>
          <Button danger icon={<DeleteOutlined />}>删除</Button>
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
                  <Descriptions.Item label="设备编码">{equipment.code}</Descriptions.Item>
                  <Descriptions.Item label="设备名称">{equipment.name}</Descriptions.Item>
                  <Descriptions.Item label="型号规格">{equipment.model}</Descriptions.Item>
                  <Descriptions.Item label="制造商">{equipment.manufacturer}</Descriptions.Item>
                  <Descriptions.Item label="设备分类">{equipment.category}</Descriptions.Item>
                  <Descriptions.Item label="安装位置">{equipment.location}</Descriptions.Item>
                  <Descriptions.Item label="使用部门">{equipment.department}</Descriptions.Item>
                  <Descriptions.Item label="负责人">{equipment.responsiblePerson}</Descriptions.Item>
                  <Descriptions.Item label="购置日期">{dayjs(equipment.purchaseDate).format('YYYY-MM-DD')}</Descriptions.Item>
                  <Descriptions.Item label="安装日期">{dayjs(equipment.installDate).format('YYYY-MM-DD')}</Descriptions.Item>
                  <Descriptions.Item label="质保到期">{dayjs(equipment.warrantyDate).format('YYYY-MM-DD')}</Descriptions.Item>
                  <Descriptions.Item label="设备原值">¥{equipment.originalValue.toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="创建时间" span={2}>
                    {dayjs(equipment.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                  <Descriptions.Item label="备注" span={2}>
                    {equipment.description || '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'repair',
            label: `维修记录 (${relatedRepairs.length})`,
            children: (
              <Card>
                <Table
                  rowKey="id"
                  dataSource={relatedRepairs}
                  columns={repairColumns}
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
