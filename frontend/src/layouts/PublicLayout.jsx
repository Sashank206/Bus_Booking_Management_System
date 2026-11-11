import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Bus, User, LogOut, ShieldCheck, Menu, X, ArrowRight } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';

export default function PublicLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully.');
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'operator') return '/operator/dashboard';
    return '/customer/dashboard';
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Search Trips', path: '/search' },
    { label: 'About Us', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-sm backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-xs group-hover:bg-amber-400 transition-colors">
              <Bus className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Bus<span className="text-amber-400">Go</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`transition-colors hover:text-white ${
                    isActive ? 'text-amber-400 font-semibold' : ''
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to={getDashboardPath()}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors"
                >
                  <User className="w-4 h-4 text-amber-400" />
                  <span>{user?.name?.split(' ')[0] || 'Dashboard'}</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-900 text-amber-400 border border-slate-700">
                    {user?.role}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Logout"
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/operator-register"
                  className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
                >
                  Become an Operator
                </Link>
                <Link
                  to="/login"
                  className="text-xs font-semibold text-slate-200 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-lg transition-colors shadow-xs"
                >
                  Register
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-slate-400 hover:text-white p-2 rounded-lg"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-6 border-t border-slate-800 bg-slate-900/95 space-y-3">
            <div className="flex flex-col space-y-2 pt-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to={getDashboardPath()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-slate-800 text-white"
                  >
                    <User className="w-4 h-4 text-amber-400" />
                    <span>My Dashboard ({user?.role})</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-rose-400 hover:bg-slate-800 text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-800"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-md text-sm font-semibold bg-amber-500 text-slate-950 text-center"
                  >
                    Customer Registration
                  </Link>
                  <Link
                    to="/operator-register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-md text-xs font-medium text-slate-400 hover:text-white text-center"
                  >
                    Operator Business Registration
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <div className="w-7 h-7 rounded bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
                  <Bus className="w-4 h-4" />
                </div>
                <span>
                  Bus<span className="text-amber-400">Go</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Production-quality bus booking management platform featuring segment-based seat inventory, atomic reservation holds, and role-based transport administration.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                Customer Services
              </h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/search" className="hover:text-white transition-colors">Search Trips</Link></li>
                <li><Link to="/customer/dashboard" className="hover:text-white transition-colors">Manage Bookings</Link></li>
                <li><Link to="/customer/profile" className="hover:text-white transition-colors">Passenger Profile</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                Business & Partners
              </h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/operator-register" className="hover:text-white transition-colors">Operator Onboarding</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Operator Portal</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Admin Governance</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                Security & Verification
              </h4>
              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60 text-xs space-y-1">
                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Simulated Payment Mode
                </span>
                <p className="text-[11px] text-slate-400">
                  Strictly simulated payments with idempotency keys. No real card details stored.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>&copy; {new Date().getFullYear()} BusGo Transport Systems. All rights reserved.</p>
            <div className="flex gap-4">
              <Link to="/about" className="hover:text-slate-400">About</Link>
              <Link to="/contact" className="hover:text-slate-400">Support</Link>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Node.js + React Monolith</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

