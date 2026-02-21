'use client'

/**
 * @file 外部委托单信息补充页面
 * @desc 客户通过外部链接填写样品信息、联系方式、试验要求等
 * @style 参考 EntrustmentForm 的分段式布局风格
 */

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { useParams } from 'next/navigation'
import {
  Form, Input, InputNumber, Button, Card, Typography, Row, Col,
  Space, Spin, Divider, Select, Radio, Descriptions
} from 'antd'
import { CheckCircleOutlined, LoadingOutlined, SafetyOutlined } from '@ant-design/icons'

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
          setValid(false)
        }
      } catch {
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
    if (userCaptcha !== captcha) {
      showError('验证码错误')
      return
    }

    try {
      setSubmitting(true)
      const values = await form.validateFields()

      const res = await fetch('/api/external/entrustment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...values }),
      })

      const json = await res.json()

      if (json.success) {
        setSubmitted(true)
        showSuccess('提交成功，感谢您的配合！')
      } else {
        showError(json.message || '提交失败')
      }
    } catch {
      showError('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // 加载中状态
  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <Space direction="vertical" align="center">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          <Text style={{ marginTop: 16 }}>正在验证链接...</Text>
        </Space>
      </div>
    )
  }

  // 无效状态
  if (!valid) {
    return (
      <div style={styles.centerContainer}>
        <Card style={{ maxWidth: 480, textAlign: 'center', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '24px 0' }}>
            <SafetyOutlined style={{ fontSize: 56, color: '#ff4d4f' }} />
            <Title level={4} type="danger" style={{ marginTop: 16, marginBottom: 8 }}>链接无效或已过期</Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              外部链接有效期为 7 天，过期后需重新生成。
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 14 }}>
              请联系检测中心获取新的链接。
            </Text>
          </div>
        </Card>
      </div>
    )
  }

  // 提交成功
  if (submitted) {
    return (
      <div style={styles.centerContainer}>
        <Card style={{ maxWidth: 480, textAlign: 'center', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '24px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
            <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>提交成功</Title>
            <Text>感谢您的配合，我们会尽快处理您的委托单。</Text>
            <div style={{ marginTop: 16, padding: '12px 24px', background: '#f6ffed', borderRadius: 8, display: 'inline-block' }}>
              <Text strong>委托单号：{entrustmentData?.entrustmentNo}</Text>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '24px 0' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px' }}>
        {/* 页头 */}
        <div style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>委托单信息补充</Title>
          <Text type="secondary">请如实填写以下信息，确保检测结果的准确性</Text>
        </div>

        <Card bordered={false} style={{ borderRadius: 8 }}>
          {/* 委托单摘要 */}
          <Descriptions
            column={{ xs: 1, sm: 2, md: 3 }}
            size="small"
            style={{ marginBottom: 24, background: '#fafafa', padding: '12px 16px', borderRadius: 6 }}
          >
            <Descriptions.Item label="委托单号">
              <Text strong style={{ color: '#1890ff' }}>{entrustmentData?.entrustmentNo || '-'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="委托单位">
              {entrustmentData?.clientName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="链接有效期至">
              <Text type={entrustmentData?.expiresAt ? 'secondary' : 'danger'}>
                {entrustmentData?.expiresAt
                  ? new Date(entrustmentData.expiresAt).toLocaleDateString('zh-CN')
                  : '未知'}
              </Text>
            </Descriptions.Item>
          </Descriptions>

          <Form form={form} layout="vertical">

            {/* ========== 第①段：联系信息 ========== */}
            <Divider orientation="left" orientationMargin="0">① 联系信息 Contact Information</Divider>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="contactPerson" label="联系人">
                  <Input placeholder="请输入联系人" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="contactPhone" label="电话">
                  <Input placeholder="请输入电话" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="contactFax" label="传真">
                  <Input placeholder="请输入传真" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="contactEmail" label="电子邮箱" rules={[{ type: 'email', message: '请输入正确的邮箱格式' }]}>
                  <Input placeholder="请输入邮箱" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="clientAddress" label="地址">
              <Input placeholder="请输入地址" />
            </Form.Item>

            {/* ========== 第②段：样品信息 ========== */}
            <Divider orientation="left" orientationMargin="0">② 样品信息 Sample Information</Divider>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="sampleName"
                  label="样品名称"
                  rules={[{ required: true, message: '请输入样品名称' }]}
                >
                  <Input placeholder="请输入样品名称" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="sampleModel" label="规格型号 Specification">
                  <Input placeholder="请输入规格型号" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="sampleMaterial" label="材质牌号 Material">
                  <Input placeholder="请输入材质牌号" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="sampleQuantity"
                  label="样品数量 Quantity"
                  rules={[{ required: true, message: '请输入样品数量' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} placeholder="数量" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="sampleColor" label="颜色 Color">
                  <Input placeholder="如：白色" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="sampleWeight" label="重量 Weight">
                  <Input placeholder="如：15kg" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="sampleSupplier" label="供应商 Supplier">
                  <Input placeholder="供应商名称" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="sampleOem" label="OEM/主机厂">
                  <Input placeholder="OEM/主机厂名称" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="vehicleModel" label="车型 Vehicle Model">
                  <Input placeholder="适用车型" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="sampleCondition" label="样品状态 Condition">
                  <Select
                    allowClear
                    placeholder="请选择"
                    options={[
                      { value: '正常', label: '正常' },
                      { value: '密封', label: '密封' },
                      { value: '破损', label: '破损' },
                      { value: '其他', label: '其他' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* ========== 第③段：试验信息 & 特殊要求 ========== */}
            <Divider orientation="left" orientationMargin="0">③ 试验信息 & 特殊要求 Test Info & Requirements</Divider>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="testType" label="试验类型 Test Type">
                  <Select
                    allowClear
                    placeholder="选择试验类型"
                    options={[
                      { value: 'type_test', label: '型式试验 Type Test' },
                      { value: 'routine_test', label: '例行试验 Routine Test' },
                      { value: 'special_test', label: '特殊试验 Special Test' },
                      { value: 'retest', label: '复试 Retest' },
                      { value: 'other', label: '其他 Other' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="sampleDeliveryMethod" label="送样方式 Delivery Method">
                  <Select
                    allowClear
                    placeholder="选择送样方式"
                    options={[
                      { value: 'self', label: '自送 Self-delivery' },
                      { value: 'express', label: '快递 Express' },
                      { value: 'pickup', label: '上门取样 Pickup' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="isSampleReturn" label="是否退样 Sample Return">
                  <Radio.Group>
                    <Radio value={true}>是 Yes</Radio>
                    <Radio value={false}>否 No</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="specialRequirements" label="特殊要求 Special Requirements">
              <Input.TextArea
                rows={3}
                placeholder="如有特殊检测要求，请在此说明（如样品保存时间、测试温度等）"
              />
            </Form.Item>
            <Form.Item name="otherRequirements" label="其他需求 Other Requirements">
              <Input.TextArea rows={3} placeholder="其他需要说明的事项" />
            </Form.Item>

            {/* ========== 第④段：开票信息 ========== */}
            <Divider orientation="left" orientationMargin="0">④ 开票信息 Invoice Info</Divider>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="invoiceTitle" label="开票抬头 Invoice Title">
                  <Input placeholder="开票抬头 / 公司全称" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="taxId" label="税号 Tax ID">
                  <Input placeholder="统一社会信用代码 / 税号" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="invoiceAddress" label="发票地址 Invoice Address">
              <Input placeholder="发票邮寄地址" />
            </Form.Item>

            {/* ========== 验证码 & 提交 ========== */}
            <Divider />
            <Row gutter={16} align="middle">
              <Col xs={8} sm={6} md={4}>
                <div style={styles.captchaBox}>
                  {captcha}
                </div>
              </Col>
              <Col xs={8} sm={6} md={4}>
                <Button onClick={generateCaptcha} block>
                  刷新
                </Button>
              </Col>
              <Col xs={8} sm={6} md={4}>
                <Input
                  placeholder="输入验证码"
                  value={userCaptcha}
                  onChange={(e) => setUserCaptcha(e.target.value)}
                />
              </Col>
              <Col xs={24} sm={6} md={12} style={{ textAlign: 'right', marginTop: 8 }}>
                <Button
                  type="primary"
                  size="large"
                  loading={submitting}
                  onClick={handleSubmit}
                  style={{ minWidth: 160 }}
                >
                  提交信息
                </Button>
              </Col>
            </Row>

            {/* 提示 */}
            <div style={styles.tipBox}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                提示：请如实填写样品信息，确保检测结果的准确性。提交后信息将直接同步到委托单中。
                以上所有字段均为可选填写，您可以只填写您已知的信息。
              </Text>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  )
}

// 样式常量
const styles: Record<string, React.CSSProperties> = {
  centerContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f0f2f5 0%, #e6f7ff 100%)',
  },
  captchaBox: {
    background: '#f0f2f5',
    padding: '8px 16px',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 6,
    userSelect: 'none',
    border: '1px solid #d9d9d9',
    borderRadius: 4,
  },
  tipBox: {
    marginTop: 16,
    background: '#f6ffed',
    padding: '10px 16px',
    borderRadius: 6,
    border: '1px solid #b7eb8f',
  },
}
