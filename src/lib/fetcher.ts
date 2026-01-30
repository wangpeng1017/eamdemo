/**
 * @file fetcher.ts
 * @desc 全局 fetch 工具函数，自动携带 credentials（cookies）
 * @input 依赖: None
 * @output 导出: fetcher 函数
 */

/**
 * 封装的 fetch 函数，自动携带 cookies（用于 NextAuth session）
 * @param url - 请求 URL
 * @param options - fetch 选项
 * @returns Promise<Response>
 */
export async function fetcher(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    credentials: 'include', // 携带 cookies（NextAuth session）
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

/**
 * GET 请求
 */
export async function get<T>(url: string) {
  const res = await fetcher(url)
  return res.json() as Promise<T>
}

/**
 * POST 请求
 */
export async function post<T>(url: string, data: unknown) {
  const res = await fetcher(url, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.json() as Promise<T>
}

/**
 * PUT 请求
 */
export async function put<T>(url: string, data: unknown) {
  const res = await fetcher(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return res.json() as Promise<T>
}

/**
 * DELETE 请求
 */
export async function del<T>(url: string) {
  const res = await fetcher(url, {
    method: 'DELETE',
  })
  return res.json() as Promise<T>
}
