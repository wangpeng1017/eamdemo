'use client'

import { useState } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Form, Input, Button, Card, message, Space, Divider } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// 快捷登录账号配置（手机号登录）
const QUICK_LOGIN_ACCOUNTS = [
  { label: '管理员', phone: 'admin', password: 'admin123', color: '#1890ff' },
  { label: '秦兴国', phone: '18086538595', password: '18086538595', color: '#52c41a' },
  { label: '张馨', phone: '15952575002', password: '15952575002', color: '#faad14' },
  { label: '刘丽愉', phone: '13478251400', password: '13478251400', color: '#722ed1' },
  { label: '严秋平', phone: '18890041215', password: '18890041215', color: '#13c2c2' },
]

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const router = useRouter()

  const handleLogin = async (phone: string, password: string) => {
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        phone,
        password,
        redirect: false,
      })

      if (result?.error) {
        showError('手机号或密码错误')
      } else {
        showSuccess('登录成功')
        router.push('/')
      }
    } catch {
      showError('登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const onFinish = async (values: { phone: string; password: string }) => {
    await handleLogin(values.phone, values.password)
  }

  // 快捷登录
  const handleQuickLogin = (account: typeof QUICK_LOGIN_ACCOUNTS[0]) => {
    form.setFieldsValue({ phone: account.phone, password: account.password })
    handleLogin(account.phone, account.password)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
     background: '#ffffff'
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
          initialValues={{ phone: 'admin', password: 'admin123' }}
        >
          <Form.Item
            name="phone"
            rules={[{ required: true, message: '请输入手机号' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="手机号" />
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
              key={account.phone}
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
          <p>提示：默认密码为手机号，管理员账号仍为 admin/admin123</p>
        </div>
      </Card>
    </div>
  )
}
