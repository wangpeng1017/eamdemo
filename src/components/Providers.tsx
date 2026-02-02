'use client'

import { ConfigProvider, App } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { SessionProvider } from 'next-auth/react'
import NextTopLoader from 'nextjs-toploader'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#1890ff',
          },
        }}
      >
        <App>
          <NextTopLoader />
          {children}
        </App>
      </ConfigProvider>
    </SessionProvider>
  )
}
