'use client'

import { useState, useEffect } from "react"
import { Table, Button, Tag, Drawer, Timeline, Space, Input, Select, message } from "antd"
import { EyeOutlined, HistoryOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"

interface Sample {
  id: string
  sampleNo: string
  name: string
  specification: string | null
  quantity: string | null
  unit: string | null
  storageLocation: string | null
  status: string
  receiptDate: string | null
  source: string | null
  supplierName?: string
  clientName?: string
  requisitions?: SampleRequisition[]
}

interface SampleRequisition {
  id: string
  requisitionNo: string
  requisitionBy: string
  requisitionDate: string
  returnDate: string | null
  status: string
  quantity: string
  remark: string | null
}

const statusMap: Record<string, { text: string; color: string }> = {
  received: { text: "已收样", color: "success" },
  allocated: { text: "已分配", color: "processing" },
  testing: { text: "检测中", color: "blue" },
  completed: { text: "已完成", color: "default" },
  returned: { text: "已归还", color: "default" },
  destroyed: { text: "已销毁", color: "error" },
}

const requisitionStatusMap: Record<string, { text: string; color: string }> = {
  requisitioned: { text: "借出中", color: "processing" },
  returned: { text: "已归还", color: "success" },
  overdue: { text: "逾期未还", color: "error" },
}

export default function SampleDetailsPage() {
  const [data, setData] = useState<Sample[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null)

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: "10",
      ...(keyword && { keyword }),
      ...(statusFilter && { status: statusFilter }),
    })
    try {
      const res = await fetch(`/api/sample/details?${params}`)
      const json = await res.json()
      setData(json.list || [])
      setTotal(json.total || 0)
    } catch (error) {
      message.error("获取数据失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page, keyword, statusFilter])

  const handleViewDetails = (record: Sample) => {
    setSelectedSample(record)
    setDrawerOpen(true)
  }

  const columns: ColumnsType<Sample> = [
    { title: "样品编号", dataIndex: "sampleNo", width: 150, fixed: "left" as const },
    { title: "样品名称", dataIndex: "name", width: 150 },
    { title: "规格型号", dataIndex: "specification", width: 120 },
    { title: "数量", dataIndex: "quantity", width: 80, render: (v, r) => v ? `${v} ${r.unit || ""}`.trim() : "-" },
    { title: "存放位置", dataIndex: "storageLocation", width: 120 },
    { title: "来源", dataIndex: "source", width: 100 },
    { title: "供应商/客户", width: 120, render: (_, r) => r.supplierName || r.clientName || "-" },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>,
    },
    {
      title: "收样日期",
      dataIndex: "receiptDate",
      width: 120,
      render: (d) => d ? dayjs(d).format("YYYY-MM-DD") : "-",
    },
    {
      title: "操作",
      width: 120,
      fixed: "right" as const,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetails(record)}>
            详情
          </Button>
        </Space>
      ),
    },
  ]

  const renderRequisitionTimeline = (requisitions: SampleRequisition[] = []) => {
    if (requisitions.length === 0) {
      return <div className="text-gray-400">暂无借还记录</div>
    }

    return (
      <Timeline
        items={requisitions.map((req) => ({
          color: req.status === "overdue" ? "red" : req.status === "returned" ? "green" : "blue",
          children: (
            <div key={req.id} className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{req.requisitionNo}</div>
                  <div className="text-sm text-gray-500">
                    借用人: {req.requisitionBy} | 数量: {req.quantity}
                  </div>
                  {req.remark && <div className="text-sm text-gray-500">备注: {req.remark}</div>}
                </div>
                <Tag color={requisitionStatusMap[req.status]?.color}>
                  {requisitionStatusMap[req.status]?.text}
                </Tag>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                借出: {dayjs(req.requisitionDate).format("YYYY-MM-DD")}
                {req.returnDate && ` | 归还: ${dayjs(req.returnDate).format("YYYY-MM-DD")}`}
              </div>
            </div>
          ),
        }))}
      />
    )
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex gap-4">
        <Input
          placeholder="搜索样品编号/名称"
          style={{ width: 200 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => fetchData(1)}
          allowClear
        />
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 120 }}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v)}
        >
          <Select.Option value="received">已收样</Select.Option>
          <Select.Option value="allocated">已分配</Select.Option>
          <Select.Option value="testing">检测中</Select.Option>
          <Select.Option value="completed">已完成</Select.Option>
          <Select.Option value="returned">已归还</Select.Option>
          <Select.Option value="destroyed">已销毁</Select.Option>
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          onChange: (p) => setPage(p),
          showSizeChanger: false,
        }}
      />

      <Drawer
        title="样品详情"
        width={600}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedSample && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">基本信息</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">样品编号:</span> {selectedSample.sampleNo}</div>
                <div><span className="text-gray-500">样品名称:</span> {selectedSample.name}</div>
                <div><span className="text-gray-500">规格型号:</span> {selectedSample.specification || "-"}</div>
                <div><span className="text-gray-500">数量:</span> {selectedSample.quantity ? `${selectedSample.quantity} ${selectedSample.unit || ""}`.trim() : "-"}</div>
                <div><span className="text-gray-500">存放位置:</span> {selectedSample.storageLocation || "-"}</div>
                <div><span className="text-gray-500">来源:</span> {selectedSample.source || "-"}</div>
                <div><span className="text-gray-500">供应商/客户:</span> {selectedSample.supplierName || selectedSample.clientName || "-"}</div>
                <div>
                  <span className="text-gray-500">状态:</span>{" "}
                  <Tag color={statusMap[selectedSample.status]?.color}>
                    {statusMap[selectedSample.status]?.text}
                  </Tag>
                </div>
                <div><span className="text-gray-500">收样日期:</span> {selectedSample.receiptDate ? dayjs(selectedSample.receiptDate).format("YYYY-MM-DD") : "-"}</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <HistoryOutlined />
                借还记录
              </h3>
              {renderRequisitionTimeline(selectedSample.requisitions)}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
