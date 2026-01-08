'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'
import { message } from 'antd'

// 全局 fetcher - 处理统一 API 响应格式
const fetcher = async (url: string) => {
  const res = await fetch(url)
  const json = await res.json()

  // 处理 HTTP 错误
  if (!res.ok) {
    const errorMsg = json?.error?.message || json?.message || `请求失败 (${res.status})`
    message.error(errorMsg)
    throw new Error(errorMsg)
  }

  // 处理业务错误 (success: false)
  if (json.success === false) {
    const errorMsg = json?.error?.message || json?.message || '操作失败'
    message.error(errorMsg)
    throw new Error(errorMsg)
  }

  // 返回 data 或整个响应（兼容旧格式）
  return json.data !== undefined ? json : json
}

interface SWRProviderProps {
  children: ReactNode
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 5000,
        keepPreviousData: true,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        onError: (error) => {
          console.error('[SWR Error]', error)
        },
      }}
    >
      {children}
    </SWRConfig>
  )
}
