'use client';

import MainLayout from '@/components/MainLayout';
import Link from 'next/link';
import { equipmentData, maintenanceData, repairData, sparePartsData, assetData, monitoringData } from '../public/data/test-data';

export default function Home() {
  const stats = {
    totalEquipment: equipmentData.length,
    runningEquipment: equipmentData.filter(e => e.status === '运行中').length,
    faultEquipment: equipmentData.filter(e => e.status === '故障' || e.status === '维修中').length,
    maintenancePlan: maintenanceData.filter(m => m.status === '待执行').length,
    repairOrder: repairData.filter(r => r.status === '待派工' || r.status === '维修中').length,
    alertCount: monitoringData.filter(m => m.status === '预警').length,
  };

  const quickActions = [
    { title: '设备列表', desc: '查看所有设备', icon: '🔧', link: '/equipment', color: 'from-blue-500 to-blue-600' },
    { title: '报修申请', desc: '提交维修工单', icon: '🚨', link: '/repair', color: 'from-red-500 to-red-600' },
    { title: '保养计划', desc: '查看保养任务', icon: '📅', link: '/maintenance', color: 'from-green-500 to-green-600' },
    { title: '实时监控', desc: '设备状态监控', icon: '📈', link: '/monitoring', color: 'from-purple-500 to-purple-600' },
  ];

  const recentActivities = [
    { type: '维修', content: '空压机主机异响', time: '10分钟前', status: '待处理' },
    { type: '保养', content: '注塑机润滑保养', time: '30分钟前', status: '已完成' },
    { type: '预警', content: '空压机振动值超标', time: '1小时前', status: '预警中' },
    { type: '维修', content: '冲压机滑块卡死', time: '2小时前', status: '维修中' },
    { type: '保养', content: '数控车床周检查', time: '3小时前', status: '执行中' },
  ];

  return (
    <MainLayout>
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-700">系统概览</h1>
        <p className="text-gray-500 mt-2">欢迎回来，管理员！这是今天的系统概况。</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">设备总数</p>
              <p className="text-3xl font-bold text-gray-700">{stats.totalEquipment}</p>
              <p className="text-xs text-gray-500 mt-2">运行中: {stats.runningEquipment}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🔧</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">待执行保养</p>
              <p className="text-3xl font-bold text-warning">{stats.maintenancePlan}</p>
              <p className="text-xs text-gray-500 mt-2">计划总数: {maintenanceData.length}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🔍</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">待处理维修</p>
              <p className="text-3xl font-bold text-error">{stats.repairOrder}</p>
              <p className="text-xs text-gray-500 mt-2">紧急: {repairData.filter(r => r.priority === '紧急').length}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🛠️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">预警信息</p>
              <p className="text-3xl font-bold text-warning">{stats.alertCount}</p>
              <p className="text-xs text-gray-500 mt-2">监测点: {monitoringData.length}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 快捷操作 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-700 mb-4">快捷操作</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  href={action.link}
                  className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <span className="text-2xl">{action.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{action.title}</p>
                    <p className="text-xs text-gray-500">{action.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 最近活动 */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mt-6">
            <h3 className="text-lg font-bold text-gray-700 mb-4">最近活动</h3>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{activity.content}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    activity.status === '已完成' ? 'bg-success/10 text-success' :
                    activity.status === '预警中' ? 'bg-warning/10 text-warning' :
                    activity.status === '维修中' || activity.status === '执行中' ? 'bg-info/10 text-info' :
                    'bg-error/10 text-error'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧信息栏 */}
        <div className="space-y-6">
          {/* 系统状态 */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-700 mb-4">系统状态</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">设备运行率</span>
                  <span className="font-medium text-gray-700">85%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">保养完成率</span>
                  <span className="font-medium text-gray-700">92%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">维修响应率</span>
                  <span className="font-medium text-gray-700">78%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* 备件库存预警 */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-700 mb-4">库存预警</h3>
            <div className="space-y-3">
              {sparePartsData.filter(s => s.stock < s.safetyStock).slice(0, 4).map((part) => (
                <div key={part.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{part.name}</p>
                    <p className="text-xs text-gray-500">{part.model}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-error">{part.stock}/{part.safetyStock}</p>
                    <p className="text-xs text-gray-500">库存</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
