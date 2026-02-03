'use client';

import MainLayout from '@/components/MainLayout';
import { equipmentData } from '../../public/data/test-data';
import { useState } from 'react';

export default function EquipmentPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('全部');

  const filteredData = equipmentData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === '全部' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case '运行中': return 'bg-green-100 text-green-700';
      case '故障': return 'bg-red-100 text-red-700';
      case '维修中': return 'bg-orange-100 text-orange-700';
      case '保养中': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <MainLayout>
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">设备台账管理</h1>
        <p className="text-slate-500 mt-2">统一管理企业设备档案信息</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <p className="text-sm text-slate-500">设备总数</p>
          <p className="text-2xl font-bold text-slate-800">{equipmentData.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <p className="text-sm text-slate-500">运行中</p>
          <p className="text-2xl font-bold text-green-600">{equipmentData.filter(e => e.status === '运行中').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <p className="text-sm text-slate-500">维修/保养</p>
          <p className="text-2xl font-bold text-orange-600">{equipmentData.filter(e => e.status === '维修中' || e.status === '保养中').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <p className="text-sm text-slate-500">故障</p>
          <p className="text-2xl font-bold text-red-600">{equipmentData.filter(e => e.status === '故障').length}</p>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索设备名称、编码..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="全部">全部状态</option>
              <option value="运行中">运行中</option>
              <option value="故障">故障</option>
              <option value="维修中">维修中</option>
              <option value="保养中">保养中</option>
            </select>
          </div>
        </div>
      </div>

      {/* 设备列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">设备编码</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">设备名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">型号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">位置</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">类别</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">健康度</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">负责人</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.code}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.model}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    <span className={getHealthScoreColor(item.healthScore)}>{item.healthScore}</span>
                    <span className="text-slate-400">/100</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.responsible}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 设备详情 */}
      <div className="mt-6 bg-white rounded-lg shadow-sm p-6 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-2">设备信息</h3>
        <p className="text-sm text-slate-500">共 {filteredData.length} 条记录</p>
      </div>
    </MainLayout>
  );
}
