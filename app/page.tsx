import { redirect } from 'next/navigation'

export default function Home() {
  // 直接重定向到管理后台仪表盘
  redirect('/admin/dashboard')
}
