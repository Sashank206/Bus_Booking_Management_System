import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Bus,
  Calendar,
  Ticket,
  DollarSign,
  ShieldAlert,
  ArrowRight,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  Activity
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import api from '../../services/api';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/dashboard');
      if (res && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load administrator dashboard data.');
      toast.error(err.message || 'Could not load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleOperatorAction = async (operatorId, decision) => {
    try {
      setActionLoadingId(operatorId);
      await api.patch(`/admin/operators/${operatorId}/approval`, {
        decision,
        rejectionReason: decision === 'rejected' ? 'Application declined after administrative review.' : undefined
      });
      toast.success(
        decision === 'approved'
          ? 'Operator application approved successfully.'
          : 'Operator application rejected.'
      );
      // Refresh dashboard stats
      await fetchDashboard();
    } catch (err) {
      toast.error(err.message || 'Failed to update operator status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const metrics = dashboardData?.metrics || {
    totalUsers: 0,
    totalOperators: 0,
    pendingOperators: 0,
    totalBuses: 0,
    totalTrips: 0,
    totalBookings: 0,
    simulatedRevenue: 0
  };

  const pendingOperators = dashboardData?.recentPendingOperators || [];
  const recentLogs = dashboardData?.recentAuditLogs || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-purple-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-purple-400">
              Platform Master Administration
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-900/60 text-purple-200 border border-purple-700/50">
              Live Production
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            System Overview &amp; Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Real-time platform governance, operator application vetting, stop &amp; route network configuration, and system audit trail.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            icon={RefreshCw}
            onClick={fetchDashboard}
            loading={loading}
          >
            Refresh
          </Button>
          <Link to="/admin/operators">
            <Button variant="accent" size="md" icon={Building2}>
              Review Operators
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      {loading && !dashboardData ? (
        <LoadingSkeleton rows={3} />
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={fetchDashboard}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Registered Customers"
              value={metrics.totalUsers}
              icon={Users}
              color="blue"
              description="Active passenger accounts"
            />
            <StatCard
              title="Bus Operators"
              value={metrics.totalOperators}
              icon={Building2}
              color="purple"
              description="Onboarded transport partners"
            />
            <StatCard
              title="Pending Approvals"
              value={metrics.pendingOperators}
              icon={ShieldAlert}
              color={metrics.pendingOperators > 0 ? 'amber' : 'emerald'}
              description={
                metrics.pendingOperators > 0
                  ? 'Awaiting administrative review'
                  : 'All applications processed'
              }
            />
            <StatCard
              title="Simulated Revenue"
              value={`₹${(metrics.simulatedRevenue || 0).toLocaleString('en-IN')}`}
              icon={DollarSign}
              color="emerald"
              description={`${metrics.totalBookings} total bookings recorded`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              title="Fleet Size"
              value={metrics.totalBuses}
              icon={Bus}
              color="indigo"
              description="Vehicles configured across operators"
            />
            <StatCard
              title="Scheduled Trips"
              value={metrics.totalTrips}
              icon={Calendar}
              color="sky"
              description="Published journeys"
            />
            <StatCard
              title="Confirmed Bookings"
              value={metrics.totalBookings}
              icon={Ticket}
              color="teal"
              description="Passenger ticket reservations"
            />
          </div>

          {/* Pending Applications & Recent Audit Logs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Operator Approval Quick Queue */}
            <Card
              title="Pending Operator Applications"
              subtitle="Recently submitted transport agency registrations"
              action={
                <Link to="/admin/operators">
                  <Button variant="outline" size="sm">
                    View All ({metrics.pendingOperators})
                  </Button>
                </Link>
              }
            >
              {pendingOperators.length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title="Queue is Clear"
                  description="No pending operator registration applications waiting for review at this time."
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingOperators.map((op) => (
                    <div
                      key={op._id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {op.companyName}
                          </h4>
                          <StatusBadge status={op.approvalStatus} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Reg: <span className="font-mono text-slate-700">{op.registrationNumber}</span> | Contact: {op.contactPerson} ({op.userId?.email || '—'})
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={XCircle}
                          loading={actionLoadingId === op._id}
                          onClick={() => handleOperatorAction(op._id, 'rejected')}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                        >
                          Reject
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={CheckCircle}
                          loading={actionLoadingId === op._id}
                          onClick={() => handleOperatorAction(op._id, 'approved')}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Audit Trail */}
            <Card
              title="Recent Audit Activity"
              subtitle="Immutable operational and security event stream"
              action={
                <Link to="/admin/audit-logs">
                  <Button variant="outline" size="sm">
                    Full Audit Log
                  </Button>
                </Link>
              }
            >
              {recentLogs.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No Audit Records"
                  description="System activities will automatically populate this audit feed."
                />
              ) : (
                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                  {recentLogs.map((log) => (
                    <div key={log._id} className="py-2.5 flex items-start gap-3">
                      <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-800">
                            {log.action}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(log.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          Actor: {log.userId?.name || 'System'} ({log.userId?.role || 'internal'}) | IP: {log.ipAddress || '127.0.0.1'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card
              title="Operator Approvals"
              subtitle="Full vetting and account management"
              footer={
                <Link
                  to="/admin/operators"
                  className="text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-1 text-xs"
                >
                  Manage all operators <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              <p className="text-xs text-slate-600 leading-relaxed">
                Approve, reject, activate, or suspend transport operators. Control fleet permissions and manage regulatory compliance.
              </p>
            </Card>

            <Card
              title="Network Master"
              subtitle="Stops and route network"
              footer={
                <Link
                  to="/admin/stops-routes"
                  className="text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-1 text-xs"
                >
                  Configure stops &amp; routes <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              <p className="text-xs text-slate-600 leading-relaxed">
                Define geographic boarding stops, GPS coordinates, multi-city travel corridors, and ordered stop sequences.
              </p>
            </Card>

            <Card
              title="Audit &amp; Security"
              subtitle="Compliance and accountability"
              footer={
                <Link
                  to="/admin/audit-logs"
                  className="text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-1 text-xs"
                >
                  Inspect complete logs <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              <p className="text-xs text-slate-600 leading-relaxed">
                Review immutable event trails capturing user actions, administrative decisions, trip creations, and payment events.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
