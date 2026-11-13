import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Bus,
  User,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  ArrowRight,
  Ticket,
  HelpCircle,
  Tag,
  Search,
  PhoneCall,
  Clock,
  ChevronDown
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

export default function PublicLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Quick PNR Tracking Modal state
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackPnr, setTrackPnr] = useState('');

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully.');
    setUserDropdownOpen(false);
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'operator') return '/operator/dashboard';
    return '/customer/dashboard';
  };

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (!trackPnr.trim()) return;
    setTrackModalOpen(false);
    navigate(`/customer/dashboard?search=${encodeURIComponent(trackPnr.trim().toUpperCase())}`);
  };

  const navLinks = [
    { label: 'Bus Tickets', path: '/search', icon: Bus },
    { label: 'Track Booking', action: () => setTrackModalOpen(true), icon: Ticket },
    { label: 'Offers', path: '/#offers-section', icon: Tag },
    { label: 'Help', path: '/contact', icon: HelpCircle }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9] text-[#202633] font-sans">
      {/* Top Notification Strip */}
      <div className="bg-[#171C2B] text-white text-[11px] sm:text-xs py-1.5 px-4 text-center font-medium border-b border-[#232A3E]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-2 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16865C] animate-pulse"></span>
            <span>Zero Booking Convenience Fee on First Reservation | Use Code: <strong>BUSGO100</strong></span>
          </div>
          <div className="flex items-center justify-center sm:justify-end gap-4 w-full sm:w-auto text-slate-400">
            <Link to="/operator-register" className="hover:text-white transition-colors">
              Operator Portal &amp; Fleet Registration
            </Link>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1 text-slate-300">
              <PhoneCall className="w-3 h-3 text-[#D92D3A]" />
              <span>24x7 Customer Care</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E4E7EC] shadow-[0_1px_3px_0_rgba(16,24,40,0.06)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Left: Brand Logo & Tagline */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#D92D3A] flex items-center justify-center text-white font-black shadow-xs group-hover:bg-[#B91C2C] transition-colors">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-black tracking-tight text-[#171C2B]">
                  Bus<span className="text-[#D92D3A]">Go</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-[#D92D3A]"></span>
              </div>
              <span className="text-[10px] text-[#667085] block font-semibold uppercase tracking-wider -mt-1 hidden sm:block">
                Travel smarter. Travel easier.
              </span>
            </div>
          </Link>

          {/* Center: Commercial Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-semibold text-[#344054]">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = link.path && location.pathname === link.path;
              if (link.action) {
                return (
                  <button
                    key={link.label}
                    type="button"
                    onClick={link.action}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[#344054] hover:text-[#D92D3A] hover:bg-[#FFF1F2] transition-colors cursor-pointer"
                  >
                    <Icon className="w-4 h-4 text-[#667085]" />
                    <span>{link.label}</span>
                  </button>
                );
              }
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'text-[#D92D3A] bg-[#FFF1F2] font-bold'
                      : 'text-[#344054] hover:text-[#D92D3A] hover:bg-[#FFF1F2]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#D92D3A]' : 'text-[#667085]'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Auth & User Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F9FAFB] text-[#202633] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#171C2B] text-white flex items-center justify-center font-bold">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="text-left">
                    <span className="block font-bold truncate max-w-[120px]">{user?.name}</span>
                    <span className="text-[10px] text-[#667085] uppercase tracking-wider font-semibold block">
                      {user?.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#667085]" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-[#E4E7EC] shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 border-b border-[#F2F4F7]">
                      <span className="text-xs font-bold text-[#202633] block truncate">{user?.name}</span>
                      <span className="text-[11px] text-[#667085] block truncate">{user?.email}</span>
                    </div>

                    <Link
                      to={getDashboardPath()}
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB] hover:text-[#D92D3A]"
                    >
                      <User className="w-4 h-4 text-[#667085]" />
                      <span>My Dashboard</span>
                    </Link>

                    {user?.role === 'customer' && (
                      <Link
                        to="/customer/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB] hover:text-[#D92D3A]"
                      >
                        <Ticket className="w-4 h-4 text-[#667085]" />
                        <span>My Bookings &amp; Tickets</span>
                      </Link>
                    )}

                    <div className="border-t border-[#F2F4F7] my-1"></div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#D92D3A] hover:bg-[#FFF1F2] text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-[#D92D3A]" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-bold text-[#344054] hover:text-[#D92D3A] hover:bg-[#FFF1F2] rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#D92D3A] hover:bg-[#B91C2C] active:bg-[#8F1420] rounded-xl shadow-xs transition-colors"
                >
                  <span>Register</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#475467] hover:text-[#171C2B] p-2 rounded-xl border border-[#D0D5DD]"
            aria-label="Toggle mobile navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-3 pb-6 border-t border-[#E4E7EC] bg-white space-y-3">
            <div className="flex flex-col space-y-1">
              <Link
                to="/search"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold text-[#344054] hover:bg-[#FFF1F2] hover:text-[#D92D3A]"
              >
                <Bus className="w-4 h-4 text-[#D92D3A]" />
                <span>Search Bus Tickets</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setTrackModalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold text-[#344054] hover:bg-[#FFF1F2] hover:text-[#D92D3A] text-left w-full"
              >
                <Ticket className="w-4 h-4 text-[#667085]" />
                <span>Track Booking / PNR Status</span>
              </button>
              <Link
                to="/#offers-section"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold text-[#344054] hover:bg-[#FFF1F2] hover:text-[#D92D3A]"
              >
                <Tag className="w-4 h-4 text-[#667085]" />
                <span>Special Offers</span>
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold text-[#344054] hover:bg-[#FFF1F2] hover:text-[#D92D3A]"
              >
                <HelpCircle className="w-4 h-4 text-[#667085]" />
                <span>Customer Help &amp; Support</span>
              </Link>
            </div>

            <div className="pt-3 border-t border-[#F2F4F7] flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to={getDashboardPath()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold bg-[#171C2B] text-white"
                  >
                    <span>My Dashboard ({user?.role})</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#D92D3A] hover:bg-[#FFF1F2] rounded-lg text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] text-center text-xs font-bold text-[#344054]"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-2.5 rounded-xl bg-[#D92D3A] text-center text-xs font-bold text-white shadow-xs"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Body */}
      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-[#171C2B] text-[#98A2B3] border-t border-[#232A3E] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          {/* Top Row: Brand & Value Props */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#232A3E]">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#D92D3A] flex items-center justify-center text-white font-black shadow-xs">
                  <Bus className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tight text-white">
                  Bus<span className="text-[#D92D3A]">Go</span>
                </span>
              </div>
              <p className="text-xs text-[#98A2B3] leading-relaxed">
                India's premier smart bus ticketing platform. Featuring atomic seat reservations, segment-based inventory management, and transparent refund settlement.
              </p>
              <div className="flex items-center gap-3 text-xs text-white pt-2">
                <span className="px-2.5 py-1 rounded-md bg-[#232A3E] border border-[#344054] font-medium text-[11px]">
                  Verified Operators
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#232A3E] border border-[#344054] font-medium text-[11px]">
                  Instant E-Ticket
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                Popular Bus Corridors
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li><Link to="/search?origin=Delhi&destination=Chandigarh" className="hover:text-white transition-colors">Delhi → Chandigarh AC Volvo</Link></li>
                <li><Link to="/search?origin=Chandigarh&destination=Amritsar" className="hover:text-white transition-colors">Chandigarh → Amritsar Express</Link></li>
                <li><Link to="/search?origin=Delhi&destination=Jaipur" className="hover:text-white transition-colors">Delhi → Jaipur Sleeper</Link></li>
                <li><Link to="/search?origin=Ludhiana&destination=Delhi" className="hover:text-white transition-colors">Ludhiana → Delhi Night Coach</Link></li>
                <li><Link to="/search?origin=Bengaluru&destination=Chennai" className="hover:text-white transition-colors">Bengaluru → Chennai Intercity</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                Passenger Support &amp; Policy
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li><Link to="/search" className="hover:text-white transition-colors">Book Bus Tickets</Link></li>
                <li><button type="button" onClick={() => setTrackModalOpen(true)} className="hover:text-white transition-colors text-left">Track PNR Status</button></li>
                <li><Link to="/about" className="hover:text-white transition-colors">Cancellation &amp; Refund Policy</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">24x7 Customer Help Center</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">Terms of Carriage &amp; Privacy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                Operator &amp; Governance
              </h4>
              <ul className="space-y-2.5 text-xs mb-4">
                <li><Link to="/operator-register" className="text-[#D92D3A] hover:text-white font-bold transition-colors">Register as Bus Operator</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Operator Fleet Login</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Admin Control Center</Link></li>
              </ul>
              <div className="p-3.5 rounded-xl bg-[#232A3E]/60 border border-[#344054]/80 text-[11px] text-slate-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  Simulated Payment Guarantee
                </span>
                <p className="text-[#98A2B3]">
                  All transactions run via atomic simulated payments with strict idempotency keys.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#667085] gap-4">
            <p>&copy; {new Date().getFullYear()} BusGo Technologies Pvt. Ltd. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/about" className="hover:text-white transition-colors">About BusGo</Link>
              <Link to="/contact" className="hover:text-white transition-colors">Support Desk</Link>
              <Link to="/operator-register" className="hover:text-white transition-colors">Operator Hub</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* PNR Tracker Modal */}
      <Modal
        isOpen={trackModalOpen}
        onClose={() => setTrackModalOpen(false)}
        title="Track Booking / PNR Status"
        subtitle="Enter your 10-character booking PNR to view current journey status"
        size="md"
      >
        <form onSubmit={handleTrackSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-1.5">
              Booking PNR Number
            </label>
            <div className="relative">
              <Ticket className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="e.g., BG9AB735B9"
                value={trackPnr}
                onChange={(e) => setTrackPnr(e.target.value.toUpperCase())}
                maxLength={12}
                className="block w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#D0D5DD] text-sm font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#D92D3A]/20 focus:border-[#D92D3A]"
                required
              />
            </div>
            <p className="text-[11px] text-[#667085] mt-1">
              Find your PNR in your ticket confirmation SMS or email.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setTrackModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={Search}
            >
              Check Booking Status
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
