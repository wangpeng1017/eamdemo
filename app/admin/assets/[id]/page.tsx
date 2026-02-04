/**
 * @file page.tsx
 * @desc 资产详情页面
 */
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Tabs,
  Table,
  Row,
  Col,
  Statistic,
  Progress,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  HomeOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { mockAssets, mockDepreciationRecords, mockAssetChanges } from '@/data/asset-data'
import { Asset, assetStatusMap, assetCategoryMap, depreciationMethodMap } from '@/lib/asset-types'
import dayjs from 'dayjs'

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [asset] = useState<Asset | undefined>(
    mockAssets.find((a) => a.id === params.id)
  )

  if (!asset) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h2>资产不存在</h2>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    )
  }

  const depreciationRecords = mockDepreciationRecords.filter(r => r.assetId === asset.id)
  const assetChanges = mockAssetChanges.filter(c => c.assetId === asset.id)

  const handleEdit = () => {
    message.info('编辑功能开发中')
  }

  const handleDelete = () => {
    message.info('删除功能开发中')
  }

  // 折旧记录列
  const depreciationColumns = [
    {
      title: '折旧期间',
      dataIndex: 'period',
      key: 'period',
      width: 120,
    },
    {
      title: '本期折旧额',
      dataIndex: 'depreciationAmount',
      key: 'depreciationAmount',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '折旧前累计',
      dataIndex: 'beforeDepreciation',
      key: 'beforeDepreciation',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '折旧后累计',
      dataIndex: 'afterDepreciation',
      key: 'afterDepreciation',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '折旧前价值',
      dataIndex: 'beforeValue',
      key: 'beforeValue',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '折旧后价值',
      dataIndex: 'afterValue',
      key: 'afterValue',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '计提人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '计提时间',
      dataIndex: 'calculateTime',
      key: 'calculateTime',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ]

  // 变动记录列
  const changeColumns = [
    {
      title: '变动单号',
      dataIndex: 'changeNo',
      key: 'changeNo',
      width: 180,
    },
    {
      title: '变动类型',
      dataIndex: 'changeType',
      key: 'changeType',
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, { label: string; color: string }> = {
          purchase: { label: '新购入', color: 'green' },
          transfer: { label: '调拨', color: 'blue' },
          scrap: { label: '报废', color: 'red' },
          depreciation: { label: '折旧', color: 'orange' },
          valuation: { label: '重估', color: 'purple' },
          other: { label: '其他', color: 'gray' },
        }
        const config = typeMap[type] || typeMap.other
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '变动金额',
      dataIndex: 'changeAmount',
      key: 'changeAmount',
      width: 120,
      render: (value: number) => (
        <span style={{ color: value >= 0 ? '#2BA471' : '#E37318' }}>
          {value >= 0 ? '+' : ''}¥{value.toLocaleString()}
        </span>
      ),
    },
    {
      title: '变动前价值',
      dataIndex: 'beforeValue',
      key: 'beforeValue',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '变动后价值',
      dataIndex: 'afterValue',
      key: 'afterValue',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '变动原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 200,
      ellipsis: true,
    },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          pending: { label: '待审批', color: 'orange' },
          approved: { label: '已批准', color: 'green' },
          rejected: { label: '已拒绝', color: 'red' },
        }
        const config = statusMap[status] || statusMap.pending
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '操作时间',
      dataIndex: 'operatorTime',
      key: 'operatorTime',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ]

  const statusConfig = assetStatusMap[asset.status]
  const categoryConfig = assetCategoryMap[asset.category]
  const depreciationRate = ((asset.originalValue - asset.currentValue) / asset.originalValue * 100)

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
          返回列表
        </Button>
      </div>

      {/* 基本信息 */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              {categoryConfig.icon} {asset.name}
            </span>
            <Space>
              <Button icon={<EditOutlined />} onClick={handleEdit}>
                编辑
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                删除
              </Button>
            </Space>
          </div>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="资产原值"
                value={asset.originalValue}
                prefix="¥"
                precision={2}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="当前价值"
                value={asset.currentValue}
                prefix="¥"
                precision={2}
                valueStyle={{ color: asset.status === 'depreciating' ? '#E37318' : '#0097BA' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="累计折旧"
                value={asset.accumulatedDepreciation}
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#E37318' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="折旧进度"
                value={parseFloat((asset.usedMonths / asset.usefulLife * 100).toFixed(1))}
                suffix="%"
                valueStyle={{ color: asset.usedMonths / asset.usefulLife > 0.8 ? '#E37318' : '#0097BA' }}
              />
            </Card>
          </Col>
        </Row>

        <Descriptions bordered column={2}>
          <Descriptions.Item label="资产编号">{asset.assetNo}</Descriptions.Item>
          <Descriptions.Item label="资产名称">{asset.name}</Descriptions.Item>
          <Descriptions.Item label="资产分类">
            <span>{categoryConfig.icon} {categoryConfig.label}</span>
          </Descriptions.Item>
          <Descriptions.Item label="资产状态">
            <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="资产来源">
            {asset.source === 'purchase' ? '购入' :
             asset.source === 'self_built' ? '自建' :
             asset.source === 'donation' ? '捐赠' :
             asset.source === 'transfer' ? '调入' : '租赁'}
          </Descriptions.Item>
          <Descriptions.Item label="折旧方法">{depreciationMethodMap[asset.depreciationMethod]}</Descriptions.Item>
          <Descriptions.Item label="资产原值">¥{asset.originalValue.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="当前价值">
            <span style={{ color: '#0097BA', fontWeight: 600 }}>
              ¥{asset.currentValue.toLocaleString()}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="累计折旧">
            <span style={{ color: '#E37318' }}>¥{asset.accumulatedDepreciation.toLocaleString()}</span>
          </Descriptions.Item>
          <Descriptions.Item label="净残值">¥{asset.netResidualValue.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="使用年限">{asset.usefulLife}个月</Descriptions.Item>
          <Descriptions.Item label="已使用">{asset.usedMonths}个月</Descriptions.Item>
          <Descriptions.Item label="折旧率">{(asset.depreciationRate * 100).toFixed(2)}%</Descriptions.Item>
          <Descriptions.Item label="折旧程度">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Progress
                percent={parseFloat((asset.usedMonths / asset.usefulLife * 100).toFixed(1))}
                showInfo={true}
                strokeColor={asset.usedMonths / asset.usefulLife > 0.8 ? '#E37318' : '#0097BA'}
                style={{ width: 150 }}
              />
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="购置日期">
            {dayjs(asset.purchaseDate).format('YYYY-MM-DD')}
          </Descriptions.Item>
          <Descriptions.Item label="开始折旧日期">
            {dayjs(asset.startDepreciationDate).format('YYYY-MM-DD')}
          </Descriptions.Item>
          <Descriptions.Item label="存放位置" labelStyle={{ width: 150 }}>
            <HomeOutlined /> {asset.location}
          </Descriptions.Item>
          <Descriptions.Item label="使用部门">{asset.department}</Descriptions.Item>
          <Descriptions.Item label="责任人">
            <UserOutlined /> {asset.responsiblePerson}
          </Descriptions.Item>
          <Descriptions.Item label="保管人">{asset.custodian}</Descriptions.Item>
          <Descriptions.Item label="供应商">{asset.supplier}</Descriptions.Item>
          <Descriptions.Item label="制造商">{asset.manufacturer}</Descriptions.Item>
          <Descriptions.Item label="型号规格">{asset.model}</Descriptions.Item>
          <Descriptions.Item label="序列号">{asset.serialNumber}</Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>
            {asset.description}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 详细信息标签页 */}
      <Card>
        <Tabs
          items={[
            {
              key: 'depreciation',
              label: `折旧记录 (${depreciationRecords.length})`,
              children: (
                <Table
                  rowKey="id"
                  dataSource={depreciationRecords}
                  columns={depreciationColumns}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                />
              ),
            },
            {
              key: 'changes',
              label: `变动记录 (${assetChanges.length})`,
              children: (
                <Table
                  rowKey="id"
                  dataSource={assetChanges}
                  columns={changeColumns}
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
    </div>
  )
}
