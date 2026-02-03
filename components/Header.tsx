'use client';

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-700">企业管理系统</h2>
          <p className="text-sm text-gray-500 mt-1">Enterprise Asset Management System</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* 通知图标 */}
          <div className="relative">
            <button className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
              <span className="text-lg">🔔</span>
            </button>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full text-xs text-white flex items-center justify-center">3</span>
          </div>

          {/* 设置图标 */}
          <button className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <span className="text-lg">⚙️</span>
          </button>

          {/* 分隔线 */}
          <div className="h-8 w-px bg-gray-200"></div>

          {/* 用户信息 */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-secondary-cyan to-primary rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">👤</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">管理员</p>
              <p className="text-xs text-gray-500">在线</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
