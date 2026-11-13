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
    <div className="min-h-screen bg-slate-50/60 flex font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation (Dark Navy #171C2B) */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-navy text-white flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold shadow-xs">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-tight">
                Bus<span className="text-primary">Go</span>
              </span>
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider -mt-1">
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
        <div className="p-4 mx-3 my-3 rounded-2xl bg-slate-850 border border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-white truncate max-w-[130px]">
              {operator?.companyName || 'Operator Profile'}
            </span>
            <StatusBadge status={operator?.approvalStatus || 'pending'} />
          </div>
          <span className="text-[11px] text-slate-400 block truncate font-medium">
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

        {/* Sidebar Footer */}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
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
              {navItems.find((n) => n.path === location.pathname)?.label || 'Operator Portal'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-navy block leading-tight">
                {operator?.companyName || user?.name}
              </span>
              <span className="text-[11px] text-slate-400 block leading-tight font-medium">
                Reg: {operator?.registrationNumber || 'Pending'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black text-xs">
              {(operator?.companyName || user?.name || 'O').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Approval Pending / Suspended Warning Banner */}
        {isPending && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3 text-amber-950 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p>
              <strong className="font-bold">Operator Account Pending Approval:</strong> Your fleet business documents are currently being reviewed by platform administrators. You can configure buses and routes, but passenger ticket booking will activate upon formal approval.
            </p>
          </div>
        )}

        {isSuspended && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-center gap-3 text-rose-950 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <p>
              <strong className="font-bold">Account Suspended:</strong> Operator services are temporarily suspended. Please contact platform administration.
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
