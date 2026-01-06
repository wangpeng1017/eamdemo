/**
 * @file api
 * @desc 统一的 API 调用封装
 */

import { message } from 'antd'

/**
 * API 响应基础类型
 */
export interface ApiResponse<T = any> {
  success?: boolean
  data?: T
  error?: string
  code?: string
  message?: string
}

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T = any> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/**
 * API 请求配置
 */
export interface RequestConfig extends RequestInit {
  timeout?: number
  skipErrorHandler?: boolean
  skipMessage?: boolean
}

/**
 * API 错误类
 */
export class ApiError extends Error {
  code?: string
  statusCode?: number

  constructor(message: string, code?: string, statusCode?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
  }
}

/**
 * 获取认证 token
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
}

/**
 * 超时控制包装器
 */
function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('请求超时')), ms)
  })
}

/**
 * 核心请求函数
 */
async function request<T = any>(
  url: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    timeout = 30000,
    skipErrorHandler = false,
    skipMessage = false,
    ...fetchConfig
  } = config

  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchConfig.headers as Record<string, string>),
  }

  // 添加认证 token
  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    // 发起请求（带超时控制）
    const response = await Promise.race([
      fetch(url, {
        ...fetchConfig,
        headers,
      }),
      timeoutPromise(timeout),
    ]) as Response

    // 处理非 2xx 响应
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        errorData.message || errorData.error || `HTTP ${response.status}`,
        errorData.code,
        response.status
      )
    }

    // 解析响应
    const data = await response.json()
    return data
  } catch (error) {
    // 网络错误或超时
    if (error instanceof Error) {
      if (error.message === '请求超时' || error.name === 'AbortError') {
        throw new ApiError('请求超时，请稍后重试')
      }
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError('网络错误，请检查网络连接')
    }
    throw error
  }
}

/**
 * GET 请求
 */
export async function get<T = any>(
  url: string,
  params?: Record<string, any>,
  config?: RequestConfig
): Promise<T> {
  // 构建查询字符串
  let queryString = ''
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)))
        } else {
          searchParams.set(key, String(value))
        }
      }
    })
    queryString = searchParams.toString()
  }

  const fullUrl = queryString ? `${url}?${queryString}` : url
  return request<T>(fullUrl, { ...config, method: 'GET' })
}

/**
 * POST 请求
 */
export async function post<T = any>(
  url: string,
  data?: any,
  config?: RequestConfig
): Promise<T> {
  return request<T>(url, {
    ...config,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PUT 请求
 */
export async function put<T = any>(
  url: string,
  data?: any,
  config?: RequestConfig
): Promise<T> {
  return request<T>(url, {
    ...config,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE 请求
 */
export async function del<T = any>(
  url: string,
  config?: RequestConfig
): Promise<T> {
  return request<T>(url, {
    ...config,
    method: 'DELETE',
  })
}

/**
 * PATCH 请求
 */
export async function patch<T = any>(
  url: string,
  data?: any,
  config?: RequestConfig
): Promise<T> {
  return request<T>(url, {
    ...config,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  })
}

// ==================== 文件上传 ====================

/**
 * 上传文件
 */
export async function uploadFile<T = any>(
  url: string,
  file: File,
  onProgress?: (progress: number) => void,
  config?: Omit<RequestConfig, 'headers'>
): Promise<T> {
  const formData = new FormData()
  formData.append('file', file)

  const token = getAuthToken()
  const headers: HeadersInit = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // 进度监听
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          onProgress(progress)
        }
      })
    }

    // 完成
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          resolve(data)
        } catch {
          resolve({} as T)
        }
      } else {
        reject(new ApiError(`上传失败: ${xhr.statusText}`, undefined, xhr.status))
      }
    })

    // 错误
    xhr.addEventListener('error', () => {
      reject(new ApiError('上传失败，请检查网络连接'))
    })

    // 超时
    xhr.addEventListener('timeout', () => {
      reject(new ApiError('上传超时'))
    })

    // 发送请求
    xhr.timeout = config?.timeout || 60000
    xhr.open('POST', url)
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value)
    })
    xhr.send(formData)
  })
}

/**
 * 批量上传文件
 */
export async function uploadFiles<T = any>(
  url: string,
  files: File[],
  onProgress?: (progress: number, index: number) => void,
  config?: Omit<RequestConfig, 'headers'>
): Promise<T[]> {
  const results: T[] = []

  for (let i = 0; i < files.length; i++) {
    const result = await uploadFile<T>(url, files[i], (progress) => {
      onProgress?.(progress, i)
    }, config)
    results.push(result)
  }

  return results
}

// ==================== 带消息提示的便捷方法 ====================

/**
 * GET 请求（带成功提示）
 */
export async function getWithMessage<T = any>(
  url: string,
  params?: Record<string, any>,
  successMessage?: string,
  config?: RequestConfig
): Promise<T> {
  try {
    const data = await get<T>(url, params, config)
    if (successMessage) {
      message.success(successMessage)
    }
    return data
  } catch (error) {
    if (error instanceof ApiError) {
      message.error(error.message)
    }
    throw error
  }
}

/**
 * POST 请求（带成功提示）
 */
export async function postWithMessage<T = any>(
  url: string,
  data?: any,
  successMessage?: string,
  config?: RequestConfig
): Promise<T> {
  try {
    const result = await post<T>(url, data, config)
    if (successMessage) {
      message.success(successMessage)
    }
    return result
  } catch (error) {
    if (error instanceof ApiError) {
      message.error(error.message)
    }
    throw error
  }
}

/**
 * PUT 请求（带成功提示）
 */
export async function putWithMessage<T = any>(
  url: string,
  data?: any,
  successMessage?: string,
  config?: RequestConfig
): Promise<T> {
  try {
    const result = await put<T>(url, data, config)
    if (successMessage) {
      message.success(successMessage)
    }
    return result
  } catch (error) {
    if (error instanceof ApiError) {
      message.error(error.message)
    }
    throw error
  }
}

/**
 * DELETE 请求（带成功提示）
 */
export async function deleteWithMessage<T = any>(
  url: string,
  successMessage?: string,
  config?: RequestConfig
): Promise<T> {
  try {
    const result = await del<T>(url, config)
    if (successMessage) {
      message.success(successMessage)
    }
    return result
  } catch (error) {
    if (error instanceof ApiError) {
      message.error(error.message)
    }
    throw error
  }
}

// ==================== 导出 ====================

export const api = {
  get,
  post,
  put,
  delete: del,
  patch,
  uploadFile,
  uploadFiles,
  getWithMessage,
  postWithMessage,
  putWithMessage,
  deleteWithMessage,
}

export default api
