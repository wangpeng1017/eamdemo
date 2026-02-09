'use client'

import { useState } from 'react'
import { showInfo } from '@/lib/confirm'
import { Layout, Menu, Avatar, Dropdown, Button, theme, message } from 'antd'
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
} from '@ant-design/icons'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '工作台' },
  {
    key: '/entrustment',
    icon: <FileTextOutlined />,
    label: '业务管理',
    children: [
      { key: '/entrustment/consultation', label: '业务咨询' },
      { key: '/entrustment/quotation', label: '检测报价' },
      { key: '/entrustment/contract', label: '检测合同' },
      { key: '/entrustment/list', label: '检测委托单' },
      { key: '/entrustment/client', label: '业务单位' },
    ],
  },
  {
    key: '/sample',
    icon: <ExperimentOutlined />,
    label: '样品管理',
    children: [
      { key: '/sample/receipt', label: '收样登记' },
      { key: '/sample/details', label: '样品明细' },
      { key: '/sample/my', label: '我的样品' },
    ],
  },
  {
    key: '/task',
    icon: <ExperimentOutlined />,
    label: '检测任务',
    children: [
      { key: '/task/all', label: '全部任务' },
      { key: '/task/my', label: '我的任务' },
    ],
  },
  {
    key: '/report',
    icon: <FileTextOutlined />,
    label: '报告管理',
    children: [
      { key: '/report/my', label: '我的报告' },
      { key: '/report/task-generate', label: '任务报告生成' },
      { key: '/report/client-generate', label: '客户报告生成' },
      { key: '/report/client-template', label: '客户报告模板' },
    ],
  },
  {
    key: '/device',
    icon: <ToolOutlined />,
    label: '设备管理',
    children: [
      { key: '/device', label: '设备台账' },
      { key: '/device/maintenance-plan', label: '保养计划' },
      { key: '/device/calibration-plan', label: '定检计划' },
      { key: '/device/maintenance', label: '维护记录' },
    ],
  },
  {
    key: '/outsource',
    icon: <BankOutlined />,
    label: '外包管理',
    children: [
      { key: '/outsource/supplier', label: '供应商' },
      { key: '/outsource/order', label: '外包订单' },
    ],
  },
  {
    key: '/finance',
    icon: <AuditOutlined />,
    label: '财务管理',
    children: [
      { key: '/finance/receivable', label: '应收款' },
      { key: '/finance/invoice', label: '发票管理' },
    ],
  },
  {
    key: '/statistics',
    icon: <BarChartOutlined />,
    label: '统计报表',
  },
  {
    key: '/basic-data',
    icon: <DatabaseOutlined />,
    label: '基础数据配置',
    children: [
      { key: '/basic-data/test-templates', label: '检测项目' },
      { key: '/basic-data/inspection-standards', label: '检查标准/依据' },
      { key: '/basic-data/report-categories', label: '报告分类' },
      { key: '/basic-data/personnel-capability', label: '人员资质' },
      { key: '/basic-data/capability-review', label: '能力评审' },
    ],
  },
  {
    key: '/system',
    icon: <SettingOutlined />,
    label: '系统设置',
    children: [
      { key: '/system/user', label: '用户管理' },
      { key: '/system/role', label: '角色管理' },
      { key: '/system/approval-flow', label: '审批流程' },
      { key: '/system/permission', label: '权限配置' },
    ],
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = useSession()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
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
  const getSelectedKeys = () => {
    for (const item of menuItems) {
      if (item.key === pathname) return [item.key]
      if (item.children) {
        for (const child of item.children) {
          if (child.key === pathname) return [child.key]
        }
      }
    }
    return ['/']
  }

  // 获取展开的子菜单
  const getOpenKeys = () => {
    for (const item of menuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (child.key === pathname) return [item.key]
        }
      }
    }
    return []
  }

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
          items={menuItems}
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
              if (key === 'profile') {
                // TODO: Implement profile page
                showInfo('个人中心功能开发中')
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
    </Layout>
  )
}
