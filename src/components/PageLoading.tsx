import { Spin } from 'antd'

/**
 * 页面级加载状态，用于 Next.js loading.tsx 中展示页面切换过渡
 */
export default function PageLoading() {
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
