'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'

// 全局 fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('请求失败')
    throw error
  }
  return res.json()
}

interface SWRProviderProps {
  children: ReactNode
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,      // 窗口聚焦时不重新验证
        revalidateOnReconnect: false,  // 网络重连时不重新验证
        dedupingInterval: 5000,        // 5秒内相同请求去重
        keepPreviousData: true,        // 保留上一次数据，切换时不闪烁
        errorRetryCount: 3,            // 错误重试次数
        errorRetryInterval: 5000,      // 错误重试间隔
      }}
    >
      {children}
    </SWRConfig>
  )
}
