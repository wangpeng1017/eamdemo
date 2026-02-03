
import Link from 'next/link'
import { Button } from 'antd'
import { FundOutlined, ToolOutlined } from '@ant-design/icons'

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #00405C 0%, #0097BA 100%)',
      padding: 24,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: 64,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        textAlign: 'center',
        maxWidth: 600,
        width: '100%',
      }}>
        <h1 style={{
          fontSize: 48,
          fontWeight: 700,
          color: '#00405C',
          marginBottom: 16,
        }}>
          慧新 EAM 系统
        </h1>
        <p style={{
          fontSize: 18,
          color: '#666',
          marginBottom: 48,
          lineHeight: 1.8,
        }}>
          企业资产管理解决方案<br />
          设备全生命周期管理 · 智能维修 · 预测性维护
        </p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
          <Link href="/admin/equipment">
            <Button
              type="primary"
              size="large"
              icon={<FundOutlined />}
              style={{ height: 48, fontSize: 16, paddingHorizontal: 32 }}
            >
              设备台账
            </Button>
          </Link>
          <Link href="/admin/repair">
            <Button
              size="large"
              icon={<ToolOutlined />}
              style={{ height: 48, fontSize: 16, paddingHorizontal: 32 }}
            >
              维修管理
            </Button>
          </Link>
        </div>
        <div style={{
          marginTop: 48,
          padding: 24,
          background: '#F5F7FA',
          borderRadius: 8,
          textAlign: 'left',
        }}>
          <h3 style={{ marginBottom: 16, color: '#00405C' }}>系统功能</h3>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            lineHeight: 2,
            color: '#666',
          }}>
            <li>✓ 设备台账管理 - 全生命周期电子档案</li>
            <li>✓ 维修管理 - 智能派工、知识沉淀</li>
            <li>✓ 备品备件 - 智能库存、需求预测</li>
            <li>✓ 资产管理 - 账实相符、价值核算</li>
            <li>✓ 状态监测 - 实时监控、故障预警</li>
            <li>✓ 维护保养 - 标准化计划、移动执行</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
