import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Bus,
  LayoutDashboard,
  Calendar,
  FileText,
  BarChart3,
  Building2,
  LogOut,
  AlertTriangle,
  Menu,
  X
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import StatusBadge from '../components/ui/StatusBadge';

export default function OperatorLayout() {
  const { user, operator, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/operator/dashboard', icon: LayoutDashboard },
    { label: 'Bus Fleet', path: '/operator/buses', icon: Bus },
    { label: 'Trips & Schedules', path: '/operator/trips', icon: Calendar },
    { label: 'Passenger Manifests', path: '/operator/manifests', icon: FileText },
    { label: 'Occupancy & Revenue', path: '/operator/reports', icon: BarChart3 },
    { label: 'Company Profile', path: '/operator/profile', icon: Building2 }
  ];

  const isPending = operator?.approvalStatus === 'pending';
  const isSuspended = operator?.approvalStatus === 'suspended';

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
              <Bus className="w-4 h-4" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">
                Bus<span className="text-amber-400">Go</span>
              </span>
              <span className="text-[10px] text-amber-400 block font-semibold uppercase tracking-wider">
                Operator Portal
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operator Profile Card in Sidebar */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-white truncate">
              {operator?.companyName || 'Operator Profile'}
            </span>
            <StatusBadge status={operator?.approvalStatus || 'pending'} />
          </div>
          <span className="text-[11px] text-slate-400 block truncate">
            {user?.email}
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-600 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-slate-900">
              {navItems.find((n) => n.path === location.pathname)?.label || 'Operator Portal'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                {operator?.companyName || user?.name}
              </span>
              <span className="text-[11px] text-slate-500 block leading-tight">
                Reg: {operator?.registrationNumber || 'Pending'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center font-bold text-xs">
              {(operator?.companyName || user?.name || 'O').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Approval Pending / Suspended Warning Banner */}
        {isPending && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3 text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p>
              <strong className="font-semibold">Operator Account Pending Approval:</strong> Your business information is currently being reviewed by platform administrators. You can configure your company profile, but trip publishing and booking operations will become active once approved.
            </p>
          </div>
        )}

        {isSuspended && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-center gap-3 text-rose-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <p>
              <strong className="font-semibold">Account Suspended:</strong> Your operator operations are temporarily suspended. Please contact platform administration.
            </p>
          </div>
        )}

        {/* Page Content */}
        <main className="p-6 md:p-8 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

