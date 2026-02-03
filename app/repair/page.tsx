'use client';

import MainLayout from '@/components/MainLayout';
import { repairData } from '../../public/data/test-data';
import { useState } from 'react';

export default function RepairPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('全部');

  const filteredData = repairData.filter(item => {
    const matchesSearch = item.faultDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.equipmentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === '全部' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待派工': return 'bg-yellow-100 text-yellow-700';
      case '维修中': return 'bg-blue-100 text-blue-700';
      case '已完成': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '紧急': return 'bg-red-100 text-red-700';
      case '高': return 'bg-orange-100 text-orange-700';
      case '中': return 'bg-yellow-100 text-yellow-700';
      case '低': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <MainLayout>
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">维修管理</h1>
        <p className="text-slate-500 mt-2">设备维修工单管理</p>
      </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <p className="text-sm text-slate-500">工单总数</p>
            <p className="text-2xl font-bold text-slate-800">{repairData.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <p className="text-sm text-slate-500">待派工</p>
            <p className="text-2xl font-bold text-yellow-600">{repairData.filter(r => r.status === '待派工').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <p className="text-sm text-slate-500">维修中</p>
            <p className="text-2xl font-bold text-blue-600">{repairData.filter(r => r.status === '维修中').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <p className="text-sm text-slate-500">紧急</p>
            <p className="text-2xl font-bold text-red-600">{repairData.filter(r => r.priority === '紧急').length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-slate-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="搜索故障描述、设备..."
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
                <option value="待派工">待派工</option>
                <option value="维修中">维修中</option>
                <option value="已完成">已完成</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">工单编号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">设备</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">故障类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">故障描述</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">报修人</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">报修时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">优先级</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">维修人</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{item.equipmentName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.faultType}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{item.faultDesc}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.reportPerson}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.reportTime}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.assignee || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-2">维修工单</h3>
          <p className="text-sm text-slate-500">共 {filteredData.length} 条记录</p>
        </div>
    </MainLayout>
  );
}
