'use client'

import { useState, useEffect, useCallback } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Card, Table, Tree, Button, Modal, Form, Input, Select, message, Space, Tag, Popconfirm, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { DataNode } from 'antd/es/tree'

interface Permission {
  id: string
  name: string
  code: string
  type: 'menu' | 'button' | 'api'
  parentId: string | null
  path: string | null
  icon: string | null
  sort: number
  status: number
  children?: Permission[]
}

interface Role {
  id: string
  name: string
  code: string
  description: string | null
  permissions: string[]
}

const typeOptions = [
  { value: 'menu', label: '菜单' },
  { value: 'button', label: '按钮' },
  { value: 'api', label: '接口' },
]

const typeColors: Record<string, string> = {
  menu: 'blue',
  button: 'green',
  api: 'orange',
}

export default function PermissionPage() {
  const [modal, modalContextHolder] = Modal.useModal()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [checkedKeys, setCheckedKeys] = useState<string[]>([])
  const [form] = Form.useForm()

  // 加载权限列表
  const loadPermissions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/permission')
      const data = await res.json()
      if (data.success) {
        setPermissions(data.data.list || [])
      } else {
        showError(data.message || '加载失败')
      }
    } catch {
      showError('网络错误')
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
      } else {
        setRoles(data.list || [])
      }
    } catch {
      // 加载失败不影响主功能
    }
  }, [])

  useEffect(() => {
    loadPermissions()
    loadRoles()
  }, [loadPermissions, loadRoles])

  // 构建树形数据
  const buildTree = (items: Permission[], parentId: string | null = null): Permission[] => {
    return items
      .filter(item => item.parentId === parentId)
      .sort((a, b) => a.sort - b.sort)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id),
      }))
  }

  // 转换为 Tree 组件需要的格式
  const convertToTreeData = (items: Permission[]): DataNode[] => {
    return items.map(item => ({
      key: item.id,
      title: (
        <span>
          {item.name}
          <Tag color={typeColors[item.type]} style={{ marginLeft: 8 }}>{item.type}</Tag>
          {item.path && <span style={{ color: '#999', marginLeft: 8 }}>{item.path}</span>}
        </span>
      ),
      children: item.children && item.children.length > 0 ? convertToTreeData(item.children) : undefined,
    }))
  }

  const treeData = convertToTreeData(buildTree(permissions))

  const handleAdd = (parentId: string | null = null) => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({ parentId, type: 'menu', sort: 0, status: 1 })
    setModalOpen(true)
  }

  const handleEdit = (record: Permission) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/permission/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        showSuccess('删除成功')
        loadPermissions()
      } else {
        showError(data.message || '删除失败')
      }
    } catch {
      showError('网络错误')
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)

    try {
      const url = editingId ? `/api/permission/${editingId}` : '/api/permission'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()

      if (data.success) {
        showSuccess(editingId ? '更新成功' : '创建成功')
        setModalOpen(false)
        loadPermissions()
      } else {
        showError(data.message || '操作失败')
      }
    } catch {
      showError('网络错误')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role)
    setCheckedKeys(role.permissions || [])
  }

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return

    try {
      const res = await fetch(`/api/role/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: checkedKeys }),
      })
      if (!res.ok) {
        modal.error({ title: '保存失败', content: `服务器错误（${res.status}），请稍后重试` })
        return
      }
      const data = await res.json()
      if (data.success !== false) {
        modal.success({ title: '保存成功', content: `${selectedRole.name} 的权限配置已保存` })
        loadRoles()
      } else {
        modal.error({ title: '保存失败', content: data.message || '保存失败' })
      }
    } catch {
      modal.error({ title: '保存失败', content: '网络错误，请稍后重试' })
    }
  }

  const roleColumns: ColumnsType<Role> = [
    { title: '角色名称', dataIndex: 'name' },
    {
      title: '操作', fixed: 'right',

      render: (_, record) => (
        <Button
          type={selectedRole?.id === record.id ? 'primary' : 'default'}
          size="small"
          onClick={() => handleRoleSelect(record)}
        >
          配置权限
        </Button>
      ),
    },
  ]

  const handleToggleStatus = async (record: Permission) => {
    const newStatus = record.status === 1 ? 0 : 1
    try {
      const res = await fetch(`/api/permission/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        showSuccess(newStatus === 1 ? '已启用' : '已禁用')
        loadPermissions()
      } else {
        showError(data.message || '操作失败')
      }
    } catch {
      showError('网络错误')
    }
  }

  const permissionColumns: ColumnsType<Permission> = [
    { title: '权限名称', dataIndex: 'name' },
    { title: '权限编码', dataIndex: 'code' },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (type: string) => <Tag color={typeColors[type]}>{type}</Tag>,
    },
    { title: '路径', dataIndex: 'path', ellipsis: true },
    { title: '排序', dataIndex: 'sort', width: 60 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'red'}>{status === 1 ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '操作', fixed: 'right',

      render: (_, record) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          {record.status === 1 ? (
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

  return (
    <div>
      {modalContextHolder}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>权限配置</h2>
        <Button icon={<ReloadOutlined />} onClick={() => { loadPermissions(); loadRoles() }}>刷新</Button>
      </div>

      <Row gutter={16}>
        <Col span={8}>
          <Card
            title="角色列表"
            size="small"
            extra={selectedRole && (
              <Button type="primary" size="small" icon={<SaveOutlined />} onClick={handleSaveRolePermissions}>
                保存权限
              </Button>
            )}
          >
            <Table
              rowKey="id"
              columns={roleColumns}
              dataSource={roles}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={16}>
          <Card
            title={selectedRole ? `配置权限 - ${selectedRole.name}` : '权限树'}
            size="small"
            loading={loading}
            extra={
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleAdd(null)}>
                新增权限
              </Button>
            }
          >
            {selectedRole ? (
              <Tree
                checkable
                defaultExpandAll
                checkedKeys={checkedKeys}
                onCheck={(checked) => setCheckedKeys(checked as string[])}
                treeData={treeData}
              />
            ) : (
              <Table
                rowKey="id"
                columns={permissionColumns}
                dataSource={buildTree(permissions)}
                pagination={false}
                size="small"
                expandable={{ defaultExpandAllRows: true }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingId ? '编辑权限' : '新增权限'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="权限名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="权限编码">
            <Input placeholder="可选，系统自动生成" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={typeOptions} />
          </Form.Item>
          <Form.Item name="parentId" label="上级权限">
            <Select
              allowClear
              placeholder="无上级"
              options={permissions.filter(p => p.type === 'menu').map(p => ({
                value: p.id,
                label: p.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="path" label="路径">
            <Input placeholder="菜单路径，如: /system/user" />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={[
                { value: 1, label: '启用' },
                { value: 0, label: '禁用' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
