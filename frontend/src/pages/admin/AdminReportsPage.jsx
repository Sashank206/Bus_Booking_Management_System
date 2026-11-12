import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Search,
  Filter,
  DollarSign,
  Ticket,
  Percent,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  FileText
} from 'lucide-react';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import DateRangeFilter from '../../components/common/DateRangeFilter';

export default function AdminReportsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('occupancy'); // 'occupancy' | 'bookings' | 'revenue' | 'refunds'
  const [dateFilter, setDateFilter] = useState({ range: '30days', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(false);

  // Report Specific State
  const [occupancyData, setOccupancyData] = useState([]);
  const [bookingsData, setBookingsData] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [refundsData, setRefundsData] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        range: dateFilter.range,
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined
      };

      if (activeTab === 'occupancy') {
        const res = await api.get('/admin/reports/occupancy', { params });
        setOccupancyData(res.data?.occupancy || []);
      } else if (activeTab === 'bookings') {
        const res = await api.get('/admin/analytics/bookings', { params });
        setBookingsData(res.data?.bookings || []);
      } else if (activeTab === 'revenue') {
        const res = await api.get('/admin/analytics/revenue', { params });
        setRevenueData(res.data || null);
      } else if (activeTab === 'refunds') {
        const res = await api.get('/admin/reports/cancellations', { params });
        setRefundsData(res.data || null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateFilter, searchTerm, statusFilter, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportCSV = () => {
    const token = localStorage.getItem('token');
    let endpoint = '';
    if (activeTab === 'occupancy') endpoint = '/admin/reports/occupancy';
    else if (activeTab === 'bookings') endpoint = '/admin/analytics/bookings';
    else if (activeTab === 'revenue') endpoint = '/admin/analytics/revenue';
    else if (activeTab === 'refunds') endpoint = '/admin/reports/refunds';

    const queryParams = new URLSearchParams({
      format: 'csv',
      range: dateFilter.range || '30days',
      ...(dateFilter.startDate ? { startDate: dateFilter.startDate } : {}),
      ...(dateFilter.endDate ? { endDate: dateFilter.endDate } : {}),
      ...(searchTerm ? { search: searchTerm } : {}),
      ...(token ? { token } : {})
    });

    const url = `${api.defaults.baseURL || '/api'}${endpoint}?${queryParams.toString()}`;
    window.open(url, '_blank');
    toast.success('Downloading CSV report...');
  };

  const tabs = [
    { id: 'occupancy', label: 'Trip Occupancy Report', icon: Percent },
    { id: 'bookings', label: 'Bookings Master Report', icon: Ticket },
    { id: 'revenue', label: 'Revenue & Payments Report', icon: DollarSign },
    { id: 'refunds', label: 'Cancellations & Refunds', icon: AlertCircle }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            Executive Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500">
            Real-time occupancy auditing, revenue reconciliation, and exportable financial logs.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="gap-1.5 self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          Export {tabs.find((t) => t.id === activeTab)?.label} (CSV)
        </Button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Global Date Range Filter */}
      <DateRangeFilter
        selectedRange={dateFilter.range}
        startDate={dateFilter.startDate}
        endDate={dateFilter.endDate}
        onChange={(newFilter) => setDateFilter(newFilter)}
        onRefresh={fetchData}
        loading={loading}
      />

      {/* TAB 1: TRIP OCCUPANCY REPORT */}
      {activeTab === 'occupancy' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Bus, Route or Operator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : occupancyData.length === 0 ? (
            <EmptyState
              title="No Trips Found"
              description="No trip occupancy records matched the selected filters."
            />
          ) : (
            <div className="overflow-hidden border border-slate-200/90 rounded-xl bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Bus / Trip</th>
                      <th className="px-4 py-3">Operator</th>
                      <th className="px-4 py-3">Route</th>
                      <th className="px-4 py-3">Departure</th>
                      <th className="px-4 py-3 text-center">Physical Capacity</th>
                      <th className="px-4 py-3 text-center text-emerald-700">Peak Occupied</th>
                      <th className="px-4 py-3 text-center text-amber-700">Held</th>
                      <th className="px-4 py-3 text-center text-blue-700">Min Available</th>
                      <th className="px-4 py-3 text-center text-purple-700">Allocations</th>
                      <th className="px-4 py-3 text-center text-rose-700">Cancelled</th>
                      <th className="px-4 py-3 text-right">Segment Occ %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {occupancyData.map((row) => (
                      <tr key={row.tripId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 block">{row.busNumber}</span>
                          <span className="text-[10px] text-slate-400">{row.busType}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{row.operatorName}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <span>{row.routeName}</span>
                          {row.segmentCount > 1 && (
                            <span className="text-[10px] text-purple-600 block">
                              {row.segmentCount} atomic segments
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(row.departureTime).toLocaleDateString()}{' '}
                          <span className="text-[10px] text-slate-400">
                            {new Date(row.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{row.totalSeats}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600">{row.confirmedSeats}</td>
                        <td className="px-4 py-3 text-center font-semibold text-amber-600">{row.heldSeats}</td>
                        <td className="px-4 py-3 text-center font-semibold text-blue-600">{row.availableSeats}</td>
                        <td className="px-4 py-3 text-center font-bold text-purple-600">{row.totalAllocations || row.confirmedSeats}</td>
                        <td className="px-4 py-3 text-center font-medium text-rose-500">{row.cancelledSeats}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                              row.occupancyPercentage >= 75
                                ? 'bg-emerald-100 text-emerald-800'
                                : row.occupancyPercentage >= 40
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {row.occupancyPercentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BOOKINGS MASTER REPORT */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by PNR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase">Status:</span>
              {['all', 'confirmed', 'partially_cancelled', 'cancelled', 'pending_payment'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${
                    statusFilter === st
                      ? 'bg-purple-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : bookingsData.length === 0 ? (
            <EmptyState title="No Bookings Found" description="No booking transactions match your filters." />
          ) : (
            <div className="overflow-hidden border border-slate-200/90 rounded-xl bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">PNR</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Carrier / Route</th>
                      <th className="px-4 py-3">Booking Status</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {bookingsData.map((b) => (
                      <tr key={b._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{b.pnr}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{b.userId?.name || 'Customer'}</p>
                          <p className="text-[10px] text-slate-400">{b.userId?.phone || b.userId?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{b.tripId?.operatorId?.companyName || 'Operator'}</p>
                          <p className="text-[10px] text-slate-500">{b.tripId?.routeId?.routeName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={b.bookingStatus} />
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">₹{b.totalAmount}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REVENUE & PAYMENTS REPORT */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {revenueData?.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="p-4 border-slate-200">
                <p className="text-xs text-slate-400 font-semibold uppercase">Gross Successful Revenue</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">₹{revenueData.summary.grossRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">{revenueData.summary.paymentCount} successful collections</p>
              </Card>

              <Card className="p-4 border-slate-200">
                <p className="text-xs text-slate-400 font-semibold uppercase">Completed Refunds (Settled)</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">₹{revenueData.summary.completedRefunds.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">{revenueData.summary.refundCount} refunds processed</p>
              </Card>

              <Card className="p-4 border-slate-200">
                <p className="text-xs text-slate-400 font-semibold uppercase">Outstanding Refund Liability</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">₹{revenueData.summary.outstandingRefundLiability.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">
                  ₹{revenueData.summary.pendingRefunds || 0} Pending | ₹{revenueData.summary.processingRefunds || 0} In Progress
                </p>
              </Card>

              <Card className="p-4 border-slate-200 bg-purple-50/50 border-purple-100">
                <p className="text-xs text-purple-700 font-semibold uppercase">Net Settled Revenue</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">₹{revenueData.summary.netRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-purple-600">Gross minus completed refunds</p>
              </Card>
            </div>
          )}

          {/* Payment Methods Breakdown */}
          {revenueData?.paymentMethods && (
            <Card className="p-5 border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Collections by Channel / Method
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {revenueData.paymentMethods.map((m) => (
                  <div key={m.method} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-medium">{m.method.replace('simulated_', '')}</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">₹{m.amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 4: CANCELLATIONS & REFUNDS */}
      {activeTab === 'refunds' && (
        <div className="space-y-6">
          {refundsData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4 border-slate-200">
                <p className="text-xs text-slate-400 font-semibold uppercase">Total Cancellations</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{refundsData.summary.totalCancellations}</p>
                <p className="text-[10px] text-slate-400">
                  {refundsData.summary.fullyCancelledCount} full, {refundsData.summary.partiallyCancelledCount} partial
                </p>
              </Card>

              <Card className="p-4 border-slate-200">
                <p className="text-xs text-slate-400 font-semibold uppercase">Cancellation Fees Collected</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">₹{refundsData.summary.totalCancellationCharges.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">Policy deductions retained</p>
              </Card>

              <Card className="p-4 border-slate-200">
                <p className="text-xs text-slate-400 font-semibold uppercase">Total Refund Amount</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">₹{refundsData.summary.totalRefundAmount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">Returned to passengers</p>
              </Card>

              <Card className="p-4 border-slate-200">
                <p className="text-xs text-slate-400 font-semibold uppercase">Settlement Status</p>
                <p className="text-sm font-bold text-slate-800 mt-1">
                  {refundsData.summary.statusBreakdown?.completedCount} Completed
                </p>
                <p className="text-[10px] text-amber-600">
                  {refundsData.summary.statusBreakdown?.pendingCount} Pending / {refundsData.summary.statusBreakdown?.processingCount} Processing
                </p>
              </Card>
            </div>
          )}

          {/* Refund Transactions Table */}
          {refundsData?.refunds && refundsData.refunds.length > 0 && (
            <div className="overflow-hidden border border-slate-200/90 rounded-xl bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Reference / PNR</th>
                      <th className="px-4 py-3">Passenger</th>
                      <th className="px-4 py-3">Refund Amount</th>
                      <th className="px-4 py-3">Cancellation Fee</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {refundsData.refunds.map((r) => (
                      <tr key={r.refundId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-slate-900 block">{r.refundReference}</span>
                          <span className="text-[10px] text-slate-400 font-mono">PNR: {r.pnr}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{r.customerName}</p>
                          <p className="text-[10px] text-slate-400">{r.customerEmail}</p>
                        </td>
                        <td className="px-4 py-3 font-bold text-rose-600">₹{r.refundAmount}</td>
                        <td className="px-4 py-3 font-medium text-emerald-600">₹{r.cancellationCharge}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.refundStatus} />
                        </td>
                        <td className="px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

