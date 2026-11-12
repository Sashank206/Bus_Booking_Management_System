import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Printer,
  Search,
  Filter,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Calendar,
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

export default function TripManifestPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(tripId || '');
  const [loading, setLoading] = useState(false);
  const [manifestData, setManifestData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [seatFilter, setSeatFilter] = useState('');

  // 1. Fetch available trips for selection
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await api.get('/trips?limit=50');
        if (res && res.data && res.data.trips) {
          setTrips(res.data.trips);
          if (!selectedTripId && res.data.trips.length > 0) {
            setSelectedTripId(res.data.trips[0]._id);
          }
        }
      } catch (err) {
        toast.error('Could not load trips list.');
      }
    };
    fetchTrips();
  }, [selectedTripId, toast]);

  // 2. Fetch Manifest for selected trip
  const fetchManifest = useCallback(async () => {
    if (!selectedTripId) return;
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (seatFilter) params.seat = seatFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await api.get(`/reports/trips/${selectedTripId}/manifest`, { params });
      if (res && res.data) {
        setManifestData(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load passenger manifest.');
      setManifestData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedTripId, statusFilter, seatFilter, searchTerm, toast]);

  useEffect(() => {
    fetchManifest();
  }, [fetchManifest]);

  const handleExportCSV = () => {
    if (!selectedTripId) return;
    const token = localStorage.getItem('token');
    const url = `${api.defaults.baseURL || '/api'}/reports/trips/${selectedTripId}/manifest?format=csv&token=${token}`;
    window.open(url, '_blank');
    toast.success('Downloading Passenger Manifest CSV...');
  };

  const handlePrint = () => {
    window.print();
  };

  const tripInfo = manifestData?.trip;
  const summary = manifestData?.summary || { totalSeats: 40, confirmedCount: 0, cancelledCount: 0 };
  const passengers = manifestData?.passengers || [];

  return (
    <div className="space-y-6">
      {/* Action / Title Bar (Hidden in Print) */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Passenger Boarding Manifest
          </h1>
          <p className="text-sm text-slate-500">
            Official passenger roster, seat assignments, and boarding verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Trip Selector Dropdown */}
          <select
            value={selectedTripId}
            onChange={(e) => {
              setSelectedTripId(e.target.value);
              navigate(`/operator/manifests/${e.target.value}`);
            }}
            className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="">Select a Trip...</option>
            {trips.map((t) => (
              <option key={t._id} value={t._id}>
                {t.routeId?.routeName || 'Route'} | Bus: {t.busId?.busNumber || 'Bus'} (
                {new Date(t.departureTime).toLocaleDateString()})
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={!selectedTripId || passengers.length === 0}
            className="gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            disabled={!selectedTripId || passengers.length === 0}
            className="gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print Manifest
          </Button>
        </div>
      </div>

      {/* Official Print Header (Only visible when printing) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
              BusGo Passenger Manifest
            </h1>
            <p className="text-xs text-slate-600">
              Carrier: {tripInfo?.operator?.companyName || 'Bus Operator'} | Generated:{' '}
              {new Date().toLocaleString()}
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Trip ID: {tripInfo?._id}</p>
            <p>Bus: {tripInfo?.bus?.busNumber} ({tripInfo?.bus?.busType})</p>
          </div>
        </div>
      </div>

      {/* Trip Metadata & Summary Cards */}
      {tripInfo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Bus & Route</p>
                <p className="text-sm font-bold text-slate-800">{tripInfo.bus?.busNumber}</p>
                <p className="text-xs text-slate-500 truncate">{tripInfo.route?.routeName}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Departure</p>
                <p className="text-sm font-bold text-slate-800">
                  {new Date(tripInfo.departureTime).toLocaleDateString()}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(tripInfo.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Confirmed Boarding</p>
                <p className="text-sm font-bold text-slate-800">
                  {summary.confirmedCount} / {summary.totalSeats} Seats
                </p>
                <p className="text-xs text-emerald-600 font-medium">
                  {Math.round((summary.confirmedCount / (summary.totalSeats || 1)) * 100)}% Booked
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Cancelled Seats</p>
                <p className="text-sm font-bold text-slate-800">{summary.cancelledCount}</p>
                <p className="text-xs text-slate-400">Available for re-allocation</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filter & Search Bar (Hidden in Print) */}
      <div className="print:hidden bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Passenger Name or PNR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <input
            type="text"
            placeholder="Seat (e.g. 1A)"
            value={seatFilter}
            onChange={(e) => setSeatFilter(e.target.value)}
            className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">
            Status:
          </span>
          {['all', 'confirmed', 'cancelled'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize font-medium transition-all ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Manifest Passenger Table */}
      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : passengers.length === 0 ? (
        <EmptyState
          title="No Passengers on Manifest"
          description={
            selectedTripId
              ? 'No passengers found matching the selected filters for this trip.'
              : 'Please select a trip from the dropdown above to view its boarding manifest.'
          }
        />
      ) : (
        <div className="overflow-hidden border border-slate-200/90 rounded-xl bg-white shadow-xs print:border-none print:shadow-none">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500 print:bg-slate-100">
                <tr>
                  <th className="px-4 py-3">Seat</th>
                  <th className="px-4 py-3">PNR</th>
                  <th className="px-4 py-3">Passenger</th>
                  <th className="px-4 py-3">Age / Gen</th>
                  <th className="px-4 py-3">Boarding Point</th>
                  <th className="px-4 py-3">Dropping Point</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 print:hidden">Fare</th>
                  <th className="px-4 py-3 text-center hidden print:table-cell">Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {passengers.map((p, idx) => (
                  <tr
                    key={p.bookingSeatId || idx}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      p.status === 'cancelled' ? 'opacity-60 bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200">
                        {p.seatNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                      {p.pnr}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {p.passengerName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.age}y / {p.gender?.[0]?.toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {p.boardingStop}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {p.droppingStop}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      <div>{p.phone}</div>
                      <div className="text-[10px] text-slate-400">{p.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 print:hidden">
                      ₹{p.fare}
                    </td>
                    <td className="px-4 py-3 text-center hidden print:table-cell">
                      <div className="w-5 h-5 border border-slate-400 rounded-sm mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

