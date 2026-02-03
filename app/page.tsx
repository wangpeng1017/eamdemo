'use client';

import Link from 'next/link';
import { equipmentData, maintenanceData, repairData, sparePartsData, assetData, monitoringData } from '../public/data/test-data';

export default function Home() {
  // 统计数据
  const stats = {
    totalEquipment: equipmentData.length,
    runningEquipment: equipmentData.filter(e => e.status === '运行中').length,
    faultEquipment: equipmentData.filter(e => e.status === '故障' || e.status === '维修中').length,
    maintenancePlan: maintenanceData.filter(m => m.status === '待执行').length,
    repairOrder: repairData.filter(r => r.status === '待派工' || r.status === '维修中').length,
    alertCount: monitoringData.filter(m => m.status === '预警').length,
  };

  const menuItems = [
    { key: 'equipment', title: '设备台账', icon: '🔧', count: stats.totalEquipment, link: '/equipment', desc: '设备档案管理' },
    { key: 'maintenance', title: '维护保养', icon: '🔍', count: stats.maintenancePlan, link: '/maintenance', desc: '保养计划管理' },
    { key: 'repair', title: '维修管理', icon: '🛠️', count: stats.repairOrder, link: '/repair', desc: '维修工单管理' },
    { key: 'spareparts', title: '备品备件', icon: '📦', count: sparePartsData.length, link: '/spareparts', desc: '库存管理' },
    { key: 'asset', title: '资产管理', icon: '💰', count: assetData.length, link: '/asset', desc: '资产全生命周期' },
    { key: 'monitoring', title: '状态监测', icon: '📊', count: stats.alertCount, link: '/monitoring', desc: '实时监控预警' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">EAM系统</h1>
                <p className="text-sm text-slate-500">企业资产管理平台</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">管理员</p>
                <p className="text-xs text-slate-500">系统管理员</p>
              </div>
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                <span className="text-slate-600">👤</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">设备总数</p>
                <p className="text-3xl font-bold text-slate-800">{stats.totalEquipment}</p>
                <p className="text-xs text-slate-500 mt-2">运行中: {stats.runningEquipment}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔧</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">待执行保养</p>
                <p className="text-3xl font-bold text-orange-600">{stats.maintenancePlan}</p>
                <p className="text-xs text-slate-500 mt-2">计划总数: {maintenanceData.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔍</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">待处理维修</p>
                <p className="text-3xl font-bold text-red-600">{stats.repairOrder}</p>
                <p className="text-xs text-slate-500 mt-2">紧急: {repairData.filter(r => r.priority === '紧急').length}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🛠️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">预警信息</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.alertCount}</p>
                <p className="text-xs text-slate-500 mt-2">监测点: {monitoringData.length}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
          </div>
        </div>

        {/* 功能模块 */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">功能模块</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.key}
                href={item.link}
                className="group bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-3xl">{item.icon}</span>
                  </div>
                  <div className="px-3 py-1 bg-slate-100 rounded-full">
                    <span className="text-sm font-medium text-slate-600">{item.count}</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* 快速访问 */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4">快速访问</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/equipment" className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="text-xl">📋</span>
              <span className="text-sm text-slate-700">设备列表</span>
            </Link>
            <Link href="/repair" className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="text-xl">🚨</span>
              <span className="text-sm text-slate-700">报修申请</span>
            </Link>
            <Link href="/maintenance" className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="text-xl">📅</span>
              <span className="text-sm text-slate-700">保养计划</span>
            </Link>
            <Link href="/monitoring" className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="text-xl">📈</span>
              <span className="text-sm text-slate-700">实时监控</span>
            </Link>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="mt-12 py-6 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">© 2025 EAM系统 - 企业资产管理平台 Demo</p>
        </div>
      </footer>
    </div>
  );
}
