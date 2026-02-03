'use client';

import Link from 'next/link';
import { assetData } from '../../public/data/test-data';
import { useState } from 'react';

export default function AssetPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('全部');

  const filteredData = assetData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === '全部' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case '在用': return 'bg-green-100 text-green-700';
      case '维修': return 'bg-orange-100 text-orange-700';
      case '闲置': return 'bg-yellow-100 text-yellow-700';
      case '报废': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
                <h1 className="text-2xl font-bold text-slate-800">资产管理</h1>
                <p className="text-sm text-slate-500">Asset Management</p>
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
            <p className="text-sm text-slate-500">资产总数</p>
            <p className="text-2xl font-bold text-slate-800">{assetData.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <p className="text-sm text-slate-500">资产原值</p>
            <p className="text-2xl font-bold text-slate-800">
              ¥{assetData.reduce((sum, a) => sum + a.originalValue, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <p className="text-sm text-slate-500">资产净值</p>
            <p className="text-2xl font-bold text-blue-600">
              ¥{assetData.reduce((sum, a) => sum + a.netValue, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <p className="text-sm text-slate-500">累计折旧</p>
            <p className="text-2xl font-bold text-orange-600">
              ¥{assetData.reduce((sum, a) => sum + a.depreciation, 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-slate-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="搜索资产名称、编码..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="全部">全部类别</option>
                <option value="固定资产">固定资产</option>
                <option value="低值易耗品">低值易耗品</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">资产编码</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">资产名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">类别</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">原值</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">净值</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">累计折旧</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">购置日期</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">使用年限</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">部门</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.code}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">¥{item.originalValue.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">¥{item.netValue.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">¥{item.depreciation.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.purchaseDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.useYear.toFixed(2)}年</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">资产信息</h3>
          <p className="text-sm text-slate-500">共 {filteredData.length} 条记录</p>
        </div>
      </main>
    </div>
  );
}
