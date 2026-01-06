'use client'

import { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Button, theme } from 'antd'
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
} from '@ant-design/icons'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: <Link href="/">工作台</Link> },
  {
    key: '/entrustment',
    icon: <FileTextOutlined />,
    label: '委托管理',
    children: [
      { key: '/entrustment/consultation', label: <Link href="/entrustment/consultation">咨询管理</Link> },
      { key: '/entrustment/quotation', label: <Link href="/entrustment/quotation">报价管理</Link> },
      { key: '/entrustment/contract', label: <Link href="/entrustment/contract">合同管理</Link> },
      { key: '/entrustment/list', label: <Link href="/entrustment/list">委托单</Link> },
      { key: '/entrustment/client', label: <Link href="/entrustment/client">委托单位</Link> },
    ],
  },
  {
    key: '/sample',
    icon: <ExperimentOutlined />,
    label: '样品管理',
    children: [
      { key: '/sample/receipt', label: <Link href="/sample/receipt">收样登记</Link> },
      { key: '/sample/details', label: <Link href="/sample/details">样品明细</Link> },
      { key: '/sample/my', label: <Link href="/sample/my">我的样品</Link> },
      { key: '/sample/requisition', label: <Link href="/sample/requisition">样品借还</Link> },
    ],
  },
  {
    key: '/task',
    icon: <ExperimentOutlined />,
    label: '检测任务',
    children: [
      { key: '/task/all', label: <Link href="/task/all">全部任务</Link> },
      { key: '/task/my', label: <Link href="/task/my">我的任务</Link> },
    ],
  },
  {
    key: '/report',
    icon: <FileTextOutlined />,
    label: '报告管理',
    children: [
      { key: '/report/template', label: <Link href="/report/template">报告模板</Link> },
      { key: '/report/generate', label: <Link href="/report/generate">报告生成</Link> },
    ],
  },
  {
    key: '/device',
    icon: <ToolOutlined />,
    label: '设备管理',
    children: [
      { key: '/device', label: <Link href="/device">设备台账</Link> },
      { key: '/device/maintenance-plan', label: <Link href="/device/maintenance-plan">保养计划</Link> },
      { key: '/device/calibration-plan', label: <Link href="/device/calibration-plan">定检计划</Link> },
      { key: '/device/maintenance', label: <Link href="/device/maintenance">维护记录</Link> },
    ],
  },
  {
    key: '/outsource',
    icon: <BankOutlined />,
    label: '外包管理',
    children: [
      { key: '/outsource/supplier', label: <Link href="/outsource/supplier">供应商</Link> },
      { key: '/outsource/order', label: <Link href="/outsource/order">外包订单</Link> },
    ],
  },
  {
    key: '/finance',
    icon: <AuditOutlined />,
    label: '财务管理',
    children: [
      { key: '/finance/receivable', label: <Link href="/finance/receivable">应收款</Link> },
      { key: '/finance/invoice', label: <Link href="/finance/invoice">发票管理</Link> },
    ],
  },
  {
    key: '/statistics',
    icon: <BarChartOutlined />,
    label: <Link href="/statistics">统计报表</Link>,
  },
  {
    key: '/system',
    icon: <SettingOutlined />,
    label: '系统设置',
    children: [
      { key: '/system/user', label: <Link href="/system/user">用户管理</Link> },
      { key: '/system/role', label: <Link href="/system/role">角色管理</Link> },
      { key: '/system/dept', label: <Link href="/system/dept">部门管理</Link> },
    ],
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => signOut() },
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
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>管理员</span>
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
