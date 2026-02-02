import { Spin } from 'antd'

export default function Loading() {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            minHeight: 300,
            width: '100%'
        }}>
            <Spin size="large" tip="加载中..." />
        </div>
    )
}
