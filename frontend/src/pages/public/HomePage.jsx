import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Calendar,
  ShieldCheck,
  Zap,
  RotateCcw,
  Users,
  Bus,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import Button from '../../components/ui/Button';

export default function HomePage() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (origin) params.append('origin', origin);
    if (destination) params.append('destination', destination);
    if (travelDate) params.append('date', travelDate);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-850 text-white pt-12 pb-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold uppercase tracking-wider mb-4">
              <Zap className="w-3.5 h-3.5" />
              Next-Gen Bus Reservation Architecture
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
              Smarter Travel with <span className="text-amber-400">Segment-Based</span> Booking
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Book your journey with atomic seat holds, dynamic segment inventory, and instant ticket confirmations across India's premier bus operators.
            </p>
          </div>

          {/* Search Card */}
          <div className="max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-100">
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Origin */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    From (Origin)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g., Delhi, Mumbai, Bengaluru"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="block w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                    />
                  </div>
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    To (Destination)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g., Amritsar, Pune, Chennai"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="block w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Travel Date
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      type="date"
                      value={travelDate}
                      onChange={(e) => setTravelDate(e.target.value)}
                      className="block w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  className="w-full sm:w-auto px-8"
                  icon={Search}
                >
                  Search Available Buses
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Engineered for Reliability and Scale
          </h2>
          <p className="text-sm text-slate-600">
            BusGo solves classic overbooking and race conditions through strict database guarantees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Segment-Based Seat Reuse
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Physical seats can be reused across non-overlapping route segments using mathematical intervals <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">[from, to)</code>.
            </p>
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono">
              Delhi → Ludhiana &amp; Ludhiana → Amritsar share same seat seamlessly.
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Atomic Holds &amp; Rollback
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Temporary 10-minute seat holds are guarded by atomic conditional operations on MongoDB inventory records, eliminating race conditions.
            </p>
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono">
              Multi-seat selections roll back cleanly if any seat encounters conflict.
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-5">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Partial Passenger Cancellations
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Cancel specific passengers while preserving the rest of the booking. Only cancelled seat segments are released back to the inventory pool.
            </p>
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono">
              Policy snapshot captures exact refund percentage at request time.
            </div>
          </div>
        </div>
      </section>

      {/* Operator Onboarding CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-8 sm:p-12 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-2">
              For Fleet &amp; Transport Agencies
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
              Grow Your Transport Business with BusGo
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Register as an operator, manage your fleet with interactive seat layouts, schedule routes, and track real-time occupancy and simulated earnings.
            </p>
          </div>
          <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link to="/operator-register" className="w-full sm:w-auto">
              <Button variant="accent" size="lg" className="w-full" icon={Building2}>
                Operator Registration
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                Operator Login
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Building2(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

