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
  Clock
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

export default function OperatorDashboardPage() {
  const { user, operator, isOperatorApproved } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/operator/dashboard');
      if (res && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load operator metrics.');
      toast.error(err.message || 'Could not fetch operator statistics.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const metrics = dashboardData?.metrics || {
    totalBuses: 0,
    totalTrips: 0,
    upcomingTrips: 0,
    totalBookings: 0,
    simulatedRevenue: 0,
    occupancyPercentage: 0
  };

  const recentTrips = dashboardData?.recentTrips || [];

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
            Fleet management, trip scheduling, real-time seat inventory, passenger manifests, and simulated revenue analytics.
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

          {isOperatorApproved && (
            <div className="flex gap-2">
              <Link to="/operator/buses">
                <Button variant="accent" size="md" icon={Plus}>
                  Add Bus
                </Button>
              </Link>
              <Link to="/operator/trips">
                <Button variant="primary" size="md" icon={Calendar}>
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
            <h3 className="text-sm font-bold text-amber-900">
              Application Under Administrative Review
            </h3>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Your transport business profile has been submitted and is waiting for administrator approval. Once verified, fleet registration and trip scheduling will be automatically activated.
            </p>
            <div className="mt-3">
              <Link to="/operator/profile">
                <Button variant="outline" size="sm" className="text-amber-800 border-amber-300">
                  Inspect Business Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats */}
      {loading && !dashboardData ? (
        <LoadingSkeleton rows={2} />
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
              title="Fleet Size"
              value={metrics.totalBuses}
              icon={Bus}
              color="amber"
              description="Configured buses"
            />
            <StatCard
              title="Active Trips"
              value={metrics.upcomingTrips}
              icon={Calendar}
              color="blue"
              description={`${metrics.totalTrips} all-time scheduled`}
            />
            <StatCard
              title="Occupancy Rate"
              value={`${metrics.occupancyPercentage}%`}
              icon={Percent}
              color="indigo"
              description="Seat utilization percentage"
            />
            <StatCard
              title="Simulated Revenue"
              value={`₹${(metrics.simulatedRevenue || 0).toLocaleString('en-IN')}`}
              icon={DollarSign}
              color="emerald"
              description={`${metrics.totalBookings} booked seats`}
            />
          </div>

          {/* Main Grid: Recent Trips & Operations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card
                title="Recent &amp; Upcoming Trips"
                subtitle="Scheduled departures and active routes"
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
                {recentTrips.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="No Trips Scheduled"
                    description={
                      isOperatorApproved
                        ? 'Click "Schedule Trip" to assign a bus and publish your first journey.'
                        : 'Trip scheduling will unlock once your operator profile is verified.'
                    }
                  />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentTrips.map((trip) => (
                      <div
                        key={trip._id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">
                              {trip.routeId?.routeName || 'Route'}
                            </span>
                            <StatusBadge status={trip.tripStatus} />
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Bus className="w-3.5 h-3.5 text-slate-400" />
                              {trip.busId?.busNumber} ({trip.busId?.busType})
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(trip.departureTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className="font-semibold text-slate-800">
                              Base: ₹{trip.baseFare}
                            </span>
                          </div>
                        </div>

                        <Link to="/operator/trips">
                          <Button variant="ghost" size="sm" icon={Eye}>
                            Details
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Quick Actions & Profile Overview */}
            <div className="space-y-6">
              <Card title="Transport Agency" subtitle="Official registration status">
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Company</span>
                    <span className="font-bold text-slate-900">
                      {operator?.companyName || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Registration #</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {operator?.registrationNumber || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Contact</span>
                    <span className="font-semibold text-slate-800">
                      {operator?.contactPerson || user?.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500">Verification</span>
                    <StatusBadge status={operator?.approvalStatus || 'pending'} />
                  </div>

                  <div className="pt-2">
                    <Link to="/operator/profile" className="w-full block">
                      <Button variant="outline" size="sm" className="w-full">
                        View Full Business Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
