/**
 * @file useTable.ts
 * @desc 表格公共 Hook，提供分页、筛选、排序等功能
 */

import { useState, useCallback } from 'react'

interface UseTableReturn<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  filters: Record<string, unknown>
  setData: (data: T[]) => void
  setTotal: (total: number) => void
  setPage: (page: number) => void
  setFilters: (filters: Record<string, unknown>) => void
  setFiltersAndFetch: (filters: Record<string, unknown>) => void
  setLoading: (loading: boolean) => void
}

/**
 * 表格 Hook
 */
export function useTable<T = unknown>(
  fetchFn: (page: number, filters: Record<string, unknown>) => Promise<void>,
  initialPageSize: number = 10
): UseTableReturn<T> {
  const [data, setData] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(initialPageSize)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<Record<string, unknown>>({})

  const setFiltersAndFetch = useCallback(
    (newFilters: Record<string, unknown>) => {
      setFilters(newFilters)
      setPage(1)
      fetchFn(1, newFilters)
    },
    [fetchFn]
  )

  return {
    data,
    total,
    page,
    pageSize,
    loading,
    filters,
    setData,
    setTotal,
    setPage,
    setFilters,
    setFiltersAndFetch,
    setLoading,
  }
}

/**
 * 行选择 Hook
 */
export function useRowSelection<T = unknown>() {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [selectedRows, setSelectedRows] = useState<T[]>([])

  const clearSelection = useCallback(() => {
    setSelectedRowKeys([])
    setSelectedRows([])
  }, [])

  return {
    selectedRowKeys,
    selectedRows,
    setSelectedRowKeys,
    setSelectedRows,
    clearSelection,
  }
}
