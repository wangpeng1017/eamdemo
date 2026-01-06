import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'

// 通用列表数据 Hook
interface ListParams {
  page?: number
  pageSize?: number
  [key: string]: unknown
}

interface ListResponse<T> {
  success: boolean
  data: {
    list: T[]
    total: number
    page: number
    pageSize: number
    stats?: Record<string, number>
  }
}

export function useList<T>(
  endpoint: string,
  params: ListParams = {},
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options
  const queryString = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString()

  const url = queryString ? `${endpoint}?${queryString}` : endpoint

  const { data, error, isLoading, mutate } = useSWR<ListResponse<T>>(
    enabled ? url : null
  )

  return {
    data: data?.data?.list || [],
    total: data?.data?.total || 0,
    stats: data?.data?.stats || {},
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

// 通用详情数据 Hook
interface DetailResponse<T> {
  success: boolean
  data: T
}

export function useDetail<T>(
  endpoint: string,
  id: string | null,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options
  const url = id ? `${endpoint}/${id}` : null

  const { data, error, isLoading, mutate } = useSWR<DetailResponse<T>>(
    enabled && url ? url : null
  )

  return {
    data: data?.data || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

// 通用创建 Hook
async function createFetcher<T>(url: string, { arg }: { arg: T }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  })
  return res.json()
}

export function useCreate<T, R = unknown>(endpoint: string) {
  const { trigger, isMutating, error } = useSWRMutation<R, Error, string, T>(
    endpoint,
    createFetcher
  )

  return {
    create: trigger,
    isCreating: isMutating,
    error,
  }
}

// 通用更新 Hook
async function updateFetcher<T>(url: string, { arg }: { arg: { id: string; data: T } }) {
  const res = await fetch(`${url}/${arg.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg.data),
  })
  return res.json()
}

export function useUpdate<T, R = unknown>(endpoint: string) {
  const { trigger, isMutating, error } = useSWRMutation<R, Error, string, { id: string; data: T }>(
    endpoint,
    updateFetcher
  )

  return {
    update: (id: string, data: T) => trigger({ id, data }),
    isUpdating: isMutating,
    error,
  }
}

// 通用删除 Hook
async function deleteFetcher(url: string, { arg }: { arg: string }) {
  const res = await fetch(`${url}/${arg}`, {
    method: 'DELETE',
  })
  return res.json()
}

export function useDelete<R = unknown>(endpoint: string) {
  const { trigger, isMutating, error } = useSWRMutation<R, Error, string, string>(
    endpoint,
    deleteFetcher
  )

  return {
    remove: trigger,
    isDeleting: isMutating,
    error,
  }
}

// 组合 CRUD Hook
export function useCRUD<T, CreateData = Partial<T>, UpdateData = Partial<T>>(endpoint: string) {
  return {
    useList: (params?: ListParams, options?: { enabled?: boolean }) =>
      useList<T>(endpoint, params, options),
    useDetail: (id: string | null, options?: { enabled?: boolean }) =>
      useDetail<T>(endpoint, id, options),
    useCreate: () => useCreate<CreateData>(endpoint),
    useUpdate: () => useUpdate<UpdateData>(endpoint),
    useDelete: () => useDelete(endpoint),
  }
}
