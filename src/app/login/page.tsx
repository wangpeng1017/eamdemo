'use client'

import { useState } from 'react'
import { Form, Input, Button, Card, message, Space, Divider } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// 快捷登录账号配置
const QUICK_LOGIN_ACCOUNTS = [
  { label: '管理员', username: 'admin', password: 'admin123', color: '#1890ff' },
  { label: '销售负责人', username: 'sales_mgr', password: 'sales123', color: '#52c41a' },
  { label: '财务负责人', username: 'finance_mgr', password: 'finance123', color: '#faad14' },
  { label: '实验室主任', username: 'lab_director', password: 'lab123', color: '#722ed1' },
  { label: '检测员', username: 'tester', password: 'test123', color: '#13c2c2' },
]

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const router = useRouter()

  const handleLogin = async (username: string, password: string) => {
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        message.error('用户名或密码错误')
      } else {
        message.success('登录成功')
        router.push('/')
      }
    } catch {
      message.error('登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const onFinish = async (values: { username: string; password: string }) => {
    await handleLogin(values.username, values.password)
  }

  // 快捷登录
  const handleQuickLogin = (account: typeof QUICK_LOGIN_ACCOUNTS[0]) => {
    form.setFieldsValue({ username: account.username, password: account.password })
    handleLogin(account.username, account.password)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 420, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, color: '#1890ff', marginBottom: 8 }}>LIMS</h1>
          <p style={{ color: '#666' }}>实验室信息管理系统</p>
        </div>
        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          size="large"
          initialValues={{ username: 'admin', password: 'admin123' }}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '16px 0' }}>快捷登录（测试用）</Divider>
        <Space wrap style={{ width: '100%', justifyContent: 'center' }}>
          {QUICK_LOGIN_ACCOUNTS.map((account) => (
            <Button
              key={account.username}
              size="small"
              style={{
                borderColor: account.color,
                color: account.color,
              }}
              onClick={() => handleQuickLogin(account)}
              loading={loading}
            >
              {account.label}
            </Button>
          ))}
        </Space>
        <div style={{ marginTop: 16, textAlign: 'center', color: '#999', fontSize: 12 }}>
          <p>提示：如账号不存在，请先在系统管理-用户管理中创建</p>
        </div>
      </Card>
    </div>
  )
}
