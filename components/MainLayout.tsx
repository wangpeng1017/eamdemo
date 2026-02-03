'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 左侧导航栏 */}
      <Sidebar />

      {/* 右侧内容区 */}
      <div className="flex-1 ml-64">
        {/* 顶部Header */}
        <Header />

        {/* 主内容区 */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
