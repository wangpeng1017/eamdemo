'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Tag, Form, Input, Select, DatePicker, Drawer, Descriptions, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Device {
  id: string
  deviceNo: string
  name: string
  model: string | null
  manufacturer: string | null
  serialNumber: string | null
  location: string | null
  status: string
  calibrationDate: string | null
  nextCalibration: string | null
  remark: string | null
  createdAt: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  normal: { text: '正常', color: 'success' },
  maintenance: { text: '维护中', color: 'warning' },
  scrapped: { text: '已报废', color: 'error' },
}

export default function DevicePage() {
  const router = useRouter()
  const [data, setData] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // 查看抽屉状态
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null)

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/device?page=${p}&pageSize=10`)
    const json = await res.json()
    if (json.success && json.data) {
      setData(json.data.list || [])
      setTotal(json.data.total || 0)
    } else {
      setData(json.list || [])
      setTotal(json.total || 0)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page])

  const handleAdd = () => {
    router.push('/device/create')
  }

  const handleView = (record: Device) => {
    setCurrentDevice(record)
    setViewDrawerOpen(true)
  }

  const handleEdit = (record: Device) => {
    router.push(`/device/edit/${record.id}`)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/device/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      showSuccess('删除成功')
      fetchData()
    } else {
      showError(json.error?.message || '删除失败')
    }
  }

  const columns: ColumnsType<Device> = [
    { title: '设备编号', dataIndex: 'deviceNo', width: 150 },
    { title: '设备名称', dataIndex: 'name' },
    { title: '型号', dataIndex: 'model', width: 120 },
    { title: '制造商', dataIndex: 'manufacturer', width: 120 },
    { title: '存放位置', dataIndex: 'location', width: 120 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>
    },
    {
      title: '下次校准', dataIndex: 'nextCalibration', width: 120,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-'
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '操作', fixed: 'right',
      render: (_, record) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除该设备？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>设备管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增设备</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
      />

      {/* 查看抽屉 */}
      <Drawer
        title="设备详情"
        placement="right"
        width={800}
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
      >
        {currentDevice && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="设备编号">{currentDevice.deviceNo}</Descriptions.Item>
            <Descriptions.Item label="设备名称">{currentDevice.name}</Descriptions.Item>
            <Descriptions.Item label="型号">{currentDevice.model || '-'}</Descriptions.Item>
            <Descriptions.Item label="制造商">{currentDevice.manufacturer || '-'}</Descriptions.Item>
            <Descriptions.Item label="出厂编号">{currentDevice.serialNumber || '-'}</Descriptions.Item>
            <Descriptions.Item label="存放位置">{currentDevice.location || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[currentDevice.status]?.color}>
                {statusMap[currentDevice.status]?.text || currentDevice.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="上次校准日期">
              {currentDevice.calibrationDate ? dayjs(currentDevice.calibrationDate).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="下次校准日期">
              {currentDevice.nextCalibration ? dayjs(currentDevice.nextCalibration).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(currentDevice.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {currentDevice.remark || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}
