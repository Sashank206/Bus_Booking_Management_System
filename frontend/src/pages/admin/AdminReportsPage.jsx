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
  FileText,
  Bus,
  ShieldCheck,
  CreditCard,
  Layers
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
    { id: 'occupancy', label: 'Trip Occupancy Analysis', icon: Percent },
    { id: 'bookings', label: 'Master Bookings Audit', icon: Ticket },
    { id: 'revenue', label: 'Revenue & Settlements', icon: DollarSign },
    { id: 'refunds', label: 'Cancellations & Refunds', icon: AlertCircle }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold tracking-wide uppercase mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#D92D3A]" />
            BusGo BI &amp; Reporting Suite
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Executive Reports &amp; Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time segment occupancy auditing, revenue reconciliation, and exportable financial ledgers.
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={handleExportCSV}
          icon={Download}
          className="self-start md:self-auto border-slate-300 text-slate-700 hover:text-[#D92D3A] hover:border-[#D92D3A] font-bold"
        >
          Export CSV ({tabs.find((t) => t.id === activeTab)?.label})
        </Button>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl p-1.5 border border-slate-200/80 shadow-xs flex gap-1.5 overflow-x-auto">
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
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#171C2B] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#D92D3A]' : 'text-slate-400'}`} />
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
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Bus, Route or Operator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#D92D3A]/20 focus:border-[#D92D3A] focus:outline-hidden bg-white shadow-2xs"
              />
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : occupancyData.length === 0 ? (
            <EmptyState
              title="No Trips Found"
              description="No trip occupancy records matched the selected date window or search query."
            />
          ) : (
            <div className="overflow-hidden border border-slate-200/90 rounded-2xl bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5">Bus / Trip</th>
                      <th className="px-4 py-3.5">Operator</th>
                      <th className="px-4 py-3.5">Route Corridor</th>
                      <th className="px-4 py-3.5">Departure</th>
                      <th className="px-4 py-3.5 text-center">Physical Capacity</th>
                      <th className="px-4 py-3.5 text-center text-emerald-700">Peak Occupied</th>
                      <th className="px-4 py-3.5 text-center text-amber-700">Held</th>
                      <th className="px-4 py-3.5 text-center text-blue-700">Min Available</th>
                      <th className="px-4 py-3.5 text-center text-purple-700">Allocations</th>
                      <th className="px-4 py-3.5 text-center text-rose-700">Cancelled</th>
                      <th className="px-4 py-3.5 text-right">Avg Segment Occ %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {occupancyData.map((row) => (
                      <tr key={row.tripId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-slate-900 block font-mono">{row.busNumber}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{row.busType}</span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-800">{row.operatorName}</td>
                        <td className="px-4 py-3.5 text-slate-700">
                          <span className="font-semibold text-slate-900">{row.routeName}</span>
                          {row.segmentCount > 1 && (
                            <span className="text-[10px] text-[#D92D3A] font-bold block">
                              {row.segmentCount} atomic segments
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          <span className="font-semibold text-slate-900 block">
                            {new Date(row.departureTime).toLocaleDateString()}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(row.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-black text-slate-800">{row.totalSeats}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-emerald-600">{row.confirmedSeats}</td>
                        <td className="px-4 py-3.5 text-center font-semibold text-amber-600">{row.heldSeats}</td>
                        <td className="px-4 py-3.5 text-center font-semibold text-blue-600">{row.availableSeats}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-purple-600">{row.totalAllocations || row.confirmedSeats}</td>
                        <td className="px-4 py-3.5 text-center font-semibold text-rose-500">{row.cancelledSeats}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-black ${
                              row.occupancyPercentage >= 75
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : row.occupancyPercentage >= 40
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
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
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by PNR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#D92D3A]/20 focus:border-[#D92D3A] focus:outline-hidden bg-white shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
              {['all', 'confirmed', 'partially_cancelled', 'cancelled', 'pending_payment'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#171C2B] text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
            <div className="overflow-hidden border border-slate-200/90 rounded-2xl bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5">PNR</th>
                      <th className="px-4 py-3.5">Customer Profile</th>
                      <th className="px-4 py-3.5">Carrier / Route</th>
                      <th className="px-4 py-3.5">Booking Status</th>
                      <th className="px-4 py-3.5">Total Amount</th>
                      <th className="px-4 py-3.5">Booking Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {bookingsData.map((b) => (
                      <tr key={b._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-black text-slate-900 tracking-wider">
                          {b.pnr}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-800">{b.userId?.name || 'Customer'}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{b.userId?.phone || b.userId?.email}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-800">{b.tripId?.operatorId?.companyName || 'Operator'}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{b.tripId?.routeId?.routeName}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={b.bookingStatus} />
                        </td>
                        <td className="px-4 py-3.5 font-black text-slate-900">₹{b.totalAmount}</td>
                        <td className="px-4 py-3.5 text-slate-500 font-medium">
                          {new Date(b.createdAt).toLocaleDateString()}
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

      {/* TAB 3: REVENUE & PAYMENTS REPORT */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {revenueData?.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 border-slate-200">
                <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider">Gross Successful Revenue</p>
                <p className="text-3xl font-black text-emerald-600 mt-1">₹{revenueData.summary.grossRevenue.toLocaleString()}</p>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">{revenueData.summary.paymentCount} successful collections</p>
              </Card>

              <Card className="p-5 border-slate-200">
                <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider">Completed Refunds (Settled)</p>
                <p className="text-3xl font-black text-rose-600 mt-1">₹{revenueData.summary.completedRefunds.toLocaleString()}</p>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">{revenueData.summary.refundCount} refunds processed</p>
              </Card>

              <Card className="p-5 border-slate-200">
                <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider">Outstanding Refund Liability</p>
                <p className="text-3xl font-black text-amber-600 mt-1">₹{revenueData.summary.outstandingRefundLiability.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  ₹{revenueData.summary.pendingRefunds || 0} Pending | ₹{revenueData.summary.processingRefunds || 0} In Progress
                </p>
              </Card>

              <Card className="p-5 border-slate-900 bg-[#171C2B] text-white">
                <p className="text-[11px] text-red-200 font-black uppercase tracking-wider">Net Settled Revenue</p>
                <p className="text-3xl font-black text-white mt-1">₹{revenueData.summary.netRevenue.toLocaleString()}</p>
                <p className="text-[11px] text-slate-300 mt-1 font-medium">Gross collections minus settled refunds</p>
              </Card>
            </div>
          )}

          {/* Payment Methods Breakdown */}
          {revenueData?.paymentMethods && (
            <Card className="p-6 border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-[#D92D3A]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Collections by Gateway Channel &amp; Payment Method
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {revenueData.paymentMethods.map((m) => (
                  <div key={m.method} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-black tracking-wide">
                      {m.method.replace('simulated_', '')}
                    </p>
                    <p className="text-xl font-black text-slate-900 mt-1">₹{m.amount.toLocaleString()}</p>
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 border-slate-200">
                <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider">Total Cancellations</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{refundsData.summary.totalCancellations}</p>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  {refundsData.summary.fullyCancelledCount} full, {refundsData.summary.partiallyCancelledCount} partial
                </p>
              </Card>

              <Card className="p-5 border-slate-200">
                <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider">Cancellation Fees Retained</p>
                <p className="text-3xl font-black text-emerald-600 mt-1">₹{refundsData.summary.totalCancellationCharges.toLocaleString()}</p>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">Policy deductions collected</p>
              </Card>

              <Card className="p-5 border-slate-200">
                <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider">Total Refund Amount</p>
                <p className="text-3xl font-black text-rose-600 mt-1">₹{refundsData.summary.totalRefundAmount.toLocaleString()}</p>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">Returned to passengers</p>
              </Card>

              <Card className="p-5 border-slate-200">
                <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider">Settlement Status</p>
                <p className="text-lg font-black text-slate-900 mt-1">
                  {refundsData.summary.statusBreakdown?.completedCount || 0} Completed
                </p>
                <p className="text-[11px] text-amber-600 font-semibold mt-1">
                  {refundsData.summary.statusBreakdown?.pendingCount || 0} Pending / {refundsData.summary.statusBreakdown?.processingCount || 0} Processing
                </p>
              </Card>
            </div>
          )}

          {/* Refund Transactions Table */}
          {refundsData?.refunds && refundsData.refunds.length > 0 && (
            <div className="overflow-hidden border border-slate-200/90 rounded-2xl bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5">Reference / PNR</th>
                      <th className="px-4 py-3.5">Passenger</th>
                      <th className="px-4 py-3.5">Refund Amount</th>
                      <th className="px-4 py-3.5">Cancellation Fee</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Initiated Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {refundsData.refunds.map((r) => (
                      <tr key={r.refundId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-mono font-black text-slate-900 block tracking-wider">{r.refundReference}</span>
                          <span className="text-[11px] text-slate-400 font-mono">PNR: {r.pnr}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-800">{r.customerName}</p>
                          <p className="text-[11px] text-slate-400">{r.customerEmail}</p>
                        </td>
                        <td className="px-4 py-3.5 font-black text-rose-600 text-sm">₹{r.refundAmount}</td>
                        <td className="px-4 py-3.5 font-bold text-emerald-600">₹{r.cancellationCharge}</td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={r.refundStatus} />
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 font-medium">
                          {new Date(r.createdAt).toLocaleDateString()}
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
    </div>
  );
}
