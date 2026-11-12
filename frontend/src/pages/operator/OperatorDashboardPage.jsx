import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bus,
  Calendar,
  Ticket,
  DollarSign,
  Plus,
  AlertCircle,
  Building2,
  RefreshCw,
  Percent,
  CheckCircle,
  Eye,
  ArrowRight,
  Clock,
  TrendingUp,
  FileText,
  XCircle,
  MapPin
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import api from '../../services/api';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import {
  TrendLineChart,
  OccupancyGauge
} from '../../components/analytics/AnalyticsCharts';

export default function OperatorDashboardPage() {
  const { user, operator, isOperatorApproved } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [dateFilter, setDateFilter] = useState({ range: '30days', startDate: '', endDate: '' });
  const [activityTab, setActivityTab] = useState('bookings'); // 'bookings' | 'trips' | 'cancellations' | 'refunds'

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        range: dateFilter.range,
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate
      };
      const res = await api.get('/operator/analytics/overview', { params });
      if (res && res.data) {
        setAnalyticsData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load operator metrics.');
      toast.error(err.message || 'Could not fetch operator statistics.');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, toast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const metrics = analyticsData?.metrics || {
    totalBuses: 0,
    activeBuses: 0,
    totalRoutesServed: 0,
    upcomingTrips: 0,
    completedTrips: 0,
    cancelledTrips: 0,
    totalBookings: 0,
    confirmedPassengers: 0,
    grossRevenue: 0,
    totalRefunds: 0,
    netRevenue: 0,
    averageOccupancyPercentage: 0
  };

  const charts = analyticsData?.charts || {
    bookingTrends: [],
    popularRoutes: []
  };

  const recentActivity = analyticsData?.recentActivity || {
    recentBookings: [],
    upcomingTrips: [],
    recentCancellations: [],
    recentRefunds: []
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-400">
              Transport Operator Console
            </span>
            <StatusBadge status={operator?.approvalStatus || 'pending'} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {operator?.companyName || user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Fleet management, trip scheduling, passenger manifests, occupancy auditing, and revenue reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/operator/manifests">
            <Button variant="secondary" size="sm" icon={FileText} className="text-xs">
              Boarding Manifests
            </Button>
          </Link>
          <Link to="/operator/reports">
            <Button variant="outline" size="sm" icon={TrendingUp} className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs">
              Fleet Reports
            </Button>
          </Link>

          {isOperatorApproved && (
            <div className="flex gap-2">
              <Link to="/operator/buses">
                <Button variant="accent" size="sm" icon={Plus} className="text-xs">
                  Add Bus
                </Button>
              </Link>
              <Link to="/operator/trips">
                <Button variant="primary" size="sm" icon={Calendar} className="text-xs">
                  Schedule Trip
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Pending Approval Notice */}
      {!isOperatorApproved && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-4">
          <div className="p-2 bg-amber-500/20 text-amber-600 rounded-xl shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900">Application Under Administrative Review</h3>
            <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
              Your transport operator registration has been received and is pending validation by platform administrators. Once approved, you can schedule bus trips, configure seat inventories, and receive passenger bookings.
            </p>
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      <DateRangeFilter
        selectedRange={dateFilter.range}
        startDate={dateFilter.startDate}
        endDate={dateFilter.endDate}
        onChange={(newFilter) => setDateFilter(newFilter)}
        onRefresh={fetchDashboard}
        loading={loading}
      />

      {loading && !analyticsData ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <>
          {/* Key KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Net Ticket Earnings"
              value={`₹${metrics.netRevenue.toLocaleString()}`}
              subtitle={`Gross: ₹${metrics.grossRevenue.toLocaleString()} | Refunds: ₹${metrics.totalRefunds.toLocaleString()}`}
              icon={DollarSign}
              variant="primary"
            />
            <StatCard
              title="Confirmed Passengers"
              value={metrics.confirmedPassengers.toLocaleString()}
              subtitle={`Across ${metrics.totalBookings} total bookings`}
              icon={Ticket}
            />
            <StatCard
              title="Active Fleet"
              value={`${metrics.activeBuses} / ${metrics.totalBuses} Buses`}
              subtitle={`Serving ${metrics.totalRoutesServed} routes`}
              icon={Bus}
            />
            <StatCard
              title="Upcoming Trips"
              value={metrics.upcomingTrips.toString()}
              subtitle={`${metrics.completedTrips} Completed | ${metrics.cancelledTrips} Cancelled`}
              icon={Calendar}
            />
          </div>

          {/* Visual Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
              <TrendLineChart
                data={charts.bookingTrends}
                xKey="_id"
                yKey="bookings"
                title="Booking Trends for Your Fleet"
                height={220}
                strokeColor="#2563eb"
                fillColor="#93c5fd"
                valueSuffix=" bookings"
              />
            </div>

            <div className="space-y-4">
              <OccupancyGauge
                percentage={metrics.averageOccupancyPercentage}
                title="Fleet Seat Utilization"
                subtitle="Calculated across your active scheduled trips"
              />

              <Card title="Top Performing Routes" subtitle="Your most in-demand travel corridors">
                {charts.popularRoutes.length === 0 ? (
                  <EmptyState title="No Route Data" description="Route data will populate as bookings occur." />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {charts.popularRoutes.map((r, i) => (
                      <div key={r._id || i} className="py-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{r.routeName}</span>
                        <span className="font-bold text-blue-600">{r.bookings} bookings</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Tabbed Recent Activity Section */}
          <Card
            title="Operational Activity Stream"
            subtitle="Latest bookings, upcoming trips, cancellations, and refunds"
            action={
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {[
                  { id: 'bookings', label: 'Recent Bookings' },
                  { id: 'trips', label: 'Upcoming Trips' },
                  { id: 'cancellations', label: 'Cancellations' },
                  { id: 'refunds', label: 'Refunds' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActivityTab(t.id)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      activityTab === t.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            }
          >
            {activityTab === 'bookings' && (
              recentActivity.recentBookings.length === 0 ? (
                <EmptyState title="No Recent Bookings" description="Passenger bookings will appear here." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentActivity.recentBookings.map((b) => (
                    <div key={b._id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 text-xs">{b.pnr}</span>
                          <StatusBadge status={b.bookingStatus} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Passenger: {b.userId?.name || 'Customer'} ({b.userId?.phone || '—'})
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 block">₹{b.totalAmount}</span>
                        <span className="text-[10px] text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activityTab === 'trips' && (
              recentActivity.upcomingTrips.length === 0 ? (
                <EmptyState title="No Upcoming Trips" description="Schedule bus trips to view your upcoming itinerary." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentActivity.upcomingTrips.map((t) => (
                    <div key={t._id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{t.routeId?.routeName}</p>
                        <p className="text-[10px] text-slate-400">
                          Bus: {t.busId?.busNumber} ({t.busId?.busType}) | Total Seats: {t.busId?.totalSeats}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs font-semibold text-slate-700 block">
                            {new Date(t.departureTime).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(t.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <Link to={`/operator/manifests/${t._id}`}>
                          <Button variant="outline" size="sm" className="text-xs py-1 px-2.5">
                            Manifest
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activityTab === 'cancellations' && (
              recentActivity.recentCancellations.length === 0 ? (
                <EmptyState title="No Cancellations" description="Cancelled tickets will show here." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentActivity.recentCancellations.map((c) => (
                    <div key={c._id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-slate-800 text-xs">
                          PNR: {c.bookingId?.pnr || '—'}
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Fee: ₹{c.totalCancellationCharge} | Refund: ₹{c.totalRefundAmount}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )
            )}

            {activityTab === 'refunds' && (
              recentActivity.recentRefunds.length === 0 ? (
                <EmptyState title="No Refunds" description="Processed passenger refunds will appear here." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentActivity.recentRefunds.map((r) => (
                    <div key={r._id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-slate-800 text-xs">{r.refundReference}</span>
                        <p className="text-xs text-rose-600 font-semibold mt-0.5">₹{r.refundAmount}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={r.refundStatus} />
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </Card>
        </>
      )}
    </div>
  );
}
