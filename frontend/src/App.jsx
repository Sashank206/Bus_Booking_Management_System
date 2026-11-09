import { useState, useEffect } from 'react';
import {
  Bus,
  ShieldCheck,
  Server,
  Layers,
  Database,
  Users,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { checkApiHealth } from './services/api';

function App() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const performHealthCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkApiHealth();
      setHealthStatus(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend API server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Attempt initial health check on load
    performHealthCheck();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">
                Bus<span className="text-amber-400">Go</span>
              </span>
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Phase 2 Ready
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Monolith Architecture
            </span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <span className="hidden sm:inline text-slate-400">Node.js + React + MongoDB</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-8 mb-10 shadow-lg border border-slate-800">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold mb-4">
              <Layers className="w-4 h-4" />
              Full-Stack Architecture Verification
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
              BusGo Management System
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-6">
              Production-quality bus booking and transport management platform engineered with segment-based seat availability, atomic reservations, multi-role access control, and simulated idempotent payment workflows.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={performHealthCheck}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors shadow-sm disabled:opacity-70 cursor-pointer"
              >
                <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Checking Backend...' : 'Verify Backend Connection'}
              </button>
              <a
                href="#roles"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors border border-slate-700"
              >
                View Roles & Capabilities
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Live System Connectivity Card */}
        <section className="mb-10">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Backend API Connectivity</h2>
                  <p className="text-xs text-slate-500">
                    Endpoint: <code className="font-mono text-slate-700">GET /api/health</code>
                  </p>
                </div>
              </div>

              <div>
                {loading && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-3.5 h-3.5 animate-spin" /> Connecting...
                  </span>
                )}
                {!loading && healthStatus && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Healthy & Connected
                  </span>
                )}
                {!loading && error && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                    <AlertCircle className="w-3.5 h-3.5" /> Connection Offline
                  </span>
                )}
              </div>
            </div>

            {healthStatus ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    API Status
                  </span>
                  <span className="text-sm font-bold text-emerald-600 uppercase">
                    {healthStatus.status}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Service Name
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {healthStatus.service}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Environment
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {healthStatus.environment}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Uptime
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {healthStatus.uptimeSeconds}s
                  </span>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Backend server not running currently</p>
                  <p className="mt-1 text-xs text-amber-700">
                    Start the backend server using <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-medium">npm --prefix backend run dev</code> to verify live communication with the frontend.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500 py-3">
                Press "Verify Backend Connection" above to test API connectivity.
              </div>
            )}
          </div>
        </section>

        {/* Roles Section */}
        <section id="roles" className="mb-10">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Supported System Roles</h2>
            <p className="text-sm text-slate-500">
              Role-specific routing, authorization guards, and custom operational views.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Customer Role */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">1. Customer Portal</h3>
              <p className="text-xs text-slate-500 mb-4">
                Origin/destination search, interactive seat maps, temporary holds, PNR tracking, and partial cancellations.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-600">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Segment-based seat selection
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Real-time hold expiration (10 min)
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Simulated payment confirmation
                </li>
              </ul>
            </div>

            {/* Operator Role */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Bus className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">2. Bus Operator Portal</h3>
              <p className="text-xs text-slate-500 mb-4">
                Self-service onboarding, bus fleet configuration, trip scheduling, passenger manifests, and revenue metrics.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-600">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Fleet layout & amenities setup
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Trip schedule & fare assignments
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Strict operator ownership isolation
                </li>
              </ul>
            </div>

            {/* Administrator Role */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">3. Administrator Portal</h3>
              <p className="text-xs text-slate-500 mb-4">
                System oversight, operator approval/rejection workflows, master stop & route catalog, and audit logs.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-600">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Operator business verification
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Global stop sequence management
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Immutable audit trail inspection
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Database & Technical Decisions Card */}
        <section className="bg-slate-900 text-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-slate-800 text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Phase 1 Architecture Confirmed Decisions</h3>
              <p className="text-xs text-slate-400">
                18 collections, half-open intervals <code className="text-amber-300 font-mono">[fromSequence, toSequence)</code>, and atomic reservation guards.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <span className="font-semibold text-amber-400 block mb-1">Segment Allocation</span>
              <p className="text-slate-300">
                Seats are reusable along distinct segments when <code className="text-slate-200">existingFrom &lt; reqTo &amp;&amp; existingTo &gt; reqFrom</code> is false.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <span className="font-semibold text-amber-400 block mb-1">Atomic Holds</span>
              <p className="text-slate-300">
                Conditional update guards on SeatInventory avoid double booking without naive read-then-write race conditions.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <span className="font-semibold text-amber-400 block mb-1">Partial Cancellation</span>
              <p className="text-slate-300">
                Passenger-level seat cancellation releases only the cancelled segment, keeping other passengers confirmed.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <span className="font-semibold text-amber-400 block mb-1">Simulated Payments</span>
              <p className="text-slate-300">
                Idempotency key protection and backend-driven state transitions ensure reliable financial simulation.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        BusGo &copy; 2026. Production Full-Stack Bus Booking Management System.
      </footer>
    </div>
  );
}

export default App;
