'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Form, Input, InputNumber, Button, message, Card, Typography, Row, Col, Space, Spin } from 'antd'
import { CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface EntrustmentData {
  id: string
  entrustmentNo: string
  clientName: string | null
  sampleName: string | null
  sampleModel: string | null
  sampleMaterial: string | null
  sampleQuantity: number | null
  expiresAt: string | null
}

export default function ExternalEntrustmentPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [entrustmentData, setEntrustmentData] = useState<EntrustmentData | null>(null)
  const [valid, setValid] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form] = Form.useForm()
  const [captcha, setCaptcha] = useState('')
  const [userCaptcha, setUserCaptcha] = useState('')

  // 生成简单验证码
  const generateCaptcha = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    setCaptcha(code)
    setUserCaptcha('')
  }

  // 验证 token 并获取委托单信息
  useEffect(() => {
    const validateToken = async () => {
      try {
        const res = await fetch(`/api/external/entrustment/validate?token=${token}`)
        const json = await res.json()

        if (json.success) {
          setEntrustmentData(json.data)
          setValid(true)

          // 设置表单初始值
          form.setFieldsValue({
            sampleName: json.data.sampleName || '',
            sampleModel: json.data.sampleModel || '',
            sampleMaterial: json.data.sampleMaterial || '',
            sampleQuantity: json.data.sampleQuantity || 1,
          })

          generateCaptcha()
        } else {
          message.error(json.message || '链接无效')
          setValid(false)
        }
      } catch (error) {
        message.error('验证失败，请检查链接是否正确')
        setValid(false)
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      validateToken()
    }
  }, [token])

  // 提交表单
  const handleSubmit = async () => {
    // 验证验证码
    if (userCaptcha !== captcha) {
      message.error('验证码错误')
      return
    }

    try {
      setSubmitting(true)
      const values = await form.validateFields()

      const res = await fetch('/api/external/entrustment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...values,
        }),
      })

      const json = await res.json()

      if (json.success) {
        setSubmitted(true)
        message.success('提交成功，感谢您的配合！')
      } else {
        message.error(json.message || '提交失败')
      }
    } catch (error) {
      message.error('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // 加载中状态
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <Space direction="vertical" align="center">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          <Text>正在加载...</Text>
        </Space>
      </div>
    )
  }

  // 无效状态
  if (!valid) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <Card style={{ maxWidth: 400, textAlign: 'center' }}>
          <Title level={4} type="danger">链接无效或已过期</Title>
          <Text>请联系检测中心获取新的链接</Text>
        </Card>
      </div>
    )
  }

  // 提交成功状态
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <Card style={{ maxWidth: 400, textAlign: 'center' }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
          <Title level={4} style={{ marginTop: 16 }}>提交成功</Title>
          <Text>感谢您的配合，我们会尽快处理您的委托单</Text>
          <div style={{ marginTop: 24 }}>
            <Text type="secondary">委托单号: {entrustmentData?.entrustmentNo}</Text>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '24px 0' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px' }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 头部信息 */}
            <div style={{ textAlign: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
              <Title level={3} style={{ margin: 0 }}>委托单信息补充</Title>
              <Text type="secondary">
                委托单号: {entrustmentData?.entrustmentNo} | 委托单位: {entrustmentData?.clientName || '-'}
              </Text>
            </div>

            {/* 表单 */}
            <Form form={form} layout="vertical">
              <Title level={5}>样品信息</Title>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="sampleName"
                    label="样品名称"
                    rules={[{ required: true, message: '请输入样品名称' }]}
                  >
                    <Input placeholder="请输入样品名称" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="sampleModel" label="规格型号">
                    <Input placeholder="请输入规格型号" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="sampleMaterial" label="材质牌号">
                    <Input placeholder="请输入材质牌号" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="sampleQuantity"
                    label="样品数量"
                    rules={[{ required: true, message: '请输入样品数量' }]}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入数量" />
                  </Form.Item>
                </Col>
              </Row>

              <Title level={5} style={{ marginTop: 16 }}>检测要求</Title>

              <Form.Item name="specialRequirements" label="特殊要求">
                <Input.TextArea rows={3} placeholder="如有特殊检测要求，请在此说明" />
              </Form.Item>

              <Form.Item name="otherRequirements" label="其他需求">
                <Input.TextArea rows={3} placeholder="其他需要说明的事项" />
              </Form.Item>

              {/* 验证码 */}
              <Form.Item label="验证码">
                <Row gutter={16}>
                  <Col span={8}>
                    <div
                      style={{
                        background: '#f0f2f5',
                        padding: '8px 16px',
                        textAlign: 'center',
                        fontSize: 24,
                        fontWeight: 'bold',
                        letterSpacing: 4,
                        userSelect: 'none',
                        border: '1px solid #d9d9d9',
                        borderRadius: 4,
                      }}
                    >
                      {captcha}
                    </div>
                  </Col>
                  <Col span={8}>
                    <Button onClick={generateCaptcha} style={{ width: '100%' }}>
                      刷新验证码
                    </Button>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="captcha"
                      noStyle
                      rules={[{ required: true, message: '请输入验证码' }]}
                    >
                      <Input
                        placeholder="输入验证码"
                        value={userCaptcha}
                        onChange={(e) => setUserCaptcha(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Form.Item>

              {/* 提交按钮 */}
              <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                <Button
                  type="primary"
                  size="large"
                  loading={submitting}
                  onClick={handleSubmit}
                  block
                >
                  提交信息
                </Button>
              </Form.Item>
            </Form>

            {/* 提示信息 */}
            <div style={{ background: '#f6ffed', padding: 12, borderRadius: 4, border: '1px solid #b7eb8f' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                提示：请如实填写样品信息，确保检测结果的准确性。提交后信息将直接同步到委托单中。
              </Text>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  )
}
