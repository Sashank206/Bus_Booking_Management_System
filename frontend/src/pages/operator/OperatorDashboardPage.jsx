import { Link } from 'react-router-dom';
import { Bus, Calendar, Ticket, DollarSign, Plus, AlertCircle, Building2 } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

export default function OperatorDashboardPage() {
  const { user, operator, isOperatorApproved } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-amber-400 block mb-1">
            Operator Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {operator?.companyName || user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Fleet management, trip schedules, passenger manifests, and simulated revenue analytics.
          </p>
        </div>

        {isOperatorApproved && (
          <div className="flex gap-3">
            <Link to="/operator/buses">
              <Button variant="accent" size="md" icon={Plus}>
                Add Bus
              </Button>
            </Link>
            <Link to="/operator/trips">
              <Button variant="secondary" size="md" icon={Calendar}>
                Schedule Trip
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Fleet Size"
          value="0"
          icon={Bus}
          color="amber"
          description="Registered buses"
        />
        <StatCard
          title="Scheduled Trips"
          value="0"
          icon={Calendar}
          color="blue"
          description="Active journeys"
        />
        <StatCard
          title="Total Bookings"
          value="0"
          icon={Ticket}
          color="purple"
          description="Passenger seats"
        />
        <StatCard
          title="Simulated Revenue"
          value="₹0"
          icon={DollarSign}
          color="emerald"
          description="Confirmed payments"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Upcoming Trips"
            subtitle="Scheduled departures and occupancy monitoring"
            action={
              isOperatorApproved ? (
                <Link to="/operator/trips">
                  <Button variant="outline" size="sm">
                    Manage Trips
                  </Button>
                </Link>
              ) : null
            }
          >
            <EmptyState
              icon={Calendar}
              title="No upcoming trips scheduled"
              description={
                isOperatorApproved
                  ? 'Schedule your first trip across our stop network to start receiving customer bookings.'
                  : 'Trip scheduling will become enabled once an administrator approves your operator profile.'
              }
            />
          </Card>
        </div>

        <div>
          <Card title="Operator Information" subtitle="Verified business record">
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Company Name</span>
                <span className="text-slate-900 font-bold">{operator?.companyName || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Registration No.</span>
                <span className="text-slate-900 font-bold">{operator?.registrationNumber || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Contact Person</span>
                <span className="text-slate-900 font-bold">{operator?.contactPerson || user?.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Approval Status</span>
                <span className="uppercase font-bold text-amber-600">{operator?.approvalStatus || 'Pending'}</span>
              </div>
              <div className="pt-2">
                <span className="text-slate-500 font-medium block mb-1">Business Address</span>
                <p className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {operator?.businessAddress || 'Address not registered'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

