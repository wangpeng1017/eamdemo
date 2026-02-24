'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * 安全的返回导航 Hook
 * - 有浏览器历史时使用 history.back()（保留滚动位置和筛选条件）
 * - 无历史时跳转到指定的 fallback 路径
 */
export function useGoBack(fallbackPath: string) {
    const router = useRouter()

    const goBack = useCallback(() => {
        // window.history.length > 1 表示当前页面之前有历史记录
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
        } else {
            router.push(fallbackPath)
        }
    }, [router, fallbackPath])

    return goBack
}
