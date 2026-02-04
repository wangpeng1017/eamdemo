
/**
 * @file layout.tsx
 * @desc 管理后台布局
 */
import AdminLayout from '@/components/AdminLayout'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}
