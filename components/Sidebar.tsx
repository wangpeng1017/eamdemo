'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { key: '/', icon: '🏠', label: '首页', desc: '系统概览' },
    { key: '/equipment', icon: '🔧', label: '设备台账', desc: '设备档案管理' },
    { key: '/maintenance', icon: '🔍', label: '维护保养', desc: '保养计划管理' },
    { key: '/repair', icon: '🛠️', label: '维修管理', desc: '维修工单管理' },
    { key: '/spareparts', icon: '📦', label: '备品备件', desc: '库存管理' },
    { key: '/asset', icon: '💰', label: '资产管理', desc: '资产全生命周期' },
    { key: '/monitoring', icon: '📊', label: '状态监测', desc: '实时监控预警' },
  ];

  return (
    <div className="w-64 bg-slate-900 min-h-screen flex flex-col fixed left-0 top-0 bottom-0">
      {/* Logo区 */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">E</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">EAM系统</h1>
            <p className="text-xs text-slate-400">企业资产管理</p>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.key;
          return (
            <Link
              key={item.key}
              href={item.key}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${isActive ? 'text-white' : ''}`}>{item.label}</p>
                {isActive && <p className="text-xs text-blue-200 mt-0.5">{item.desc}</p>}
              </div>
              {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
            </Link>
          );
        })}
      </nav>

      {/* 底部用户信息 */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center space-x-3 px-2">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">👤</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">管理员</p>
            <p className="text-xs text-slate-400">系统管理员</p>
          </div>
        </div>
      </div>
    </div>
  );
}
