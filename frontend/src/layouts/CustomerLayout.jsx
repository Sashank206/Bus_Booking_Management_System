import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Bus, Ticket, Search, User, LogOut } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  const navItems = [
    { label: 'My Bookings', path: '/customer/dashboard', icon: Ticket },
    { label: 'Search Buses', path: '/search', icon: Search },
    { label: 'My Profile', path: '/customer/profile', icon: User }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Customer Header */}
      <header className="bg-navy text-white border-b border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-black text-white tracking-tight">
                  Bus<span className="text-primary">Go</span>
                </span>
                <span className="text-[10px] block text-slate-400 font-semibold tracking-wider uppercase -mt-1">
                  Customer Portal
                </span>
              </div>
            </Link>

            <nav className="hidden sm:flex items-center gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-primary">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-white block leading-tight">
                  {user?.name}
                </span>
                <span className="text-[11px] text-slate-400 block leading-tight">
                  {user?.email}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
}
