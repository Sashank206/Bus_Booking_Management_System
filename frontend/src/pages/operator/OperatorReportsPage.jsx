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
  Bus,
  MapPin
} from 'lucide-react';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import DateRangeFilter from '../../components/common/DateRangeFilter';

export default function OperatorReportsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('occupancy'); // 'occupancy' | 'bookings' | 'revenue'
  const [dateFilter, setDateFilter] = useState({ range: '30days', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(false);

  // Data States
  const [occupancyData, setOccupancyData] = useState([]);
  const [bookingsData, setBookingsData] = useState([]);
  const [revenueData, setRevenueData] = useState(null);

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
        const res = await api.get('/operator/reports/occupancy', { params });
        setOccupancyData(res.data?.occupancy || []);
      } else if (activeTab === 'bookings') {
        const res = await api.get('/operator/analytics/bookings', { params });
        setBookingsData(res.data?.bookings || []);
      } else if (activeTab === 'revenue') {
        const res = await api.get('/operator/analytics/revenue', { params });
        setRevenueData(res.data || null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load operator reports.');
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
    if (activeTab === 'occupancy') endpoint = '/operator/reports/occupancy';
    else if (activeTab === 'bookings') endpoint = '/operator/analytics/bookings';
    else if (activeTab === 'revenue') endpoint = '/operator/analytics/revenue';

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
    { id: 'bookings', label: 'Passenger Bookings Report', icon: Ticket },
    { id: 'revenue', label: 'Fleet Revenue & Settlements', icon: DollarSign }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Operator Fleet Analytics & Reports
          </h1>
          <p className="text-sm text-slate-500">
            Real-time fleet occupancy, passenger bookings, and net revenue settlements.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="gap-1.5 self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Tabs */}
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
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Global Date Filter */}
      <DateRangeFilter
        selectedRange={dateFilter.range}
        startDate={dateFilter.startDate}
        endDate={dateFilter.endDate}
        onChange={(newFilter) => setDateFilter(newFilter)}
        onRefresh={fetchData}
        loading={loading}
      />

      {/* TAB 1: TRIP OCCUPANCY */}
      {activeTab === 'occupancy' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Bus or Route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : occupancyData.length === 0 ? (
            <EmptyState title="No Trips Found" description="No trips found for the selected time window." />
          ) : (
            <div className="overflow-hidden border border-slate-200/90 rounded-xl bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Bus Number</th>
                      <th className="px-4 py-3">Route</th>
                      <th className="px-4 py-3">Departure Date</th>
                      <th className="px-4 py-3 text-center">Physical Capacity</th>
                      <th className="px-4 py-3 text-center text-emerald-600">Peak Occupied</th>
                      <th className="px-4 py-3 text-center text-amber-600">Held</th>
                      <th className="px-4 py-3 text-center text-blue-600">Min Available</th>
                      <th className="px-4 py-3 text-center text-purple-600">Allocations</th>
                      <th className="px-4 py-3 text-center text-rose-500">Cancelled</th>
                      <th className="px-4 py-3 text-right">Avg Segment Occ %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {occupancyData.map((row) => (
                      <tr key={row.tripId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 block">{row.busNumber}</span>
                          <span className="text-[10px] text-slate-400">{row.busType}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <span>{row.routeName}</span>
                          {row.segmentCount > 1 && (
                            <span className="text-[10px] text-blue-600 block">
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

      {/* TAB 2: PASSENGER BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by PNR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : bookingsData.length === 0 ? (
            <EmptyState title="No Bookings Found" description="No passenger bookings match your query." />
          ) : (
            <div className="overflow-hidden border border-slate-200/90 rounded-xl bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">PNR</th>
                      <th className="px-4 py-3">Passenger</th>
                      <th className="px-4 py-3">Bus / Route</th>
                      <th className="px-4 py-3">Booking Status</th>
                      <th className="px-4 py-3">Fare Amount</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {bookingsData.map((b) => (
                      <tr key={b._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{b.pnr}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{b.userId?.name || 'Passenger'}</p>
                          <p className="text-[10px] text-slate-400">{b.userId?.phone}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <p className="font-medium text-slate-800">{b.tripId?.busId?.busNumber}</p>
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

      {/* TAB 3: REVENUE */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {revenueData?.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="p-4 border-slate-200">
                <p className="text-xs text-slate-400 font-semibold uppercase">Gross Ticket Collections</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">₹{revenueData.summary.grossRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">{revenueData.summary.paymentCount} payments collected</p>
              </Card>

              <Card className="p-4 border-slate-200">
                <p className="text-xs text-slate-400 font-semibold uppercase">Completed Refunds (Settled)</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">₹{revenueData.summary.completedRefunds.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">{revenueData.summary.refundCount} refunds processed</p>
              </Card>

              <Card className="p-4 border-slate-200">
                <p className="text-xs text-slate-400 font-semibold uppercase">Pending / In-Process Liability</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">₹{revenueData.summary.outstandingRefundLiability.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">
                  ₹{revenueData.summary.pendingRefunds || 0} Pending | ₹{revenueData.summary.processingRefunds || 0} Processing
                </p>
              </Card>

              <Card className="p-4 border-slate-200 bg-blue-50/50 border-blue-100">
                <p className="text-xs text-blue-700 font-semibold uppercase">Net Settled Earnings</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">₹{revenueData.summary.netRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-blue-600">Gross collections minus completed refunds</p>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

