'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Table, Button, Modal, Form, Input, Select, message, Space, Tag, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowRightOutlined, ReloadOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

interface ApprovalNode {
  id: string
  name: string
  type: 'role' | 'user' | 'department'
  targetId: string
  targetName: string
  order: number
}

interface ApprovalFlow {
  id: string
  name: string
  code: string
  businessType: string
  description: string | null
  status: boolean
  nodes: ApprovalNode[]
  createdAt: string
}

const businessTypes = [
  { value: 'quotation', label: '报价审批' },
  { value: 'contract', label: '合同审批' },
  { value: 'report', label: '报告审批' },
  { value: 'payment', label: '付款审批' },
  { value: 'purchase', label: '采购审批' },
  { value: 'leave', label: '请假审批' },
]

const nodeTypes = [
  { value: 'role', label: '角色' },
  { value: 'user', label: '指定用户' },
  { value: 'department', label: '部门负责人' },
]

export default function ApprovalFlowPage() {
  const [flows, setFlows] = useState<ApprovalFlow[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [nodeModalOpen, setNodeModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingFlow, setEditingFlow] = useState<ApprovalFlow | null>(null)
  const [editingNode, setEditingNode] = useState<ApprovalNode | null>(null)
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [nodeForm] = Form.useForm()

  // 下拉选项数据
  const [roles, setRoles] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [selectedNodeType, setSelectedNodeType] = useState<string>('role')

  // 加载审批流程列表
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/approval-flow')
      const data = await res.json()
      if (data.success) {
        setFlows(data.data.list)
      } else {
        message.error(data.message || '加载失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setLoading(false)
    }
  }, [])

  // 加载角色列表
  const loadRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/role')
      const data = await res.json()
      if (data.success) {
        setRoles(data.data.list || [])
      }
    } catch (error) {
      console.error('加载角色失败:', error)
    }
  }, [])

  // 加载用户列表
  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/user?pageSize=1000')
      const data = await res.json()
      if (data.success) {
        setUsers(data.data.list || [])
      }
    } catch (error) {
      console.error('加载用户失败:', error)
    }
  }, [])

  // 加载部门列表
  const loadDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/dept?tree=true')
      const data = await res.json()
      if (data.success) {
        // 扁平化树形结构为下拉选项
        const flattenDepts = (tree: any[]): any[] => {
          const result: any[] = []
          tree.forEach((dept) => {
            result.push({ id: dept.key, name: dept.title })
            if (dept.children) {
              result.push(...flattenDepts(dept.children))
            }
          })
          return result
        }
        setDepartments(flattenDepts(data.data || []))
      }
    } catch (error) {
      console.error('加载部门失败:', error)
    }
  }, [])

  useEffect(() => {
    loadData()
    loadRoles()
    loadUsers()
    loadDepartments()
  }, [loadData, loadRoles, loadUsers, loadDepartments])

  const handleAdd = () => {
    setEditingFlow(null)
    form.resetFields()
    form.setFieldsValue({ status: true })
    setModalOpen(true)
  }

  const handleEdit = (record: ApprovalFlow) => {
    setEditingFlow(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/approval-flow/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        message.success('删除成功')
        loadData()
      } else {
        message.error(data.message || '删除失败')
      }
    } catch {
      message.error('网络错误')
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)

    try {
      const url = editingFlow ? `/api/approval-flow/${editingFlow.id}` : '/api/approval-flow'
      const method = editingFlow ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          nodes: editingFlow?.nodes || [],
        }),
      })
      const data = await res.json()

      if (data.success) {
        message.success(editingFlow ? '更新成功' : '创建成功')
        setModalOpen(false)
        loadData()
      } else {
        message.error(data.message || '操作失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddNode = (flowId: string) => {
    setCurrentFlowId(flowId)
    setEditingNode(null)
    nodeForm.resetFields()
    setSelectedNodeType('role') // 重置为默认类型
    setNodeModalOpen(true)
  }

  const handleEditNode = (flowId: string, node: ApprovalNode) => {
    setCurrentFlowId(flowId)
    setEditingNode(node)
    nodeForm.setFieldsValue(node)
    setSelectedNodeType(node.type) // 设置当前节点类型
    setNodeModalOpen(true)
  }

  const handleDeleteNode = async (flowId: string, nodeId: string) => {
    const flow = flows.find(f => f.id === flowId)
    if (!flow) return

    const newNodes = flow.nodes.filter(n => n.id !== nodeId).map((n, i) => ({ ...n, order: i + 1 }))

    try {
      const res = await fetch(`/api/approval-flow/${flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: newNodes }),
      })
      const data = await res.json()
      if (data.success) {
        message.success('删除成功')
        loadData()
      } else {
        message.error(data.message || '删除失败')
      }
    } catch {
      message.error('网络错误')
    }
  }

  const handleNodeSubmit = async () => {
    const values = await nodeForm.validateFields()
    if (!currentFlowId) return

    const flow = flows.find(f => f.id === currentFlowId)
    if (!flow) return

    setSubmitting(true)
    try {
      let newNodes: ApprovalNode[]
      if (editingNode) {
        newNodes = flow.nodes.map(n => n.id === editingNode.id ? { ...n, ...values } : n)
      } else {
        const newNode: ApprovalNode = {
          ...values,
          id: `node-${Date.now()}`,
          order: flow.nodes.length + 1,
        }
        newNodes = [...flow.nodes, newNode]
      }

      const res = await fetch(`/api/approval-flow/${currentFlowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: newNodes }),
      })
      const data = await res.json()

      if (data.success) {
        message.success(editingNode ? '更新成功' : '添加成功')
        setNodeModalOpen(false)
        loadData()
      } else {
        message.error(data.message || '操作失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (record: ApprovalFlow) => {
    const newStatus = !record.status
    try {
      const res = await fetch(`/api/approval-flow/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        message.success(newStatus ? '已启用' : '已禁用')
        loadData()
      } else {
        message.error(data.message || '操作失败')
      }
    } catch {
      message.error('网络错误')
    }
  }

  const columns: ColumnsType<ApprovalFlow> = [
    { title: '流程名称', dataIndex: 'name', width: 150 },
    { title: '流程编码', dataIndex: 'code', width: 180 },
    {
      title: '业务类型',
      dataIndex: 'businessType',
      width: 100,
      render: (type: string) => {
        const item = businessTypes.find(b => b.value === type)
        return <Tag color="blue">{item?.label || type}</Tag>
      },
    },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    {
      title: '审批节点',
      key: 'nodes',
      width: 300,
      render: (_, record) => (
        <Space size={4}>
          {(record.nodes || []).map((node, index) => (
            <span key={node.id}>
              <Tag color="green">{node.targetName}</Tag>
              {index < record.nodes.length - 1 && <ArrowRightOutlined style={{ color: '#999' }} />}
            </span>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: boolean) => (
        <Tag color={status ? 'green' : 'red'}>{status ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => handleAddNode(record.id)}>添加节点</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          {record.status ? (
            <Popconfirm title="确认禁用?" onConfirm={() => handleToggleStatus(record)}>
              <Button size="small" icon={<StopOutlined />} danger>禁用</Button>
            </Popconfirm>
          ) : (
            <Popconfirm title="确认启用?" onConfirm={() => handleToggleStatus(record)}>
              <Button size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a' }}>启用</Button>
            </Popconfirm>
          )}
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const expandedRowRender = (record: ApprovalFlow) => {
    const nodeColumns: ColumnsType<ApprovalNode> = [
      { title: '顺序', dataIndex: 'order', width: 60 },
      { title: '节点名称', dataIndex: 'name' },
      {
        title: '审批类型',
        dataIndex: 'type',
        width: 100,
        render: (type: string) => {
          const item = nodeTypes.find(n => n.value === type)
          return <Tag>{item?.label || type}</Tag>
        },
      },
      { title: '审批人/角色', dataIndex: 'targetName' },
      {
        title: '操作',
        width: 80,
        render: (_, node) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEditNode(record.id, node)} />
            <Popconfirm title="确认删除?" onConfirm={() => handleDeleteNode(record.id, node.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ]

    return (
      <Table
        rowKey="id"
        columns={nodeColumns}
        dataSource={record.nodes || []}
        pagination={false}
        size="small"
      />
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>审批流程配置</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增流程
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={flows}
          loading={loading}
          expandable={{ expandedRowRender }}
          pagination={false}
        />
      </Card>

      {/* 流程编辑弹窗 */}
      <Modal
        title={editingFlow ? '编辑流程' : '新增流程'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="流程名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="流程编码">
            <Input placeholder="可选，系统自动生成" />
          </Form.Item>
          <Form.Item name="businessType" label="业务类型" rules={[{ required: true }]}>
            <Select options={businessTypes} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={true}>
            <Select
              options={[
                { value: true, label: '启用' },
                { value: false, label: '禁用' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 节点编辑弹窗 */}
      <Modal
        title={editingNode ? '编辑节点' : '添加节点'}
        open={nodeModalOpen}
        onOk={handleNodeSubmit}
        onCancel={() => setNodeModalOpen(false)}
        confirmLoading={submitting}
        width={500}
      >
        <Form form={nodeForm} layout="vertical">
          <Form.Item name="name" label="节点名称" rules={[{ required: true }]}>
            <Input placeholder="如: 销售经理审批" />
          </Form.Item>
          <Form.Item name="type" label="审批类型" rules={[{ required: true }]}>
            <Select
              options={nodeTypes}
              onChange={(value) => {
                setSelectedNodeType(value)
                // 切换类型时清空 targetId 和 targetName
                nodeForm.setFieldsValue({ targetId: undefined, targetName: '' })
              }}
            />
          </Form.Item>

          {/* 根据审批类型显示不同的选择器 */}
          {selectedNodeType === 'role' && (
            <>
              <Form.Item name="targetId" label="选择角色" rules={[{ required: true }]}>
                <Select
                  placeholder="请选择角色"
                  showSearch
                  optionFilterProp="label"
                  options={roles.map((role) => ({
                    value: role.code,
                    label: role.name,
                  }))}
                  onChange={(value, option) => {
                    nodeForm.setFieldsValue({ targetName: option.label })
                  }}
                />
              </Form.Item>
            </>
          )}

          {selectedNodeType === 'user' && (
            <>
              <Form.Item name="targetId" label="选择用户" rules={[{ required: true }]}>
                <Select
                  placeholder="请选择用户"
                  showSearch
                  optionFilterProp="label"
                  options={users.map((user) => ({
                    value: user.id,
                    label: `${user.name} (${user.phone || user.email || '无联系方式'})`,
                  }))}
                  onChange={(value, option) => {
                    nodeForm.setFieldsValue({ targetName: option.label })
                  }}
                />
              </Form.Item>
            </>
          )}

          {selectedNodeType === 'department' && (
            <>
              <Form.Item name="targetId" label="选择部门" rules={[{ required: true }]}>
                <Select
                  placeholder="请选择部门"
                  showSearch
                  optionFilterProp="label"
                  options={departments.map((dept) => ({
                    value: dept.id,
                    label: dept.name,
                  }))}
                  onChange={(value, option) => {
                    nodeForm.setFieldsValue({ targetName: `${option.label}负责人` })
                  }}
                />
              </Form.Item>
            </>
          )}

          <Form.Item name="targetName" label="显示名称" rules={[{ required: true }]}>
            <Input placeholder="自动填充，可修改" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
