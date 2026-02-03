
import type { Metadata } from "next"
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { theme as customTheme } from '../lib/theme'
import "./globals.css"

export const metadata: Metadata = {
  title: "慧新EAM系统 - 企业资产管理",
  description: "慧新全智 EAM 系统提供设备台账、维修管理、备品备件、资产管理等全生命周期管理功能",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <ConfigProvider
          theme={customTheme}
          locale={zhCN}
        >
          {children}
        </ConfigProvider>
      </body>
    </html>
  )
}
