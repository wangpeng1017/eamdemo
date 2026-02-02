'use client'

import { useState, useEffect } from 'react'
import {
  Table, Button, Space, Tag, Modal, Form, Input, Select,
  Popconfirm, Row, Col, Card, Tree, Dropdown, MenuProps, Tooltip
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined,
  StopOutlined, ApartmentOutlined, MoreOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { DataNode } from 'antd/es/tree'
import dayjs from 'dayjs'
import { showConfirm, showSuccess, showError } from '@/lib/confirm'

interface Dept {
  id: string
  name: string
  parentId: string | null
  children?: Dept[]
}

interface Role {
  id: string
  name: string
  code: string
}

interface User {
  id: string
  username: string
  name: string
  phone: string | null
  email: string | null
  status: number
  deptId: string | null
  dept?: { name: string }
  createdAt: string
  roles: { role: { id: string, name: string } }[]
}

export default function UserPage() {
  // User State
  const [userData, setUserData] = useState<User[]>([])
  const [userLoading, setUserLoading] = useState(false)
  const [userTotal, setUserTotal] = useState(0)
  const [userPage, setUserPage] = useState(1)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)

  // Dept State
  const [deptTree, setDeptTree] = useState<DataNode[]>([])
  const [deptLoading, setDeptLoading] = useState(false)
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)
  const [deptModalOpen, setDeptModalOpen] = useState(false)
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null)
  const [parentDeptId, setParentDeptId] = useState<string | null>(null)

  // Role State
  const [roleList, setRoleList] = useState<Role[]>([])

  const [userForm] = Form.useForm()
  const [deptForm] = Form.useForm()

  // --- Initial Load ---
  useEffect(() => {
    fetchDeptTree()
    fetchUsers()
    fetchRoles()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [userPage, selectedDeptId])

  // --- Dept Actions ---
  const fetchDeptTree = async () => {
    setDeptLoading(true)
    try {
      const res = await fetch('/api/dept?tree=true')
      const json = await res.json()
      if (json.success) {
        setDeptTree(json.data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setDeptLoading(false)
    }
  }

  const handleAddDept = (parentId: string | null = null) => {
    setEditingDeptId(null)
    setParentDeptId(parentId)
    deptForm.resetFields()
    setDeptModalOpen(true)
  }

  const handleEditDept = (dept: any) => {
    setEditingDeptId(dept.id)
    setParentDeptId(dept.parentId)
    deptForm.setFieldsValue({ name: dept.title })
    setDeptModalOpen(true)
  }

  const handleDeleteDept = async (id: string) => {
    try {
      await fetch(`/api/dept/${id}`, { method: 'DELETE' })
      showSuccess('部门删除成功')
      fetchDeptTree()
      if (selectedDeptId === id) setSelectedDeptId(null)
    } catch (e) {
      showError('删除失败，可能包含子部门或用户')
    }
  }

  const handleDeptSubmit = async () => {
    const values = await deptForm.validateFields()
    const url = editingDeptId ? `/api/dept` : '/api/dept'

    // Note: PUT needs id in body based on my api impl
    const body = editingDeptId
      ? { ...values, id: editingDeptId }
      : { ...values, parentId: parentDeptId }

    const res = await fetch(url, {
      method: editingDeptId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (res.ok) {
      showSuccess(editingDeptId ? '更新成功' : '创建成功')
      setDeptModalOpen(false)
      fetchDeptTree()
    } else {
      showError('操作失败')
    }
  }

  // --- Role Actions ---
  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/role?pageSize=100')
      const json = await res.json()
      if (json.success) {
        setRoleList(json.data?.list || json.list || [])
      }
    } catch (e) {
      console.error('获取角色列表失败:', e)
    }
  }

  // --- User Actions ---
  const fetchUsers = async () => {
    setUserLoading(true)
    let url = `/api/user?page=${userPage}&pageSize=10`
    if (selectedDeptId) {
      url += `&deptId=${selectedDeptId}`
    }
    const res = await fetch(url)
    const json = await res.json()
    // Support both formats just in case
    const list = json.data?.list || json.list || []
    const total = json.data?.total || json.total || 0
    setUserData(list)
    setUserTotal(total)
    setUserLoading(false)
  }

  const handleAddUser = () => {
    setEditingUserId(null)
    userForm.resetFields()
    // 自动填入当前选中的部门
    if (selectedDeptId) {
      userForm.setFieldValue('deptId', selectedDeptId)
    }
    setUserModalOpen(true)
  }

  const handleEditUser = (record: User) => {
    setEditingUserId(record.id)
    // 提取用户当前角色ID
    const roleIds = record.roles?.map(r => r.role.id) || []
    userForm.setFieldsValue({
      ...record,
      password: '',
      roleIds // 设置角色ID数组
    })
    setUserModalOpen(true)
  }

  const handleUserSubmit = async () => {
    const values = await userForm.validateFields()

    // 自动生成用户名逻辑
    if (!editingUserId && !values.username) {
      values.username = values.phone || values.email?.split('@')[0] || `user_${Date.now()}`
    }

    const url = editingUserId ? `/api/user/${editingUserId}` : '/api/user'
    const method = editingUserId ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    })
    showSuccess(editingUserId ? '更新成功' : '创建成功')
    setUserModalOpen(false)
    fetchUsers()
  }

  const handleToggleStatus = async (record: User) => {
    const newStatus = record.status === 1 ? 0 : 1
    const res = await fetch(`/api/user/${record.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    if (res.ok) {
      showSuccess(newStatus === 1 ? '已启用' : '已禁用')
      fetchUsers()
    } else {
      showError('操作失败')
    }
  }

  const handleDeleteUser = async (id: string) => {
    const res = await fetch(`/api/user/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      showSuccess('删除成功')
      fetchUsers()
    } else {
      showError(json.error?.message || '删除失败')
    }
  }

  // --- Render Helpers ---
  const renderTreeTitle = (node: any) => {
    return (
      <div className="group flex items-center justify-between" style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
        <span>{node.title}</span>
        <span onClick={e => e.stopPropagation()}>
          <Dropdown
            menu={{
              items: [
                { key: 'add', label: '新增子部门', icon: <PlusOutlined />, onClick: () => handleAddDept(node.key) },
                { key: 'edit', label: '编辑部门', icon: <EditOutlined />, onClick: () => handleEditDept(node) },
                {
                  key: 'delete',
                  label: '删除部门',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => {
                    showConfirm(
                      '确认删除?',
                      '删除部门将同时删除其子部门，请谨慎操作。',
                      () => handleDeleteDept(node.key)
                    )
                  }
                },
              ]
            }}
            trigger={['click']}
          >
            <MoreOutlined className="dept-action-icon" style={{ marginLeft: 8, color: '#999' }} />
          </Dropdown>
        </span>
      </div>
    )
  }

  const columns: ColumnsType<User> = [
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    { title: '部门', dataIndex: ['dept', 'name'], width: 120, render: (t) => t || '-' },
    {
      title: '角色', dataIndex: 'roles', width: 150,
      render: (roles: User['roles']) => roles?.map(r => r.role.name).join(', ') || '-'
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (s: number) => <Tag color={s === 1 ? 'success' : 'error'}>{s === 1 ? '启用' : '禁用'}</Tag>
    },
    {
      title: '操作',
      fixed: 'right',
      render: (_, record) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditUser(record)} />
          {record.status === 1 ? (
            <Popconfirm title="确认禁用此用户?" onConfirm={() => handleToggleStatus(record)}>
              <Button size="small" icon={<StopOutlined />} danger>禁用</Button>
            </Popconfirm>
          ) : (
            <Popconfirm title="确认启用此用户?" onConfirm={() => handleToggleStatus(record)}>
              <Button size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a' }}>启用</Button>
            </Popconfirm>
          )}
          <Popconfirm title="确认删除?" onConfirm={() => handleDeleteUser(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  // Helper to flatten tree for Select options
  const flattenTree = (list: any[]): any[] => {
    return list.reduce((acc, item) => {
      acc.push({ label: item.title, value: item.key })
      if (item.children) acc.push(...flattenTree(item.children))
      return acc
    }, [])
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Row gutter={16} style={{ height: '100%' }}>
        {/* Left Tree */}
        <Col span={6}>
          <Card
            title="组织架构"
            bordered={false}
            extra={
              <Tooltip title="新增根部门">
                <Button type="text" icon={<PlusOutlined />} onClick={() => handleAddDept(null)} />
              </Tooltip>
            }
            style={{ height: '100%', overflow: 'hidden' }}
            bodyStyle={{ padding: '12px 0 0 12px', overflowY: 'auto', height: 'calc(100% - 56px)' }}
          >
            {deptTree.length > 0 ? (
              <Tree
                blockNode
                treeData={deptTree}
                titleRender={renderTreeTitle}
                selectedKeys={selectedDeptId ? [selectedDeptId] : []}
                onSelect={(keys) => setSelectedDeptId(keys[0] as string || null)}
                defaultExpandAll
              />
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>暂无部门</div>
            )}
          </Card>
        </Col>

        {/* Right Table */}
        <Col span={18}>
          <Card
            title={selectedDeptId ? "部门用户" : "所有用户"}
            bordered={false}
            extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>新增用户</Button>}
            style={{ height: '100%' }}
          >
            <Table
              rowKey="id"
              columns={columns}
              dataSource={userData}
              loading={userLoading}
              pagination={{ current: userPage, total: userTotal, onChange: setUserPage }}
            />
          </Card>
        </Col>
      </Row>

      {/* User Modal */}
      <Modal
        title={editingUserId ? '编辑用户' : '新增用户'}
        open={userModalOpen}
        onOk={handleUserSubmit}
        onCancel={() => setUserModalOpen(false)}
        width={500}
      >
        <Form form={userForm} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入用户姓名" />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input placeholder="请输入手机号(用于登录)" />
          </Form.Item>
          <Form.Item name="deptId" label="所属部门">
            <Select
              allowClear
              placeholder="请选择部门"
              options={flattenTree(deptTree)}
            />
          </Form.Item>
          <Form.Item name="roleIds" label="角色">
            <Select
              mode="multiple"
              allowClear
              placeholder="请选择角色"
              options={roleList.map(r => ({ label: r.name, value: r.id }))}
            />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={editingUserId ? [] : [{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder={editingUserId ? '留空则不修改' : '请输入密码'} />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select options={[
              { value: 1, label: '启用' },
              { value: 0, label: '禁用' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Dept Modal */}
      <Modal
        title={editingDeptId ? '编辑部门' : '新增部门'}
        open={deptModalOpen}
        onOk={handleDeptSubmit}
        onCancel={() => setDeptModalOpen(false)}
        width={400}
      >
        <Form form={deptForm} layout="vertical">
          <Form.Item name="name" label="部门名称" rules={[{ required: true, message: '请输入部门名称' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
