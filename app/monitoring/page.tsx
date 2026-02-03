'use client';

import Link from 'next/link';
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
      case '正常': return 'bg-green-100 text-green-700';
      case '预警': return 'bg-yellow-100 text-yellow-700';
      case '故障': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getValueColor = (value: number, threshold: number) => {
    const ratio = value / threshold;
    if (ratio >= 1) return 'text-red-600';
    if (ratio >= 0.9) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white shadow-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">状态监测与故障诊断</h1>
                <p className="text-sm text-slate-500">Condition Monitoring</p>
              </div>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-sm text-slate-600 hover:text-blue-600">返回首页</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <p className="text-sm text-slate-500">监测点总数</p>
            <p className="text-2xl font-bold text-slate-800">{monitoringData.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <p className="text-sm text-slate-500">正常</p>
            <p className="text-2xl font-bold text-green-600">{monitoringData.filter(m => m.status === '正常').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <p className="text-sm text-slate-500">预警</p>
            <p className="text-2xl font-bold text-yellow-600">{monitoringData.filter(m => m.status === '预警').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <p className="text-sm text-slate-500">故障</p>
            <p className="text-2xl font-bold text-red-600">{monitoringData.filter(m => m.status === '故障').length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-slate-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="搜索设备、参数..."
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
                <option value="正常">正常</option>
                <option value="预警">预警</option>
                <option value="故障">故障</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">设备</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">监测参数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">当前值</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">单位</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">阈值</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">更新时间</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-900">{item.equipmentName}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{item.parameter}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                      <span className={getValueColor(item.value, item.threshold)}>{item.value}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.threshold}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.updateTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">实时监测数据</h3>
          <p className="text-sm text-slate-500">共 {filteredData.length} 条记录</p>
        </div>
      </main>
    </div>
  );
}
