import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Eye,
  XCircle,
  RefreshCw,
  Bus,
  Clock,
  ArrowRight,
  User,
  Users,
  Ticket,
  DollarSign,
  AlertTriangle,
  MapPin,
  BarChart3
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import InputField from '../../components/forms/InputField';
import SelectField from '../../components/forms/SelectField';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import api from '../../services/api';

export default function OperatorTripsPage() {
  const { isOperatorApproved } = useAuth();
  const toast = useToast();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Active Buses and Routes for scheduling
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);

  // Schedule Trip Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [submittingTrip, setSubmittingTrip] = useState(false);
  const [form, setForm] = useState({
    busId: '',
    routeId: '',
    travelDate: '',
    departureTime: '',
    arrivalTime: '',
    baseFare: ''
  });

  // Manifest Modal State
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [manifestData, setManifestData] = useState(null);

  // Cancel Trip Dialog State
  const [cancelDialog, setCancelDialog] = useState({
    isOpen: false,
    trip: null,
    loading: false
  });

  // Fetch Trips
  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const res = await api.get('/trips', { params });
      if (res && res.data) {
        setTrips(res.data.trips || []);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load trips.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  // Fetch Buses and Routes for modal options
  const fetchOptions = useCallback(async () => {
    try {
      const [busRes, routeRes] = await Promise.all([
        api.get('/buses'),
        api.get('/routes')
      ]);
      if (busRes && busRes.data) {
        setBuses(busRes.data.buses?.filter((b) => b.isActive) || []);
      }
      if (routeRes && routeRes.data) {
        setRoutes(routeRes.data.routes?.filter((r) => r.isActive) || []);
      }
    } catch (err) {
      console.warn('Could not load buses/routes for scheduling dropdowns:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
    fetchOptions();
  }, [fetchTrips, fetchOptions]);

  // Handle Schedule Trip Submit
  const handleScheduleTrip = async (e) => {
    e.preventDefault();
    if (!isOperatorApproved) {
      toast.error('Only approved operators can schedule trips.');
      return;
    }

    try {
      setSubmittingTrip(true);

      const depDate = new Date(form.departureTime);
      const arrDate = new Date(form.arrivalTime);

      if (arrDate <= depDate) {
        toast.error('Arrival time must be after departure time.');
        setSubmittingTrip(false);
        return;
      }

      await api.post('/trips', {
        busId: form.busId,
        routeId: form.routeId,
        travelDate: new Date(form.travelDate).toISOString(),
        departureTime: depDate.toISOString(),
        arrivalTime: arrDate.toISOString(),
        baseFare: parseFloat(form.baseFare)
      });

      toast.success('Trip successfully scheduled and seat inventory generated!');
      setScheduleModalOpen(false);
      setForm({
        busId: '',
        routeId: '',
        travelDate: '',
        departureTime: '',
        arrivalTime: '',
        baseFare: ''
      });
      await fetchTrips();
    } catch (err) {
      toast.error(err.message || 'Failed to schedule trip.');
    } finally {
      setSubmittingTrip(false);
    }
  };

  // Open Manifest Modal
  const openManifest = async (trip) => {
    try {
      setManifestLoading(true);
      setManifestModalOpen(true);
      const res = await api.get(`/trips/${trip._id}/manifest`);
      if (res && res.data) {
        setManifestData(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load passenger manifest.');
      setManifestModalOpen(false);
    } finally {
      setManifestLoading(false);
    }
  };

  // Handle Cancel Trip
  const handleCancelTrip = async () => {
    const { trip } = cancelDialog;
    if (!trip) return;

    try {
      setCancelDialog((prev) => ({ ...prev, loading: true }));
      await api.patch(`/trips/${trip._id}/cancel`);
      toast.success('Trip has been cancelled.');
      setCancelDialog({ isOpen: false, trip: null, loading: false });
      await fetchTrips();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel trip.');
      setCancelDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const columns = [
    {
      header: 'Route Corridor',
      key: 'routeId',
      render: (row) => (
        <div>
          <div className="font-black text-navy flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            {row.routeId?.routeName || 'Route Corridor'}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            {row.routeId?.sourceStopId?.city} → {row.routeId?.destinationStopId?.city}
          </div>
        </div>
      )
    },
    {
      header: 'Assigned Vehicle',
      key: 'busId',
      render: (row) => (
        <div className="text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-1">
            <Bus className="w-3 h-3 text-primary" />
            {row.busId?.busNumber}
          </div>
          <div className="text-slate-500 text-[11px] font-mono">
            {row.busId?.registrationNumber} ({row.busId?.totalSeats} seats)
          </div>
        </div>
      )
    },
    {
      header: 'Timings & Travel Date',
      key: 'departureTime',
      render: (row) => (
        <div className="text-xs">
          <div className="font-bold text-navy">
            {new Date(row.travelDate).toLocaleDateString()}
          </div>
          <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5 font-medium">
            <Clock className="w-3 h-3 text-slate-400" />
            {new Date(row.departureTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}{' '}
            →{' '}
            {new Date(row.arrivalTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      )
    },
    {
      header: 'Base Fare',
      key: 'baseFare',
      render: (row) => (
        <span className="text-xs font-black text-navy font-mono">
          ₹{row.baseFare}
        </span>
      )
    },
    {
      header: 'Status',
      key: 'tripStatus',
      render: (row) => <StatusBadge status={row.tripStatus} />
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            icon={Users}
            onClick={() => openManifest(row)}
            title="Passenger Manifest"
          />

          <Link
            to={`/operator/reports?tripId=${row._id}`}
            className="p-1.5 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100 transition-colors"
            title="Occupancy & Revenue Reports"
          >
            <BarChart3 className="w-4 h-4" />
          </Link>

          {row.tripStatus === 'scheduled' && (
            <Button
              variant="outline"
              size="sm"
              icon={XCircle}
              onClick={() =>
                setCancelDialog({ isOpen: true, trip: row, loading: false })
              }
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              Cancel
            </Button>
          )}

          {row.tripStatus === 'completed' && (
            <span
              className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md cursor-not-allowed select-none"
              title="Completed trips cannot be cancelled"
            >
              Completed
            </span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight">
            Trip Scheduling &amp; Manifests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            Assign vehicles to established corridors, define base fares, and inspect live passenger manifests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={fetchTrips}
            loading={loading}
          >
            Refresh
          </Button>

          {isOperatorApproved && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => {
                fetchOptions();
                setScheduleModalOpen(true);
              }}
              className="font-bold shadow-xs"
            >
              Schedule New Trip
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-2 rounded-2xl border border-slate-200 w-fit overflow-x-auto shadow-2xs">
        {[
          { id: 'all', label: 'All Trips' },
          { id: 'scheduled', label: 'Scheduled' },
          { id: 'boarding', label: 'Boarding' },
          { id: 'in_progress', label: 'In Progress' },
          { id: 'completed', label: 'Completed' },
          { id: 'cancelled', label: 'Cancelled' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              statusFilter === tab.id
                ? 'bg-primary text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trips Table */}
      <Card noPadding>
        <DataTable
          columns={columns}
          data={trips}
          loading={loading}
          emptyTitle="No Trips Scheduled"
          emptyMessage="You have not published any journeys matching this filter yet. Click 'Schedule New Trip' to create one."
        />
      </Card>

      {/* Modal: Schedule New Trip */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Schedule Journey &amp; Initialize Inventory"
        subtitle="Connect your approved bus to a master route corridor"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleScheduleTrip} className="space-y-4">
          <SelectField
            label="Assigned Bus"
            required
            options={buses.map((b) => ({
              value: b._id,
              label: `${b.busNumber} — ${b.registrationNumber} (${b.busType}, ${b.totalSeats} seats)`
            }))}
            value={form.busId}
            onChange={(e) => setForm({ ...form, busId: e.target.value })}
            placeholder="Select a bus from your fleet..."
          />

          <SelectField
            label="Route Corridor"
            required
            options={routes.map((r) => ({
              value: r._id,
              label: `${r.routeName} (${r.distanceKm || '—'} km)`
            }))}
            value={form.routeId}
            onChange={(e) => setForm({ ...form, routeId: e.target.value })}
            placeholder="Select route corridor..."
          />

          <InputField
            label="Date of Travel"
            type="date"
            required
            min={new Date().toISOString().split('T')[0]}
            value={form.travelDate}
            onChange={(e) => setForm({ ...form, travelDate: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Departure Time"
              type="datetime-local"
              required
              value={form.departureTime}
              onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
            />
            <InputField
              label="Arrival Time"
              type="datetime-local"
              required
              value={form.arrivalTime}
              onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
            />
          </div>

          <InputField
            label="Base Segment Fare (₹)"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="e.g. 750"
            value={form.baseFare}
            onChange={(e) => setForm({ ...form, baseFare: e.target.value })}
            helperText="Base starting fare for full corridor travel."
          />

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 leading-relaxed">
            <span className="font-bold text-navy block mb-0.5">Automated Multi-Document Creation:</span>
            Upon submission, BusGo verifies vehicle schedule availability and automatically generates matching <strong>TripStops</strong> and complete <strong>SeatInventory</strong> with half-open segment reuse support.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setScheduleModalOpen(false)}
              disabled={submittingTrip}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              loading={submittingTrip}
              className="font-bold shadow-xs"
            >
              Publish Trip
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Passenger Manifest */}
      <Modal
        isOpen={manifestModalOpen}
        onClose={() => setManifestModalOpen(false)}
        title="Passenger Journey Manifest"
        subtitle={
          manifestData?.trip
            ? `${manifestData.trip.busId?.busNumber} — ${new Date(manifestData.trip.travelDate).toLocaleDateString()}`
            : 'Manifest'
        }
        maxWidth="max-w-3xl"
      >
        {manifestLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading passenger records...
          </div>
        ) : manifestData ? (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="font-black text-navy text-sm">
                  {manifestData.trip?.routeId?.routeName}
                </span>
                <span className="text-slate-500 block text-[11px] font-medium">
                  Vehicle: {manifestData.trip?.busId?.registrationNumber}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 font-bold block uppercase">Total Passengers</span>
                <span className="text-lg font-black text-primary font-mono">
                  {manifestData.totalPassengers || 0}
                </span>
              </div>
            </div>

            {manifestData.manifest?.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="No Confirmed Bookings"
                description="No passengers have reserved seats on this scheduled trip yet."
              />
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3.5 py-2.5 font-bold text-slate-700">Seat</th>
                      <th className="px-3.5 py-2.5 font-bold text-slate-700">PNR</th>
                      <th className="px-3.5 py-2.5 font-bold text-slate-700">Passenger</th>
                      <th className="px-3.5 py-2.5 font-bold text-slate-700">Segment [From → To]</th>
                      <th className="px-3.5 py-2.5 font-bold text-slate-700">Fare</th>
                      <th className="px-3.5 py-2.5 font-bold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {manifestData.manifest.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-primary">
                          {item.seatNumber}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-slate-600">
                          {item.pnr}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                          {item.passenger?.fullName || '—'}{' '}
                          <span className="text-slate-400 font-normal">
                            ({item.passenger?.age}y, {item.passenger?.gender})
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600">
                          {item.boardingStop?.stopName || 'Origin'} → {item.droppingStop?.stopName || 'Destination'}
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Seq: [{item.fromSequence}, {item.toSequence})
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                          ₹{item.fare}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setManifestModalOpen(false)}
              >
                Close Manifest
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Dialog: Confirm Cancel Trip */}
      <ConfirmDialog
        isOpen={cancelDialog.isOpen}
        onClose={() => setCancelDialog({ isOpen: false, trip: null, loading: false })}
        onConfirm={handleCancelTrip}
        title="Cancel Scheduled Journey"
        message={`Are you sure you want to cancel the trip scheduled for ${cancelDialog.trip?.routeId?.routeName} on ${new Date(cancelDialog.trip?.travelDate || Date.now()).toLocaleDateString()}?`}
        confirmText="Confirm Cancellation"
        confirmVariant="danger"
        loading={cancelDialog.loading}
      />
    </div>
  );
}
