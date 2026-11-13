import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  X,
  Bus
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Administrator signed out.');
    navigate('/login');
  };

  const navItems = [
    { label: 'System Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
    { label: 'Operator Approvals', path: '/admin/operators', icon: Users },
    { label: 'Stops & Routes', path: '/admin/stops-routes', icon: MapPin },
    { label: 'Trips Master', path: '/admin/trips', icon: Calendar },
    { label: 'Bookings & Refunds', path: '/admin/bookings', icon: CreditCard },
    { label: 'Audit Trail', path: '/admin/audit-logs', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 flex font-sans">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar (Dark Navy #171C2B) */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-navy text-white flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-tight">
                Bus<span className="text-primary">Go</span>
              </span>
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider -mt-1">
                Admin Console
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

        {/* Admin Tag */}
        <div className="p-3.5 mx-3 my-3 rounded-2xl bg-slate-850 border border-slate-800 text-xs">
          <span className="font-bold text-white block mb-0.5">Platform Governance</span>
          <span className="text-[11px] text-slate-400 block truncate font-mono">{user?.email}</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-600 hover:text-navy p-2 rounded-xl hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-black text-navy">
              {navItems.find((n) => n.path === location.pathname)?.label || 'Administration'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
              Super Admin
            </span>
            <div className="w-9 h-9 rounded-full bg-navy text-white flex items-center justify-center font-black text-xs">
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="p-6 md:p-8 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
