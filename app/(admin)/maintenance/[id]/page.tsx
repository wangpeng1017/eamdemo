/**
 * @file page.tsx
 * @desc 保养任务详情页面
 */
'use client'

import { useParams, useRouter } from 'next/navigation'
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Timeline,
  List,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { mockMaintenanceTasks, mockMaintenancePlans } from '@/data/maintenance-data'
import { maintenanceTypeMap, maintenanceStatusMap, maintenancePriorityMap } from '@/lib/maintenance-types'
import dayjs from 'dayjs'

export default function MaintenanceTaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const task = mockMaintenanceTasks.find((t) => t.id === params.id)
  const plan = task ? mockMaintenancePlans.find((p) => p.id === task.planId) : null

  if (!task) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <h2>任务不存在</h2>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    )
  }

  // 时间轴数据
  const timelineItems = [
    { children: `创建时间：${dayjs(task.createdAt).format('YYYY-MM-DD HH:mm')}` },
    { children: `计划时间：${dayjs(task.scheduledDate).format('YYYY-MM-DD')}` },
    ...(task.startTime
      ? [{ children: `开始时间：${dayjs(task.startTime).format('YYYY-MM-DD HH:mm')}` }]
      : []
    ),
    ...(task.endTime
      ? [{ children: `完成时间：${dayjs(task.endTime).format('YYYY-MM-DD HH:mm')}` }]
      : []
    ),
    ...(task.verifyTime
      ? [{ children: `验收时间：${dayjs(task.verifyTime).format('YYYY-MM-DD HH:mm')} - 验收人：${task.verifier}` }]
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
            {task.taskNo}
          </h2>
          <Tag color={maintenanceStatusMap[task.status].color}>
            {maintenanceStatusMap[task.status].label}
          </Tag>
          <Tag color={maintenancePriorityMap[task.priority].color}>
            {maintenancePriorityMap[task.priority].label}
          </Tag>
        </div>
        <Space>
          {task.status === 'scheduled' && (
            <Button type="primary" icon={<ClockCircleOutlined />}>
              开始执行
            </Button>
          )}
          {task.status === 'in_progress' && (
            <Button type="primary" icon={<CheckCircleOutlined />}>
              完成保养
            </Button>
          )}
          {task.status === 'completed' && !task.verifyResult && (
            <Button type="primary" icon={<CheckCircleOutlined />}>
              验收
            </Button>
          )}
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <Card title="任务信息" style={{ marginBottom: 16 }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="任务编号">{task.taskNo}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={maintenanceStatusMap[task.status].color}>
                  {maintenanceStatusMap[task.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="设备编码">{task.equipmentCode}</Descriptions.Item>
              <Descriptions.Item label="设备名称">{task.equipmentName}</Descriptions.Item>
              <Descriptions.Item label="保养类型">
                {maintenanceTypeMap[task.type]}
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={maintenancePriorityMap[task.priority].color}>
                  {maintenancePriorityMap[task.priority].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="保养内容" span={2}>
                {task.content}
              </Descriptions.Item>
              <Descriptions.Item label="保养标准" span={2}>
                {task.standard}
              </Descriptions.Item>
              <Descriptions.Item label="计划日期">
                {dayjs(task.scheduledDate).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="负责人">{task.responsiblePerson}</Descriptions.Item>
              {task.startTime && (
                <Descriptions.Item label="开始时间" span={2}>
                  {dayjs(task.startTime).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
              {task.endTime && (
                <>
                  <Descriptions.Item label="完成时间">
                    {dayjs(task.endTime).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                  <Descriptions.Item label="实际工时">{task.actualHours} 小时</Descriptions.Item>
                </>
              )}
            </Descriptions>
          </Card>

          {task.result && (
            <Card title="保养结果" style={{ marginBottom: 16 }}>
              <Descriptions bordered column={1}>
                <Descriptions.Item label="保养结果">{task.result}</Descriptions.Item>
                {task.findings && <Descriptions.Item label="发现问题">{task.findings}</Descriptions.Item>}
                {task.spareParts && <Descriptions.Item label="使用备件">{task.spareParts}</Descriptions.Item>}
              </Descriptions>
            </Card>
          )}

          <Card title="处理记录">
            <Timeline items={timelineItems} />
          </Card>
        </div>

        <div style={{ width: 400 }}>
          <Card title="关联计划">
            {plan && (
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="计划编号">{plan.planNo}</Descriptions.Item>
                <Descriptions.Item label="计划名称">{plan.name}</Descriptions.Item>
                <Descriptions.Item label="保养周期">
                  {plan.periodValue ? `${plan.periodValue}小时` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="预计工时">{plan.estimatedHours} 小时</Descriptions.Item>
                <Descriptions.Item label="下次保养">
                  {dayjs(plan.nextDate).format('YYYY-MM-DD')}
                </Descriptions.Item>
                {plan.lastDate && (
                  <Descriptions.Item label="上次保养">
                    {dayjs(plan.lastDate).format('YYYY-MM-DD')}
                  </Descriptions.Item>
                )}
              </Descriptions>
            )}
          </Card>

          {task.verifyResult && (
            <Card title="验收信息" style={{ marginTop: 16 }}>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="验收人">{task.verifier}</Descriptions.Item>
                <Descriptions.Item label="验收时间">
                  {task.verifyTime && dayjs(task.verifyTime).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="验收结果">
                  <Tag color={task.verifyResult === 'pass' ? '#2BA471' : '#D54941'}>
                    {task.verifyResult === 'pass' ? '验收通过' : '验收不通过'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
