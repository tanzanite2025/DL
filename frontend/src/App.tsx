import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { UsersPermissions } from './pages/UsersPermissions';
import { WarehouseManagement } from './pages/WarehouseManagement';
import { ProductsManagement } from './pages/ProductsManagement';
import { GoodsMovements } from './pages/GoodsMovements';
import { FinanceARAP } from './pages/FinanceARAP';
import { SalesManagement } from './pages/SalesManagement';
import { AfterSalesManagement } from './pages/AfterSalesManagement';
import { ProcurementManagement } from './pages/ProcurementManagement';
import { useI18n } from './i18n/I18nContext';
import { ToastMessage, UserPermission, ShowToast } from './types';
import { authApi } from './services/api';
import { UnitsSettingsCard } from './components/settings/UnitsSettingsCard';
import { Users, Warehouse, Package,
  RefreshCw, CircleDollarSign, LogOut, Terminal,
  AlertTriangle, X,
  Languages,
  ShoppingCart,
  ShoppingBag,
  Settings,
  Sun,
  Moon
} from 'lucide-react';

function DashboardShell({
  token,
  userId,
  userPermission,
  onLogout,
  showToast,
  onRefreshPermissions
}: {
  token: string;
  userId: string;
  userPermission: UserPermission | null;
  onLogout: () => void;
  showToast: ShowToast;
  onRefreshPermissions: () => void;
}) {
  const { language, setLanguage, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingTab, setActiveSettingTab] = useState<'permissions' | 'preferences'>(
    userPermission?.canAccessUsers ? 'permissions' : 'preferences'
  );
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('dalang_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.body.classList.toggle('theme-light', theme === 'light');
    document.body.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dalang_theme', theme);
  }, [theme]);

  // 根据权限过滤侧边栏菜单（排除了“权限与账号”，该功能现收纳于顶部“设置”弹窗中）
  const menuItems = [
    {
      path: '/products',
      label: t('productsMenu'),
      icon: <Package size={16} />,
      allowed: userPermission?.canAccessProducts ?? false
    },
    {
      path: '/warehouses',
      label: t('warehouseMenu'),
      icon: <Warehouse size={16} />,
      allowed: userPermission?.canAccessWarehouse ?? false
    },
    {
      path: '/goods',
      label: t('goodsMenu'),
      icon: <RefreshCw size={16} />,
      allowed: userPermission?.canAccessGoods ?? false
    },
    {
      path: '/procurement',
      label: t('procurementMenu'),
      icon: <ShoppingCart size={16} />,
      allowed: userPermission?.canAccessPurchase ?? false
    },
    {
      path: '/finance',
      label: t('financeMenu'),
      icon: <CircleDollarSign size={16} />,
      allowed: userPermission?.canAccessFinance ?? false
    },
    {
      path: '/sales',
      label: t('salesMenu'),
      icon: <ShoppingBag size={16} />,
      allowed: userPermission?.canAccessSales ?? false
    },
    {
      path: '/after-sales',
      label: '售后管理',
      icon: <ShoppingBag size={16} />,
      allowed: userPermission?.canAccessAfterSales ?? false
    },
  ];

  const allowedMenuItems = menuItems.filter(item => item.allowed);

  // 默认路由重定向逻辑
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/login') {
      if (allowedMenuItems.length > 0) {
        navigate(allowedMenuItems[0].path);
      }
    }
  }, [location, allowedMenuItems, navigate]);

  const shellBg = theme === 'light' ? 'bg-[#f7f7f8] text-[#111]' : 'bg-[#09090b] text-neutral-100';
  const headerBg = theme === 'light' ? 'bg-white/90 text-[#111]' : 'bg-[#121214]';

  return (
    <div className={`min-h-screen flex flex-col ${shellBg}`}>
      {/* 顶部导航栏 header */}
      <header className={`w-full ${headerBg} sticky top-0 z-40 backdrop-blur-md bg-opacity-95`}>
        <div className="max-w-[95%] mx-auto px-4 sm:px-6 md:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* 左侧：Logo & 操作员标识 */}
          <div className="flex items-center justify-between w-full md:w-auto gap-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0">
                <span className="text-black font-black italic text-xs tracking-tighter">DL</span>
              </div>
            </div>
            
            {/* 顶栏操作员标识胶囊 */}
            <div className="flex items-center gap-2 bg-[#1c1c1e]/40 px-3 py-1 rounded-full text-[10px] font-semibold text-neutral-300">
              <span className="hidden xs:inline text-neutral-400 font-mono text-[8px] tracking-wider mr-1">{t('currentOperator')}:</span>
              <span className="font-bold">{userPermission?.username || '---'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="text-[8px] font-mono text-neutral-500">[{userPermission?.roleName || '---'}]</span>
            </div>
          </div>

          {/* 中间：水平选项卡菜单（支持窄屏/移动端溢出横向滑动滚动） */}
          <nav className="flex items-center bg-black/40 p-1 rounded-full overflow-x-auto scrollbar-none w-full md:w-auto max-w-full justify-start md:justify-center gap-1 select-none">
            {allowedMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-all duration-200 shrink-0 ${
                    isActive
                      ? 'bg-white text-black font-black'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className={isActive ? 'text-black' : 'text-neutral-400'}>{item.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                </Link>
              );
            })}

            {allowedMenuItems.length === 0 && (
              <span className="text-rose-500 text-[9px] font-bold px-4 py-1.5 uppercase tracking-wider block shrink-0">
                {t('errNoPagesAssigned')}
              </span>
            )}
          </nav>

          {/* 右侧：辅助操作区（系统配置、语言切换与注销） */}
          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
            {/* 主题切换 */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="text-[9px] font-black tracking-wider text-neutral-400 hover:text-white px-3 py-1.5 rounded-full flex items-center justify-center gap-1 h-8 cursor-pointer transition-all active:scale-95 bg-white/2 hover:bg-white/5"
              title={theme === 'dark' ? '切换到明亮' : '切换到暗色'}
            >
              {theme === 'dark' ? <Sun size={10} /> : <Moon size={10} />}
            </button>

            {/* 系统设置 */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-[9px] font-black tracking-wider text-neutral-400 hover:text-white px-3 py-1.5 rounded-full flex items-center justify-center gap-1 h-8 cursor-pointer transition-all active:scale-95 bg-white/2 hover:bg-white/5"
              title={t('settingsLabel')}
            >
              <Settings size={10} />
            </button>

            {/* 极简双语切换 */}
            <button
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="text-[9px] font-black tracking-wider text-neutral-400 hover:text-white px-3 py-1.5 rounded-full flex items-center justify-center gap-1 h-8 cursor-pointer transition-all active:scale-95 bg-white/2 hover:bg-white/5"
            >
              <Languages size={10} />
              <span>{t('navLanguageText')}</span>
            </button>

            {/* 退出系统 */}
            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-1 px-3 py-1.5 h-8 rounded-full text-[9px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 cursor-pointer transition-all active:scale-95"
              title={`${t('systemIdLabel')}: ${userId.substring(0, 8)}...`}
            >
              <span>{t('signOutOperator')}</span>
              <LogOut size={10} />
            </button>
          </div>
          
        </div>
      </header>

      {/* 主工作区 - 最大宽度 95%，充分利用屏幕空间 */}
      <main className="flex-1 w-full max-w-[95%] mx-auto px-4 sm:px-6 md:px-8 py-8 flex flex-col gap-8">
        <Routes>
          {userPermission?.canAccessUsers && (
            <Route
              path="/permissions"
              element={
                <UsersPermissions
                  token={token}
                  currentUserId={userId}
                  showToast={showToast}
                  onRefreshPermissions={onRefreshPermissions}
                />
              }
            />
          )}
          {userPermission?.canAccessProducts && (
            <Route
              path="/products"
              element={
                <ProductsManagement
                  token={token}
                  showToast={showToast}
                  canViewCost={userPermission?.canViewCost ?? false}
                />
              }
            />
          )}
          {userPermission?.canAccessWarehouse && (
            <Route
              path="/warehouses"
              element={<WarehouseManagement token={token} showToast={showToast} />}
            />
          )}
          {userPermission?.canAccessGoods && (
            <Route
              path="/goods"
              element={
                <GoodsMovements
                  token={token}
                  showToast={showToast}
                  canViewCost={userPermission?.canViewCost ?? false}
                />
              }
            />
          )}
          {userPermission?.canAccessFinance && (
            <Route
              path="/finance"
              element={<FinanceARAP token={token} showToast={showToast} />}
            />
          )}
          {userPermission?.canAccessPurchase && (
            <Route
              path="/procurement"
              element={<ProcurementManagement token={token} showToast={showToast} />}
            />
          )}
          {userPermission?.canAccessSales && (
            <Route
              path="/sales"
              element={<SalesManagement token={token} showToast={showToast} />}
            />
          )}
          {userPermission?.canAccessAfterSales && (
            <Route
              path="/after-sales"
              element={<AfterSalesManagement token={token} showToast={showToast} />}
            />
          )}
          
          {/* 降级捕获：如果用户尝试通过 URL 越权访问，展示大声报错页面 */}
          <Route
            path="*"
            element={
              allowedMenuItems.length > 0 ? (
                <Navigate to={allowedMenuItems[0].path} replace />
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-rose-500/20 bg-rose-500/5 rounded-[32px] p-8 text-center max-w-lg mx-auto my-12 animate-uds-fade">
                  <AlertTriangle className="text-rose-500 animate-bounce mb-4" size={48} />
                  <h3 className="text-sm font-black italic uppercase tracking-tighter text-rose-500 mb-2">
                    {t('accessViolation')}
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed uppercase tracking-wider">
                    {t('accessViolationDesc')}
                  </p>
                </div>
              )
            }
          />
        </Routes>
      </main>

      {/* UDS 统一设计系统 1.0 全局设置弹窗 */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-[80vw] max-w-[80vw] h-[85vh] bg-[#121214] rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-uds-fade">
            {/* 顶部渐变 */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/3 via-transparent to-transparent pointer-events-none rounded-[32px]" />
            
            {/* 弹窗头部 */}
            <div className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5 shrink-0">
              <div className="flex flex-col gap-1">
                <h2 className="text-[16px] font-black tracking-tighter italic uppercase text-white">
                  {t('settingsTitle')}
                </h2>
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 opacity-60">
                  System Settings & Console Configuration
                </p>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-neutral-400 hover:text-white shrink-0 cursor-pointer p-2 rounded-full hover:bg-white/5 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* 弹窗主体 */}
            <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
              {/* 弹窗内顶部水平 TAB 栏 */}
              <div className="w-full border-b border-white/5 bg-black/20 px-8 py-3 flex items-center gap-4 shrink-0 overflow-x-auto scrollbar-none">
                <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest mr-2 shrink-0">
                  Settings Menu:
                </span>
                <div className="flex items-center bg-black/40 p-1 rounded-full gap-1 select-none">
                  {userPermission?.canAccessUsers && (
                    <button 
                      onClick={() => setActiveSettingTab('permissions')}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all duration-200 cursor-pointer text-[10px] font-black uppercase tracking-widest shrink-0 ${
                        activeSettingTab === 'permissions'
                          ? 'bg-white text-black font-black'
                          : 'text-neutral-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Users size={10} />
                      <span>{t('permissionsMenu')}</span>
                    </button>
                  )}
                  
                  <button 
                    onClick={() => {
                      setActiveSettingTab('preferences');
                      showToast('常规偏好设置已自动适配系统语言', 'success');
                    }}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all duration-200 cursor-pointer text-[10px] font-black uppercase tracking-widest shrink-0 ${
                      activeSettingTab === 'preferences'
                        ? 'bg-white text-black font-black'
                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Settings size={10} />
                    <span>常规偏好 (Preferences)</span>
                  </button>
                </div>
              </div>

              {/* 弹窗下半部配置内容区 */}
              <div className="flex-1 p-8 overflow-y-auto bg-[#09090b]/85">
                {activeSettingTab === 'permissions' && userPermission?.canAccessUsers ? (
                  <div className="flex flex-col gap-8 h-full">
                    {/* 直接嵌入 UsersPermissions 组件 */}
                    <UsersPermissions
                      token={token}
                      currentUserId={userId}
                      showToast={showToast}
                      onRefreshPermissions={onRefreshPermissions}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 h-full">
                    {/* 全局单位主数据管理 */}
                    <UnitsSettingsCard showToast={showToast} />

                    {/* 预留：其他常规偏好配置区 */}
                    <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto opacity-70">
                      <AlertTriangle className="text-neutral-600 mb-3 animate-pulse" size={24} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        常规配置正常生效中
                      </span>
                      <p className="text-[8px] text-neutral-500 font-mono mt-2 uppercase tracking-wide">
                        Your local operator session is active. Preferred language is synced with UI settings.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { t } = useI18n();
  const [token, setToken] = useState<string | null>(localStorage.getItem('dalang_erp_token'));
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('dalang_erp_uid'));
  const [userPermission, setUserPermission] = useState<UserPermission | null>(null);

  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 弹窗提示函数
  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // 5秒后自动关闭
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 验证当前操作员身份并拉取权限
  const fetchUserAuthority = async (_authToken: string) => {
    setIsLoadingAuth(true);
    try {
      const data = await authApi.me();
      
      // 验证权限对象完整性
      if (!data.username || !data.role) {
        throw new Error(t('errCriticalUserRoleFieldMissing'));
      }

      setUserPermission({
        username: data.username,
        roleName: data.role.name,
        canAccessUsers: data.role.canAccessUsers,
        canAccessWarehouse: data.role.canAccessWarehouse,
        canAccessProducts: data.role.canAccessProducts ?? false,
        canAccessGoods: data.role.canAccessGoods,
        canAccessFinance: data.role.canAccessFinance,
        canAccessSales: data.role.canAccessSales ?? false,
        canAccessAfterSales: data.role.canAccessAfterSales ?? false,
        canAccessPurchase: data.role.canAccessPurchase ?? false,
        canAccessAssembly: data.role.canAccessAssembly ?? false,
        canViewCost: data.role.canViewCost ?? false,
        canViewSalesPrice: data.role.canViewSalesPrice ?? false,
      });
    } catch (error: any) {
      console.error(error);
      showToast(error.message || t('errLoadAuth'), 'error');
      // 清理失效 Token
      handleLogout();
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // 当 Token 存在时，触发拉取权限数据
  useEffect(() => {
    if (token) {
      fetchUserAuthority(token);
    } else {
      setUserPermission(null);
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string, newUid: string) => {
    localStorage.setItem('dalang_erp_token', newToken);
    localStorage.setItem('dalang_erp_uid', newUid);
    setToken(newToken);
    setUserId(newUid);
  };

  const handleLogout = () => {
    localStorage.removeItem('dalang_erp_token');
    localStorage.removeItem('dalang_erp_uid');
    setToken(null);
    setUserId(null);
    setUserPermission(null);
  };

  return (
    <BrowserRouter>
      {token && userId ? (
        isLoadingAuth && !userPermission ? (
          <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090b]">
            <Terminal className="text-neutral-500 animate-pulse mb-3" size={32} />
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 animate-pulse">
              {t('establishingShell')}
            </span>
          </div>
        ) : (
          <DashboardShell
            token={token}
            userId={userId}
            userPermission={userPermission}
            onLogout={handleLogout}
            showToast={showToast}
            onRefreshPermissions={() => fetchUserAuthority(token)}
          />
        )
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} showToast={showToast} />
      )}

      {/* 全局 Toast 通知容器 */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3.5 max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start justify-between gap-4 p-4 rounded-2xl border border-[#1c1c1e] shadow-2xl animate-uds-fade ${
              t.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse-fast'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {t.type === 'error' && <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
              <span className="text-xs font-semibold tracking-wide uppercase">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-neutral-400 hover:text-white shrink-0 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </BrowserRouter>
  );
}
