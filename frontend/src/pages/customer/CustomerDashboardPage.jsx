import { Link } from 'react-router-dom';
import { Ticket, Search, User, Clock, AlertCircle } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

export default function CustomerDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-amber-400 block mb-1">
            Customer Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            View your upcoming bus journeys, check PNR statuses, download booking tickets, or request partial cancellations.
          </p>
        </div>

        <Link to="/search">
          <Button variant="accent" size="md" icon={Search}>
            Book New Trip
          </Button>
        </Link>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block uppercase">
                Active Bookings
              </span>
              <span className="text-xl font-bold text-slate-900">0</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block uppercase">
                Active Seat Holds
              </span>
              <span className="text-xl font-bold text-slate-900">0</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block uppercase">
                Account Status
              </span>
              <span className="text-sm font-bold text-emerald-600 uppercase">
                {user?.accountStatus || 'Active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings Card */}
      <Card
        title="My Recent Bookings"
        subtitle="Historical and confirmed tickets under your account"
        action={
          <Link to="/search">
            <Button variant="secondary" size="sm" icon={Search}>
              Search Routes
            </Button>
          </Link>
        }
      >
        <EmptyState
          icon={Ticket}
          title="No bookings yet"
          description="You haven't reserved any bus tickets yet. Search our route network to find and book your next journey."
          action={
            <Link to="/search">
              <Button variant="accent" size="sm" icon={Search}>
                Find a Bus
              </Button>
            </Link>
          }
        />
      </Card>
    </div>
  );
}

