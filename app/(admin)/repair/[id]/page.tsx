
/**
 * @file page.tsx
 * @desc 维修工单详情页面
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
  Timeline,
  Modal,
  Form,
  Input,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckCircleOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { mockRepairOrders, mockEquipments } from '@/data/mock-data'
import { repairStatusMap, repairPriorityMap, faultTypeMap } from '@/lib/types'
import dayjs from 'dayjs'

const { TextArea } = Input

export default function RepairDetailPage() {
  const params = useParams()
  const router = useRouter()
  const order = mockRepairOrders.find((o) => o.id === params.id)
  const equipment = order ? mockEquipments.find((e) => e.id === order.equipmentId) : null
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [form] = Form.useForm()

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <h2>工单不存在</h2>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    )
  }

  // 验收操作
  const handleVerify = () => {
    form.validateFields().then((values) => {
      message.success('验收完成，工单已关闭')
      setVerifyModalOpen(false)
      form.resetFields()
    })
  }

  // 时间轴数据
  const timelineItems = [
    { children: `报修时间：${dayjs(order.reportTime).format('YYYY-MM-DD HH:mm')}` },
    ...(order.assignTime
      ? [{ children: `派工时间：${dayjs(order.assignTime).format('YYYY-MM-DD HH:mm')} - 派工给：${order.assignee}` }]
      : []
    ),
    ...(order.startTime
      ? [{ children: `开始维修：${dayjs(order.startTime).format('YYYY-MM-DD HH:mm')}` }]
      : []
    ),
    ...(order.endTime
      ? [{ children: `完成维修：${dayjs(order.endTime).format('YYYY-MM-DD HH:mm')}` }]
      : []
    ),
    ...(order.verifyTime
      ? [{ children: `验收完成：${dayjs(order.verifyTime).format('YYYY-MM-DD HH:mm')} - 验收人：${order.verifier}` }]
      : []
    ),
  ]

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
            返回
          </Button>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#00405C', margin: 0 }}>
            {order.orderNo}
          </h2>
          <Tag color={repairStatusMap[order.status].color}>
            {repairStatusMap[order.status].label}
          </Tag>
          <Tag color={repairPriorityMap[order.priority].color}>
            {repairPriorityMap[order.priority].label}
          </Tag>
        </div>
        <Space>
          {order.status === 'pending' && (
            <Button type="primary" icon={<UserOutlined />}>
              派工
            </Button>
          )}
          {order.status === 'assigned' && (
            <Button type="primary">开始维修</Button>
          )}
          {order.status === 'processing' && (
            <Button type="primary">完成维修</Button>
          )}
          {order.status === 'completed' && (
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setVerifyModalOpen(true)}>
              验收
            </Button>
          )}
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
                  <Descriptions.Item label="工单编号">{order.orderNo}</Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Tag color={repairStatusMap[order.status].color}>
                      {repairStatusMap[order.status].label}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="设备编码">{order.equipmentCode}</Descriptions.Item>
                  <Descriptions.Item label="设备名称">{order.equipmentName}</Descriptions.Item>
                  <Descriptions.Item label="故障类型">
                    {faultTypeMap[order.faultType]}
                  </Descriptions.Item>
                  <Descriptions.Item label="优先级">
                    <Tag color={repairPriorityMap[order.priority].color}>
                      {repairPriorityMap[order.priority].label}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="故障描述" span={2}>
                    {order.faultDescription}
                  </Descriptions.Item>
                  <Descriptions.Item label="报修人">{order.reporter}</Descriptions.Item>
                  <Descriptions.Item label="报修时间">
                    {dayjs(order.reportTime).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                  {order.assignee && (
                    <>
                      <Descriptions.Item label="维修人员">{order.assignee}</Descriptions.Item>
                      <Descriptions.Item label="派工时间">
                        {dayjs(order.assignTime!).format('YYYY-MM-DD HH:mm:ss')}
                      </Descriptions.Item>
                    </>
                  )}
                  {order.startTime && (
                    <Descriptions.Item label="开始时间" span={2}>
                      {dayjs(order.startTime).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                  )}
                  {order.endTime && (
                    <>
                      <Descriptions.Item label="完成时间">
                        {dayjs(order.endTime).format('YYYY-MM-DD HH:mm:ss')}
                      </Descriptions.Item>
                      <Descriptions.Item label="工时">{order.laborHours} 小时</Descriptions.Item>
                    </>
                  )}
                  {order.cost && (
                    <Descriptions.Item label="维修费用" span={2}>
                      ¥{order.cost.toLocaleString()}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'repair',
            label: '维修记录',
            children: (
              <Card>
                {order.repairDescription ? (
                  <>
                    <Descriptions bordered column={1}>
                      <Descriptions.Item label="维修描述">{order.repairDescription}</Descriptions.Item>
                      <Descriptions.Item label="使用备件">{order.spareParts || '无'}</Descriptions.Item>
                      {order.laborHours && <Descriptions.Item label="工时">{order.laborHours} 小时</Descriptions.Item>}
                      {order.cost && <Descriptions.Item label="费用">¥{order.cost.toLocaleString()}</Descriptions.Item>}
                    </Descriptions>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    暂无维修记录
                  </div>
                )}
              </Card>
            ),
          },
          {
            key: 'timeline',
            label: '处理记录',
            children: (
              <Card>
                <Timeline items={timelineItems} />
              </Card>
            ),
          },
        ]}
      />

      {/* 验收弹窗 */}
      <Modal
        title="维修验收"
        open={verifyModalOpen}
        onOk={handleVerify}
        onCancel={() => {
          setVerifyModalOpen(false)
          form.resetFields()
        }}
        okText="验收通过"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item name="result" label="验收结果" rules={[{ required: true }]}>
            <Select placeholder="请选择验收结果">
              <Option value="pass">验收通过</Option>
              <Option value="fail">验收不通过</Option>
            </Select>
          </Form.Item>
          <Form.Item name="comment" label="验收意见" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="请填写验收意见" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function useState(arg0: boolean): [any, any] {
  return [arg0, () => {}]
}
