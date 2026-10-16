import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Home,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Users,
  X,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { clsx } from '@/lib/utils';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/cashier', label: 'Cashier', icon: ShoppingCart },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/expenses', label: 'Expenses', icon: CreditCard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/reports', label: 'Reports', icon: BarChart2 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  const { business, signOut, user } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-gray-200 transition-all duration-200',
          'lg:relative lg:translate-x-0',
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 lg:w-auto',
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="flex-shrink-0 w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SL</span>
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">SmartLedger NG</p>
              <p className="text-xs text-gray-500 truncate">{business?.name ?? 'Loading...'}</p>
            </div>
          )}
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-gray-600"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: connection status + sign out */}
        <div className="border-t border-gray-100 p-3 space-y-1">
          {!sidebarCollapsed && (
            <div
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium',
                isOnline ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'
              )}
            >
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'Online' : 'Offline — changes not saved'}
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-2.5 mx-0 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
          onClick={() => setSidebarCollapsed((c) => !c)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-10">
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">SL</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">SmartLedger NG</span>
          </div>
          {!isOnline && (
            <div className="ml-auto flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
              <WifiOff size={12} />
              Offline
            </div>
          )}
        </header>

        <main className="flex-1 pb-20 lg:pb-0 overflow-auto">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-10">
          {NAV.slice(0, 5).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors',
                  isActive ? 'text-brand-600' : 'text-gray-500 hover:text-gray-700'
                )
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
