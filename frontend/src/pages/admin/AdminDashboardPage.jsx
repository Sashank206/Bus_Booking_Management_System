import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Bus,
  Calendar,
  Ticket,
  DollarSign,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-purple-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-purple-400 block mb-1">
            Platform Master Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            System Overview &amp; Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Global governance, operator application vetting, stop &amp; route network configuration, and system-wide audit logging.
          </p>
        </div>

        <Link to="/admin/operators">
          <Button variant="accent" size="md" icon={Building2}>
            Review Operators
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Users"
          value="0"
          icon={Users}
          color="blue"
          description="Registered accounts"
        />
        <StatCard
          title="Bus Operators"
          value="0"
          icon={Building2}
          color="purple"
          description="Transport agencies"
        />
        <StatCard
          title="Pending Approvals"
          value="0"
          icon={ShieldAlert}
          color="amber"
          description="Operators waiting review"
        />
        <StatCard
          title="Total Platform Bookings"
          value="0"
          icon={Ticket}
          color="emerald"
          description="Confirmed journeys"
        />
      </div>

      {/* Grid of Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          title="Operator Approvals"
          subtitle="Vetting new business registrations"
          footer={
            <Link to="/admin/operators" className="text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-1">
              Open approval queue <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          <p className="text-xs text-slate-600 leading-relaxed">
            Review submitted operator credentials, registration numbers, contact details, and approve or reject applications to permit trip publishing.
          </p>
        </Card>

        <Card
          title="Network Master"
          subtitle="Stop locations and route paths"
          footer={
            <Link to="/admin/stops-routes" className="text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-1">
              Configure network <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          <p className="text-xs text-slate-600 leading-relaxed">
            Manage global physical stops, GPS coordinates, reusable routes, and ordered stop sequences for trip scheduling.
          </p>
        </Card>

        <Card
          title="Audit Trail"
          subtitle="Security & operational tracking"
          footer={
            <Link to="/admin/audit-logs" className="text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-1">
              Inspect logs <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          <p className="text-xs text-slate-600 leading-relaxed">
            Examine tamper-evident operational logs covering customer registrations, operator onboarding, trip publishing, and payment simulations.
          </p>
        </Card>
      </div>
    </div>
  );
}

