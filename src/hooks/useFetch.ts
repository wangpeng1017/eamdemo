/**
 * @file useFetch.ts
 * @desc 统一的 API 调用 Hook，提供错误处理和加载状态
 */

import { useState, useCallback } from 'react'
import { message } from 'antd'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

interface UseFetchReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  execute: () => Promise<void>
  reset: () => void
}

interface PaginationParams {
  page?: number
  pageSize?: number
}

interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/**
 * API 请求 Hook
 * @param url 请求 URL
 * @param options 请求选项
 * @returns { data, loading, error, execute, reset }
 */
export function useFetch<T = unknown>(
  url: string | (() => string),
  options: RequestInit = {}
): UseFetchReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async () => {
    const fetchUrl = typeof url === 'function' ? url() : url
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(fetchUrl, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      const result: ApiResponse<T> = await response.json()

      if (result.success) {
        setData(result.data || null)
      } else {
        const errorMsg = result.error?.message || '请求失败'
        setError(errorMsg)
        message.error(errorMsg)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '网络请求失败'
      setError(errorMsg)
      message.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [url, options])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { data, loading, error, execute, reset }
}

/**
 * 分页查询 Hook
 * @param baseUrl 基础 URL
 * @param params 查询参数
 */
export function usePaginatedFetch<T = unknown>(
  baseUrl: string,
  params: PaginationParams & Record<string, unknown> = {}
) {
  const [data, setData] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(params.page || 1)
  const [pageSize] = useState(params.pageSize || 10)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const searchParams = new URLSearchParams({
        page: String(p),
        pageSize: String(pageSize),
        ...Object.fromEntries(
          Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
        ),
      })

      const response = await fetch(`${baseUrl}?${searchParams}`)
      const result: ApiResponse<PaginatedResponse<T>> = await response.json()

      if (result.success && result.data) {
        setData(result.data.list || [])
        setTotal(result.data.total || 0)
        setPage(p)
      } else {
        message.error(result.error?.message || '加载数据失败')
      }
    } catch (err) {
      message.error('网络请求失败')
    } finally {
      setLoading(false)
    }
  }, [baseUrl, pageSize, page, params])

  return { data, total, page, setPage, loading, fetch }
}

/**
 * API 请求工具函数（非 Hook）
 */
export const api = {
  /**
   * GET 请求
   */
  async get<T = unknown>(url: string): Promise<T> {
    const response = await fetch(url)
    const result: ApiResponse<T> = await response.json()

    if (result.success) {
      return result.data as T
    } else {
      throw new Error(result.error?.message || '请求失败')
    }
  },

  /**
   * POST 请求
   */
  async post<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result: ApiResponse<T> = await response.json()

    if (result.success) {
      return result.data as T
    } else {
      throw new Error(result.error?.message || '请求失败')
    }
  },

  /**
   * PUT 请求
   */
  async put<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result: ApiResponse<T> = await response.json()

    if (result.success) {
      return result.data as T
    } else {
      throw new Error(result.error?.message || '请求失败')
    }
  },

  /**
   * DELETE 请求
   */
  async delete<T = unknown>(url: string): Promise<T> {
    const response = await fetch(url, { method: 'DELETE' })
    const result: ApiResponse<T> = await response.json()

    if (result.success) {
      return result.data as T
    } else {
      throw new Error(result.error?.message || '请求失败')
    }
  },
}

/**
 * 带错误处理的异步操作 Hook
 */
export function useAsyncOperation<T = unknown>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(
    async (operation: () => Promise<T>, successMsg?: string): Promise<T | null> => {
      setLoading(true)
      setError(null)

      try {
        const result = await operation()
        if (successMsg) {
          message.success(successMsg)
        }
        return result
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '操作失败'
        setError(errorMsg)
        message.error(errorMsg)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { loading, error, execute }
}
