'use client';

import MainLayout from '@/components/MainLayout';
import { monitoringData } from '../../public/data/test-data';
import { useState } from 'react';

export default function MonitoringPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('全部');

  const filteredData = monitoringData.filter(item => {
    const matchesSearch = item.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.parameter.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === '全部' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case '正常': return 'bg-success/10 text-success';
      case '预警': return 'bg-warning/10 text-warning';
      case '故障': return 'bg-error/10 text-error';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getValueColor = (value: number, threshold: number) => {
    const ratio = value / threshold;
    if (ratio >= 1) return 'text-error';
    if (ratio >= 0.9) return 'text-warning';
    return 'text-success';
  };

  return (
    <MainLayout>
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-700">状态监测与故障诊断</h1>
        <p className="text-gray-500 mt-2">实时监控设备运行状态</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-sm text-gray-500">监测点总数</p>
            <p className="text-2xl font-bold text-gray-700">{monitoringData.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-sm text-gray-500">正常</p>
            <p className="text-2xl font-bold text-success">{monitoringData.filter(m => m.status === '正常').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-sm text-gray-500">预警</p>
            <p className="text-2xl font-bold text-warning">{monitoringData.filter(m => m.status === '预警').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-sm text-gray-500">故障</p>
            <p className="text-2xl font-bold text-error">{monitoringData.filter(m => m.status === '故障').length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="搜索设备、参数..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="全部">全部状态</option>
                <option value="正常">正常</option>
                <option value="预警">预警</option>
                <option value="故障">故障</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">设备</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">监测参数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">当前值</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单位</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">阈值</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">更新时间</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{item.equipmentName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.parameter}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                      <span className={getValueColor(item.value, item.threshold)}>{item.value}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.threshold}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.updateTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-700 mb-4">实时监测数据</h3>
          <p className="text-sm text-gray-500">共 {filteredData.length} 条记录</p>
        </div>
      </MainLayout>
  );
}
