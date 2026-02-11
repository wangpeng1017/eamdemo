'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { showInfo } from '@/lib/confirm'
import { Layout, Menu, Avatar, Dropdown, Button, theme, message, Modal, Form, Input } from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  ToolOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
  BankOutlined,
  AuditOutlined,
  BarChartOutlined,
  TeamOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  LockOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

const { Header, Sider, Content } = Layout

// 菜单项类型（带权限编码）
interface MenuItem {
  key: string
  icon?: React.ReactNode
  label: string
  permissionCode: string
  children?: MenuItem[]
}

// 完整菜单配置（带权限编码，与 sync-permissions.js 保持一致）
const allMenuItems: MenuItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: '工作台', permissionCode: 'menu:dashboard' },
  {
    key: '/entrustment',
    icon: <FileTextOutlined />,
    label: '业务管理',
    permissionCode: 'menu:entrustment',
    children: [
      { key: '/entrustment/consultation', label: '业务咨询', permissionCode: 'menu:entrustment:consultation' },
      { key: '/entrustment/quotation', label: '检测报价', permissionCode: 'menu:entrustment:quotation' },
      { key: '/entrustment/contract', label: '检测合同', permissionCode: 'menu:entrustment:contract' },
      { key: '/entrustment/list', label: '检测委托单', permissionCode: 'menu:entrustment:list' },
      { key: '/entrustment/client', label: '业务单位', permissionCode: 'menu:entrustment:client' },
    ],
  },
  {
    key: '/sample',
    icon: <ExperimentOutlined />,
    label: '样品管理',
    permissionCode: 'menu:sample',
    children: [
      { key: '/sample/receipt', label: '收样登记', permissionCode: 'menu:sample:receipt' },
      { key: '/sample/details', label: '样品明细', permissionCode: 'menu:sample:details' },
      { key: '/sample/my', label: '我的样品', permissionCode: 'menu:sample:my' },
    ],
  },
  {
    key: '/task',
    icon: <ExperimentOutlined />,
    label: '检测任务',
    permissionCode: 'menu:task',
    children: [
      { key: '/task/all', label: '全部任务', permissionCode: 'menu:task:all' },
      { key: '/task/my', label: '我的任务', permissionCode: 'menu:task:my' },
    ],
  },
  {
    key: '/report',
    icon: <FileTextOutlined />,
    label: '报告管理',
    permissionCode: 'menu:report',
    children: [
      { key: '/report/my', label: '我的报告', permissionCode: 'menu:report:my' },
      { key: '/report/task-generate', label: '任务报告生成', permissionCode: 'menu:report:task-generate' },
      { key: '/report/client-generate', label: '客户报告生成', permissionCode: 'menu:report:client-generate' },
      { key: '/report/client-template', label: '客户报告模板', permissionCode: 'menu:report:client-template' },
    ],
  },
  {
    key: '/device',
    icon: <ToolOutlined />,
    label: '设备管理',
    permissionCode: 'menu:device',
    children: [
      { key: '/device', label: '设备台账', permissionCode: 'menu:device:index' },
      { key: '/device/maintenance-plan', label: '保养计划', permissionCode: 'menu:device:maintenance-plan' },
      { key: '/device/calibration-plan', label: '定检计划', permissionCode: 'menu:device:calibration-plan' },
      { key: '/device/maintenance', label: '维护记录', permissionCode: 'menu:device:maintenance' },
    ],
  },
  {
    key: '/outsource',
    icon: <BankOutlined />,
    label: '外包管理',
    permissionCode: 'menu:outsource',
    children: [
      { key: '/outsource/supplier', label: '供应商', permissionCode: 'menu:outsource:supplier' },
      { key: '/outsource/order', label: '外包订单', permissionCode: 'menu:outsource:order' },
    ],
  },
  {
    key: '/finance',
    icon: <AuditOutlined />,
    label: '财务管理',
    permissionCode: 'menu:finance',
    children: [
      { key: '/finance/receivable', label: '应收款', permissionCode: 'menu:finance:receivable' },
      { key: '/finance/invoice', label: '发票管理', permissionCode: 'menu:finance:invoice' },
    ],
  },
  {
    key: '/statistics',
    icon: <BarChartOutlined />,
    label: '统计报表',
    permissionCode: 'menu:statistics',
  },
  {
    key: '/basic-data',
    icon: <DatabaseOutlined />,
    label: '基础数据配置',
    permissionCode: 'menu:basic-data',
    children: [
      { key: '/basic-data/inspection-standards', label: '检测标准', permissionCode: 'menu:basic-data:inspection-standards' },
      { key: '/basic-data/test-templates', label: '检测项目', permissionCode: 'menu:basic-data:test-templates' },
      { key: '/basic-data/report-categories', label: '报告分类', permissionCode: 'menu:basic-data:report-categories' },
      { key: '/basic-data/personnel-capability', label: '人员资质', permissionCode: 'menu:basic-data:personnel-capability' },
      { key: '/basic-data/capability-review', label: '能力评审', permissionCode: 'menu:basic-data:capability-review' },
    ],
  },
  {
    key: '/system',
    icon: <SettingOutlined />,
    label: '系统设置',
    permissionCode: 'menu:system',
    children: [
      { key: '/system/user', label: '用户管理', permissionCode: 'menu:system:user' },
      { key: '/system/role', label: '角色管理', permissionCode: 'menu:system:role' },
      { key: '/system/approval-flow', label: '审批流程', permissionCode: 'menu:system:approval-flow' },
      { key: '/system/permission', label: '权限配置', permissionCode: 'menu:system:permission' },
    ],
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = useSession()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [permissionsLoaded, setPermissionsLoaded] = useState(false)
  const pathname = usePathname()
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()

  // 加载用户权限
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        if (data.success && data.data) {
          setUserPermissions(data.data.permissions || [])
          // 管理员角色直接显示全部菜单
          setIsAdmin(data.data.roles?.includes('admin') || false)
        }
      } catch {
        // 加载失败不影响基础功能
      } finally {
        setPermissionsLoaded(true)
      }
    }
    loadPermissions()
  }, [])

  // 根据权限过滤菜单
  const menuItems = useMemo(() => {
    if (!permissionsLoaded) return [] // 权限未加载完时不显示菜单
    if (isAdmin) return allMenuItems // 管理员显示全部

    const permSet = new Set(userPermissions)

    return allMenuItems
      .map(item => {
        // 无子菜单的顶级项，直接判断权限
        if (!item.children) {
          return permSet.has(item.permissionCode) ? item : null
        }
        // 有子菜单时，先过滤子菜单
        const filteredChildren = item.children.filter(child => permSet.has(child.permissionCode))
        // 如果有任意子菜单有权限，则显示父菜单（即使父菜单权限未勾选）
        if (filteredChildren.length === 0) return null
        return { ...item, children: filteredChildren }
      })
      .filter(Boolean) as MenuItem[]
  }, [userPermissions, isAdmin, permissionsLoaded])

  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordForm] = Form.useForm()

  // 修改密码
  const handleChangePassword = async () => {
    const values = await passwordForm.validateFields()
    setPasswordLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        }),
      })
      const data = await res.json()
      if (data.success !== false) {
        Modal.success({ title: '修改成功', content: '密码已更新，下次登录请使用新密码' })
        setPasswordModalOpen(false)
        passwordForm.resetFields()
      } else {
        Modal.error({ title: '修改失败', content: data.message || data.error?.message || '请检查原密码是否正确' })
      }
    } catch {
      Modal.error({ title: '修改失败', content: '网络错误，请重试' })
    } finally {
      setPasswordLoading(false)
    }
  }

  const userMenuItems = [
    { key: 'change-password', icon: <LockOutlined />, label: '修改密码' },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
        signOut({ callbackUrl: `${currentOrigin}/login` })
      }
    },
  ]

  // 获取当前选中的菜单项
  const getSelectedKeys = useCallback(() => {
    for (const item of allMenuItems) {
      if (item.key === pathname) return [item.key]
      if (item.children) {
        for (const child of item.children) {
          if (child.key === pathname) return [child.key]
        }
      }
    }
    return ['/']
  }, [pathname])

  // 获取展开的子菜单
  const getOpenKeys = useCallback(() => {
    for (const item of allMenuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (child.key === pathname) return [item.key]
        }
      }
    }
    return []
  }, [pathname])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: collapsed ? 16 : 20,
            fontWeight: 600,
            color: '#1890ff'
          }}>
            {collapsed ? 'LIMS' : 'LIMS 系统'}
          </h1>
        </div>
        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems.map(({ permissionCode, children, ...item }) => ({
            ...item,
            children: children?.map(({ permissionCode: _, ...child }) => child),
          }))}
          style={{ borderRight: 0 }}
          onClick={({ key }) => {
            router.push(key)
          }}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown menu={{
            items: userMenuItems,
            onClick: ({ key }) => {
              if (key === 'change-password') {
                setPasswordModalOpen(true)
              }
            }
          }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} src={session?.data?.user?.image} />
              <span>{session?.data?.user?.name || '用户'}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{
          margin: 24,
          padding: 24,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
          minHeight: 280
        }}>
          {children}
        </Content>
      </Layout>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={passwordModalOpen}
        onOk={handleChangePassword}
        onCancel={() => { setPasswordModalOpen(false); passwordForm.resetFields() }}
        confirmLoading={passwordLoading}
        okText="确认修改"
        cancelText="取消"
      >
        <Form form={passwordForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="oldPassword"
            label="原密码"
            rules={[{ required: true, message: '请输入原密码' }]}
          >
            <Input.Password placeholder="请输入原密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度不能少于6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码（至少6位）" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}
