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
  Activity,
  TrendingUp,
  Percent,
  TrendingDown
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
import DateRangeFilter from '../../components/common/DateRangeFilter';
import {
  TrendLineChart,
  StatusBarChart,
  OccupancyGauge
} from '../../components/analytics/AnalyticsCharts';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [dateFilter, setDateFilter] = useState({ range: '30days', startDate: '', endDate: '' });
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        range: dateFilter.range,
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate
      };

      const [analyticsRes, dashRes] = await Promise.all([
        api.get('/admin/analytics/overview', { params }),
        api.get('/admin/dashboard')
      ]);

      if (analyticsRes?.data) setAnalyticsData(analyticsRes.data);
      if (dashRes?.data) setDashboardData(dashRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load administrator analytics.');
      toast.error(err.message || 'Could not load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, toast]);

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
      await fetchDashboard();
    } catch (err) {
      toast.error(err.message || 'Failed to update operator status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const summary = analyticsData?.summary || {
    totalCustomers: 0,
    totalOperators: 0,
    pendingOperators: 0,
    approvedOperators: 0,
    totalBuses: 0,
    totalRoutes: 0,
    totalTrips: 0,
    totalBookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0,
    grossBookingRevenue: 0,
    totalRefunds: 0,
    netRevenue: 0
  };

  const charts = analyticsData?.charts || {
    bookingTrends: [],
    bookingStatusDistribution: [],
    busOccupancyOverview: { averageOccupancyPercentage: 0 },
    topOperators: [],
    popularRoutes: [],
    monthlyComparison: { currentMonth: 0, previousMonth: 0, percentageChange: 0 }
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
              Live System State
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Executive Analytics Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Real-time financial reconciliation, customer growth, booking volume, and fleet occupancy across all transport operators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/reports">
            <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs">
              <TrendingUp className="w-4 h-4 mr-1.5" />
              Full Reports Hub
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={fetchDashboard}
            disabled={loading}
            icon={RefreshCw}
            className="text-xs"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Global Date Range Filter */}
      <DateRangeFilter
        selectedRange={dateFilter.range}
        startDate={dateFilter.startDate}
        endDate={dateFilter.endDate}
        onChange={(newFilter) => setDateFilter(newFilter)}
        onRefresh={fetchDashboard}
        loading={loading}
      />

      {loading && !analyticsData ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <>
          {/* Key KPI Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Net Revenue"
              value={`₹${summary.netRevenue.toLocaleString()}`}
              subtitle={`Gross: ₹${summary.grossBookingRevenue.toLocaleString()} | Refunds: ₹${summary.totalRefunds.toLocaleString()}`}
              icon={DollarSign}
              variant="primary"
            />
            <StatCard
              title="Total Bookings"
              value={summary.totalBookings.toLocaleString()}
              subtitle={`${summary.confirmedBookings} Confirmed | ${summary.cancelledBookings} Cancelled`}
              icon={Ticket}
            />
            <StatCard
              title="Active Fleet"
              value={`${summary.totalBuses} Buses`}
              subtitle={`${summary.totalRoutes} Routes | ${summary.totalTrips} Trips`}
              icon={Bus}
            />
            <StatCard
              title="Transport Operators"
              value={`${summary.approvedOperators} Approved`}
              subtitle={`${summary.pendingOperators} Applications Pending`}
              icon={Building2}
              trend={
                summary.pendingOperators > 0
                  ? { value: `${summary.pendingOperators} need review`, isPositive: false }
                  : { value: 'All reviewed', isPositive: true }
              }
            />
          </div>

          {/* Visual Analytics Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Booking Trends Chart (2 cols) */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
              <TrendLineChart
                data={charts.bookingTrends}
                xKey="_id"
                yKey="totalBookings"
                title="Daily Booking Volume Trends"
                height={220}
                strokeColor="#9333ea"
                fillColor="#d8b4fe"
                valueSuffix=" bookings"
              />
            </div>

            {/* Occupancy Gauge & Monthly Comparison (1 col) */}
            <div className="space-y-4">
              <OccupancyGauge
                percentage={charts.busOccupancyOverview?.averageOccupancyPercentage || 0}
                title="Average Fleet Occupancy"
                subtitle="Calculated across active scheduled trips"
              />

              {/* Monthly Comparison Card */}
              <Card className="p-4 border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Monthly Performance
                  </h4>
                  <span
                    className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
                      charts.monthlyComparison.percentageChange >= 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {charts.monthlyComparison.percentageChange >= 0 ? '+' : ''}
                    {charts.monthlyComparison.percentageChange}% vs Last Month
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-4">
                  <div>
                    <span className="text-2xl font-bold text-slate-900">
                      {charts.monthlyComparison.currentMonth}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">This Month</span>
                  </div>
                  <div className="text-slate-400 text-xs">
                    Previous: <strong className="text-slate-600">{charts.monthlyComparison.previousMonth}</strong>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Booking Status Distribution & Popular Routes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Booking Status Breakdown" subtitle="Distribution across payment and lifecycle statuses">
              <StatusBarChart
                data={charts.bookingStatusDistribution}
                title="Booking Statuses"
                totalLabel="Total Sampled"
              />
            </Card>

            <Card title="Popular Travel Corridors" subtitle="Most booked routes by passenger volume">
              {charts.popularRoutes.length === 0 ? (
                <EmptyState title="No Route Data" description="Route analytics will appear once bookings are placed." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {charts.popularRoutes.map((route, idx) => (
                    <div key={route._id || idx} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-700 font-bold text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{route.routeName}</p>
                          <p className="text-[10px] text-slate-400">{route.bookingCount} bookings confirmed</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-900">₹{route.revenue?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Operator Approvals Queue & Recent Audit Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Pending Operator Applications"
              subtitle="Recently submitted transport agency registrations"
              action={
                <Link to="/admin/operators">
                  <Button variant="outline" size="sm">
                    View All ({summary.pendingOperators})
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
                          <h4 className="text-sm font-bold text-slate-900">{op.companyName}</h4>
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
                          <span className="text-xs font-semibold text-slate-800">{log.action}</span>
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
        </>
      )}
    </div>
  );
}
