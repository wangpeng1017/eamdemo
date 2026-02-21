'use client'

import { redirect } from 'next/navigation'

// 旧的报告模板管理页面已合并到 /report/client-template
export default function ReportTemplatePage() {
  redirect('/report/client-template')
}
