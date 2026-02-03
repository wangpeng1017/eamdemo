# -*- coding: utf-8 -*-
content = """// @file: 检测合同管理页面
// @input: /api/contract, /api/client, /api/user
// @output: 合同CRUD、生成PDF、生成委托单
// @pos: 委托流程核心页 - 报价后签合同
// ⚠️ 更新我时，请同步更新本注释及 entrustment/_INDEX.md

'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError, showWarningMessage } from '@/lib/confirm'
import { Table, Button, Space, Form, Input, Select, Drawer, Tag, Popconfirm, Tabs, Descriptions, Divider } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, FilePdfOutlined, FileAddOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

interface Contract {
  id: string
  contractNo: string
  contractName: string | null
  quotationId?: string | null
  quotationNo?: string | null
  partyACompany: string | null  // 甲方公司名称
  clientName: string | null  // 兼容字段，从 client.name 或 partyACompany 获取
  clientContact?: string | null
  clientPhone?: string | null
  clientAddress?: string | null
  amount: number | null
  prepaymentAmount?: number | null
  prepaymentRatio?: number | null
  signDate: string | null
  startDate: string | null
  endDate: string | null
  paymentTerms?: string | null
  deliveryTerms?: string | null
  qualityTerms?: string | null
  confidentialityTerms?: string | null
  breachTerms?: string | null
  disputeTerms?: string | null
  otherTerms?: string | null
  attachmentUrl?: string | null
  remark?: string | null
  status: string
  createdAt: string
  items?: ContractItem[]
  client?: {
    id: string
    name: string
    contact?: string
    phone?: string
    address?: string
  }
}

interface ContractItem {
  id?: string
  serviceItem: string
  methodStandard: string
  quantity: number
  unitPrice: number
  totalPrice: number
  sort?: number
}

interface Client {
  id: string
  name: string
  shortName?: string
  contact?: string
  phone?: string
  email?: string
  address?: string
}

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'signed', label: '已签订' },
  { value: 'executing', label: '执行中' },
  { value: 'completed', label: '已完成' },
  { value: 'terminated', label: '已终止' },
]

export default function ContractPage() {
  const router = useRouter()
  const [data, setData] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  // State
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [currentContract, setCurrentContract] = useState<Contract | null>(null)
  const [filters, setFilters] = useState<any>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const fetchData = async (p = page, f = filters) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: '10',
      ...Object.fromEntries(Object.entries(f).filter(([_, v]) => v !== undefined && v !== ''),
    }),
    const res = await fetch(`/api/contract?${params}`)
    const json = await res.json()
    if (json.success && json.data) {
      setData(json.data.list || [])
      setTotal(json.data.total || 0)
    } else {
      if (json.success && json.data) {
"""

with open('/Users/wangpeng/Downloads/limsnext/_fix_contract_header.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Header file written')
