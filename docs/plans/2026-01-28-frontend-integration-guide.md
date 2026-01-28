# 前端UI集成指南

> 版本: 1.0 | 更新: 2026-01-28
> 面向前端开发人员的组件使用文档

---

## 📦 新增组件清单

### 通用组件

| 组件名 | 文件路径 | 功能说明 |
|--------|----------|----------|
| RejectModal | @/components/RejectModal.tsx | 审批驳回对话框 |
| CreateEntrustmentButton | @/components/CreateEntrustmentButton.tsx | 报价单生成委托单按钮 |
| ClientApprovalButtons | @/components/ClientApprovalButtons.tsx | 业务单位审批按钮组 |
| QuotationPDFButton | @/components/QuotationPDFButton.tsx | PDF打印按钮（带状态控制） |

---

## 🎯 组件使用示例

### 1. RejectModal - 驳回对话框

**功能：** 通用的审批驳回对话框，支持4种单据类型

**适用页面：** 报价单列表、合同列表、委托单列表、客户管理

**完整示例：**
```tsx
'use client'

import { useState } from 'react'
import { Table, Button, Space } from 'antd'
import { RejectModal } from '@/components/RejectModal'

export function QuotationListPage() {
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null)
  const [data, setData] = useState([])

  // 刷新列表
  const fetchList = async () => {
    const response = await fetch('/api/quotation')
    const result = await response.json()
    setData(result.data)
  }

  const columns = [
    {
      title: '报价单号',
      dataIndex: 'quotationNo',
      key: 'quotationNo'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, string> = {
          draft: '草稿',
          pending: '审批中',
          approved: '已通过',
          rejected: '已驳回'
        }
        return statusMap[status] || status
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {/* 只有pending状态显示驳回按钮 */}
          {record.status === 'pending' && (
            <Button
              danger
              onClick={() => {
                setSelectedQuotation(record)
                setRejectModalVisible(true)
              }}
            >
              驳回
            </Button>
          )}

          {/* 其他操作按钮... */}
        </Space>
      )
    }
  ]

  return (
    <>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
      />

      {/* 驳回对话框 */}
      <RejectModal
        visible={rejectModalVisible}
        documentId={selectedQuotation?.id}
        documentType="quotation"  // 或 'contract' | 'entrustment' | 'client'
        onSuccess={() => {
          fetchList()  // 刷新列表
        }}
        onCancel={() => {
          setRejectModalVisible(false)
          setSelectedQuotation(null)
        }}
      />
    </>
  )
}
```

---

### 2. CreateEntrustmentButton - 生成委托单按钮

**功能：** 从报价单直接生成委托单（跳过合同）

**适用页面：** 报价单详情页、报价单列表

**完整示例：**
```tsx
'use client'

import { useState } from 'react'
import { Table } from 'antd'
import { CreateEntrustmentButton } from '@/components/CreateEntrustmentButton'
import { QuotationPDFButton } from '@/components/QuotationPDFButton'

export function QuotationListPage() {
  const [data, setData] = useState([])

  const columns = [
    {
      title: '报价单号',
      dataIndex: 'quotationNo',
      key: 'quotationNo'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {/* 生成委托单按钮 */}
          <CreateEntrustmentButton
            quotationId={record.id}
            quotationStatus={record.status}
            onSuccess={(entrustmentId, entrustmentNo) => {
              console.log('委托单创建成功:', entrustmentNo)
              // 可以跳转到委托单详情页
              // router.push(`/entrustment/${entrustmentId}`)
              // 或者刷新列表
              fetchList()
            }}
          />

          {/* PDF打印按钮 */}
          <QuotationPDFButton
            quotationId={record.id}
            quotationStatus={record.status}
          />

          {/* 其他操作... */}
        </Space>
      )
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
    />
  )
}
```

**在报价单详情页使用：**
```tsx
'use client'

import { Button, Space, Descriptions } from 'antd'
import { CreateEntrustmentButton, QuotationPDFButton } from '@/components'
import { useRouter } from 'next/navigation'

export default function QuotationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [quotation, setQuotation] = useState<any>(null)

  // 获取报价单详情
  useEffect(() => {
    fetch(`/api/quotation/${params.id}`)
      .then(res => res.json())
      .then(result => setQuotation(result.data))
  }, [params.id])

  if (!quotation) return <div>加载中...</div>

  return (
    <div>
      <Descriptions title="报价单信息" bordered>
        <Descriptions.Item label="报价单号">
          {quotation.quotationNo}
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          {quotation.status}
        </Descriptions.Item>
        {/* 其他字段... */}
      </Descriptions>

      {/* 操作按钮组 */}
      <Space style={{ marginTop: 16 }}>
        <CreateEntrustmentButton
          quotationId={quotation.id}
          quotationStatus={quotation.status}
          onSuccess={(entrustmentId) => {
            message.success('委托单创建成功')
            router.push(`/entrustment/${entrustmentId}`)
          }}
        />

        <QuotationPDFButton
          quotationId={quotation.id}
          quotationStatus={quotation.status}
          buttonType="primary"
        />
      </Space>
    </div>
  )
}
```

---

### 3. QuotationPDFButton - PDF打印按钮

**功能：** 根据报价单状态控制是否可以打印PDF

**适用页面：** 报价单列表、报价单详情页

**基础用法：**
```tsx
import { QuotationPDFButton } from '@/components/QuotationPDFButton'

<QuotationPDFButton
  quotationId={quotation.id}
  quotationStatus={quotation.status}
/>
```

**自定义样式：**
```tsx
<QuotationPDFButton
  quotationId={quotation.id}
  quotationStatus={quotation.status}
  buttonType="primary"    // 按钮类型
  size="large"            // 按钮大小
  showLabel={true}        // 是否显示文字
  icon={<FilePdfOutlined />}  // 自定义图标
/>
```

**在Table操作列使用图标按钮：**
```tsx
import { QuotationPDFIconButton } from '@/components/QuotationPDFButton'

const columns = [
  // ... 其他列
  {
    title: '操作',
    key: 'action',
    render: (_: any, record: any) => (
      <Space>
        <QuotationPDFIconButton
          quotationId={record.id}
          quotationStatus={record.status}
        />
      </Space>
    )
  }
]
```

---

### 4. ClientApprovalButtons - 业务单位审批按钮

**功能：** 业务单位的提交审批和审批通过按钮组

**适用页面：** 客户管理列表、客户详情页

**完整示例：**
```tsx
'use client'

import { useState } from 'react'
import { Table, Space } from 'antd'
import { ClientApprovalButtons } from '@/components/ClientApprovalButtons'

export function ClientListPage() {
  const [data, setData] = useState([])

  const columns = [
    {
      title: '客户名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, string> = {
          draft: '草稿',
          pending: '审批中',
          approved: '已通过',
          rejected: '已驳回'
        }
        return statusMap[status] || status
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {/* 审批按钮组 */}
          <ClientApprovalButtons
            clientId={record.id}
            clientStatus={record.status}
            onSuccess={() => {
              console.log('审批操作成功')
              fetchList()  // 刷新列表
            }}
            showLabel={true}  // 是否显示按钮文字
          />

          {/* 其他操作按钮... */}
        </Space>
      )
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
    />
  )
}
```

**只显示图标（无文字）：**
```tsx
<ClientApprovalButtons
  clientId={record.id}
  clientStatus={record.status}
  onSuccess={fetchList}
  showLabel={false}  // 不显示文字，只显示图标
/>
```

---

## 🔧 实际集成步骤

### 步骤1：修改报价单列表页面

**文件：** `src/app/(dashboard)/entrustment/quotation/page.tsx`

**修改位置：** Table的columns定义中的操作列

**添加以下代码：**

```tsx
// 1. 导入新组件
import { RejectModal } from '@/components/RejectModal'
import { CreateEntrustmentButton } from '@/components/CreateEntrustmentButton'
import { QuotationPDFButton } from '@/components/QuotationPDFButton'

// 2. 添加状态管理
const [rejectModalVisible, setRejectModalVisible] = useState(false)
const [selectedQuotation, setSelectedQuotation] = useState<any>(null)

// 3. 在columns中添加操作列
const columns = [
  // ... 其他列定义

  {
    title: '操作',
    key: 'action',
    fixed: 'right',
    width: 280,
    render: (_: any, record: any) => (
      <Space size="small">
        {/* 查看详情 */}
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleView(record)}
        >
          查看
        </Button>

        {/* 生成委托单 - 新功能 */}
        <CreateEntrustmentButton
          quotationId={record.id}
          quotationStatus={record.status}
          onSuccess={() => fetchQuotations()}
          buttonText="生成委托单"
          icon={<FileTextOutlined />}
        />

        {/* 打印PDF - 新功能（带状态控制） */}
        <QuotationPDFButton
          quotationId={record.id}
          quotationStatus={record.status}
          buttonType="link"
          size="small"
        />

        {/* 驳回 - 新功能 */}
        {record.status === 'pending' && (
          <Button
            type="link"
            danger
            onClick={() => {
              setSelectedQuotation(record)
              setRejectModalVisible(true)
            }}
          >
            驳回
          </Button>
        )}
      </Space>
    )
  }
]

// 4. 在组件return中添加RejectModal
return (
  <div>
    {/* 现有内容... */}

    {/* 驳回对话框 */}
    <RejectModal
      visible={rejectModalVisible}
      documentId={selectedQuotation?.id}
      documentType="quotation"
      onSuccess={() => {
        fetchQuotations()
        setSelectedQuotation(null)
      }}
      onCancel={() => {
        setRejectModalVisible(false)
        setSelectedQuotation(null)
      }}
    />
  </div>
)
```

### 步骤2：修改客户管理页面

**文件：** `src/app/(dashboard)/basic-data/client/page.tsx`（或类似路径）

**修改位置：** Table的columns定义中的操作列

**添加以下代码：**

```tsx
// 1. 导入新组件
import { ClientApprovalButtons } from '@/components/ClientApprovalButtons'

// 2. 在columns中添加操作列
const columns = [
  // ... 其他列定义

  {
    title: '操作',
    key: 'action',
    fixed: 'right',
    width: 200,
    render: (_: any, record: any) => (
      <Space size="small">
        {/* 编辑 */}
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>

        {/* 审批按钮组 - 新功能 */}
        <ClientApprovalButtons
          clientId={record.id}
          clientStatus={record.status}
          onSuccess={() => fetchClients()}
          showLabel={true}
        />

        {/* 删除 */}
        <Popconfirm
          title="确定要删除吗？"
          onConfirm={() => handleDelete(record.id)}
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      </Space>
    )
  }
]
```

### 步骤3：修改委托单列表页面（可选）

**功能：** 添加驳回功能到委托单列表

```tsx
import { RejectModal } from '@/components/RejectModal'

// 在操作列添加驳回按钮
{record.status === 'pending' && (
  <Button
    type="link"
    danger
    onClick={() => {
      setSelectedEntrustment(record)
      setRejectModalVisible(true)
    }}
  >
    驳回
  </Button>
)}

// 添加RejectModal组件
<RejectModal
  visible={rejectModalVisible}
  documentId={selectedEntrustment?.id}
  documentType="entrustment"
  onSuccess={() => {
    fetchEntrustments()
    setSelectedEntrustment(null)
  }}
  onCancel={() => {
    setRejectModalVisible(false)
    setSelectedEntrustment(null)
  }}
/>
```

---

## 📊 完整页面示例

### 报价单管理页面（集成所有新功能）

```tsx
'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  message,
  Card,
  Tag,
  Tooltip,
  Popconfirm
} from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { RejectModal } from '@/components/RejectModal'
import { CreateEntrustmentButton } from '@/components/CreateEntrustmentButton'
import { QuotationPDFButton } from '@/components/QuotationPDFButton'

interface Quotation {
  id: string
  quotationNo: string
  clientName?: string
  totalAmount: number
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'archived'
  createdAt: string
}

export default function QuotationManagementPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Quotation[]>([])
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)

  // 获取报价单列表
  const fetchQuotations = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/quotation')
      const result = await response.json()
      if (result.success) {
        setData(result.data || [])
      }
    } catch (error) {
      message.error('获取报价单列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotations()
  }, [])

  // 状态渲染
  const renderStatus = (status: string) => {
    const statusConfig: Record<string, { text: string; color: string }> = {
      draft: { text: '草稿', color: 'default' },
      pending: { text: '审批中', color: 'processing' },
      approved: { text: '已通过', color: 'success' },
      rejected: { text: '已驳回', color: 'error' },
      archived: { text: '已归档', color: 'default' }
    }
    const config = statusConfig[status] || { text: status, color: 'default' }
    return <Tag color={config.color}>{config.text}</Tag>
  }

  const columns = [
    {
      title: '报价单号',
      dataIndex: 'quotationNo',
      key: 'quotationNo',
      width: 150
    },
    {
      title: '客户名称',
      dataIndex: 'clientName',
      key: 'clientName',
      ellipsis: true
    },
    {
      title: '金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      render: (amount: number) => `¥${amount?.toFixed(2) || '0.00'}`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: renderStatus
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 320,
      render: (_: any, record: Quotation) => (
        <Space size="small" wrap>
          {/* 查看详情 */}
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => console.log('查看详情', record.id)}
          >
            查看
          </Button>

          {/* 编辑（只允许草稿状态） */}
          {record.status === 'draft' && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => console.log('编辑', record.id)}
            >
              编辑
            </Button>
          )}

          {/* 生成委托单 - 新功能 */}
          <CreateEntrustmentButton
            quotationId={record.id}
            quotationStatus={record.status}
            onSuccess={() => {
              message.success('委托单创建成功')
              fetchQuotations()
            }}
            buttonText="生成委托单"
            icon={<FileTextOutlined />}
          />

          {/* 打印PDF - 新功能（带状态控制） */}
          <QuotationPDFButton
            quotationId={record.id}
            quotationStatus={record.status}
            buttonType="link"
            size="small"
          />

          {/* 驳回 - 新功能 */}
          {record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => {
                setSelectedQuotation(record)
                setRejectModalVisible(true)
              }}
            >
              驳回
            </Button>
          )}

          {/* 删除（只允许草稿状态） */}
          {record.status === 'draft' && (
            <Popconfirm
              title="确定要删除此报价单吗？"
              onConfirm={async () => {
                try {
                  await fetch(`/api/quotation/${record.id}`, {
                    method: 'DELETE'
                  })
                  message.success('删除成功')
                  fetchQuotations()
                } catch (error) {
                  message.error('删除失败')
                }
              }}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  return (
    <Card>
      {/* 工具栏 */}
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => console.log('新建报价单')}
        >
          新建报价单
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchQuotations}
          loading={loading}
        >
          刷新
        </Button>
      </Space>

      {/* 报价单列表 */}
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`
        }}
      />

      {/* 驳回对话框 */}
      <RejectModal
        visible={rejectModalVisible}
        documentId={selectedQuotation?.id}
        documentType="quotation"
        onSuccess={() => {
          fetchQuotations()
          setSelectedQuotation(null)
        }}
        onCancel={() => {
          setRejectModalVisible(false)
          setSelectedQuotation(null)
        }}
      />
    </Card>
  )
}
```

---

## 🎨 样式定制

### 修改按钮样式

所有组件都支持通过props自定义样式：

```tsx
<CreateEntrustmentButton
  quotationId={id}
  quotationStatus={status}
  buttonText="生成委托单"  // 自定义按钮文字
  icon={<CustomIcon />}     // 自定义图标
/>

<QuotationPDFButton
  quotationId={id}
  quotationStatus={status}
  buttonType="primary"     // primary | default | link | text
  size="large"             // small | middle | large
/>

<ClientApprovalButtons
  clientId={id}
  clientStatus={status}
  showLabel={false}        // 只显示图标，不显示文字
/>
```

### 自定义Modal标题

```tsx
<RejectModal
  visible={visible}
  documentId={id}
  documentType="quotation"
  title="自定义标题"        // 覆盖默认标题
  onSuccess={onSuccess}
  onCancel={onCancel}
/>
```

---

## ⚠️ 注意事项

### 1. 状态映射

**重要：** 确保前端状态值与后端API一致

```tsx
// ✅ 正确的状态值
type QuotationStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived'
type ClientStatus = 'draft' | 'pending' | 'approved' | 'rejected'

// ❌ 错误：不要使用中文或其他格式
const status = '草稿'  // 错误！应该用 'draft'
```

### 2. 权限控制

根据用户角色显示不同的操作按钮：

```tsx
const { data: session } = useSession()
const isAdmin = session?.user?.role === 'admin'

{isAdmin && (
  <ClientApprovalButtons
    clientId={record.id}
    clientStatus={record.status}
    onSuccess={fetchList}
  />
)}
```

### 3. 错误处理

所有组件都有内置的错误处理，但你可以通过onSuccess回调自定义：

```tsx
<CreateEntrustmentButton
  quotationId={id}
  quotationStatus={status}
  onSuccess={(entrustmentId, entrustmentNo) => {
    // 自定义成功后的操作
    message.success(`委托单 ${entrustmentNo} 已创建`)
    router.push(`/entrustment/${entrustmentId}`)
  }}
/>
```

---

## 🧪 测试清单

集成后请测试以下功能：

### 报价单页面测试

- [ ] 草稿状态：显示"编辑"、"删除"按钮，不显示"生成委托单"、"驳回"
- [ ] 审批中状态：显示"驳回"按钮，不显示"生成委托单"、"打印PDF"
- [ ] 已通过状态：显示"生成委托单"、"打印PDF"按钮
- [ ] 已驳回状态：不显示"生成委托单"、"打印PDF"、"驳回"
- [ ] 点击"生成委托单"：弹出成功Modal，显示委托单号
- [ ] 点击"驳回"：弹出驳回对话框，输入原因后驳回成功

### PDF打印测试

- [ ] 草稿状态：点击按钮显示提示"报价单为草稿状态"
- [ ] 审批中状态：点击按钮显示提示"报价单正在审批中"
- [ ] 已通过状态：点击按钮打开新窗口显示PDF
- [ ] 已驳回状态：点击按钮显示提示"报价单已被驳回"

### 客户管理页面测试

- [ ] 草稿状态：显示"提交"按钮
- [ ] 审批中状态：显示"审批通过"按钮
- [ ] 已通过状态：不显示审批按钮
- [ ] 已驳回状态：显示"提交"按钮
- [ ] 点击"提交"：弹出Modal，确认后状态变为pending
- [ ] 点击"审批通过"：弹出Modal，确认后状态变为approved

---

## 📚 相关文档

- **API文档：** `docs/plans/2026-01-28-api-guide.md`
- **部署指南：** `docs/plans/2026-01-28-deployment-guide.md`
- **设计文档：** `docs/plans/2026-01-28-business-workflow-enhancement-design.md`

---

**完成集成后，请进行完整的功能测试，确保所有按钮和交互正常工作。**
