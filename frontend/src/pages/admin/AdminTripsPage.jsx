import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Clock,
  MapPin,
  Bus,
  Building,
  Users,
  BarChart3,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Sliders,
  X
} from 'lucide-react';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';

export default function AdminTripsPage() {
  const toast = useToast();

  // Trips data state
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Lifecycle update trigger state
  const [updatingStatuses, setUpdatingStatuses] = useState(false);

  // Storage cleanup modal state
  const [storageModalOpen, setStorageModalOpen] = useState(false);
  const [storageStats, setStorageStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [retentionDays, setRetentionDays] = useState(180);
  const [isDryRun, setIsDryRun] = useState(true);
  const [runningCleanup, setRunningCleanup] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);

  // Trip details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedTripDetails, setSelectedTripDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Manifest modal state
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [manifestData, setManifestData] = useState(null);
  const [loadingManifest, setLoadingManifest] = useState(false);

  // Fetch Trips
  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit
      };

      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (dateFilter) {
        params.date = dateFilter;
      }

      const res = await api.get('/trips', { params });
      if (res && res.data) {
        setTrips(res.data.trips || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch trips.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, searchQuery, dateFilter, toast]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // Handle Lifecycle Status Evaluation
  const handleUpdateLifecycleStatuses = async () => {
    try {
      setUpdatingStatuses(true);
      const res = await api.post('/admin/trips/update-statuses');
      const data = res?.data?.data || {};
      const transitionsCount = data.transitions?.length || 0;
      toast.success(
        `Lifecycle evaluated: ${data.evaluated || 0} evaluated, ${transitionsCount} transitioned.`
      );
      await fetchTrips();
    } catch (err) {
      toast.error(err.message || 'Failed to update trip lifecycle statuses.');
    } finally {
      setUpdatingStatuses(false);
    }
  };

  // Fetch Storage Stats
  const fetchStorageStats = async () => {
    try {
      setLoadingStats(true);
      const res = await api.get(`/admin/inventory/stats?retentionDays=${retentionDays}`);
      if (res && res.data) {
        setStorageStats(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load storage statistics.');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleOpenStorageModal = async () => {
    setStorageModalOpen(true);
    setCleanupResult(null);
    await fetchStorageStats();
  };

  // Trigger Inventory Cleanup & Archival
  const handleRunCleanup = async () => {
    try {
      setRunningCleanup(true);
      const res = await api.post('/admin/inventory/cleanup', {
        retentionDays: parseInt(retentionDays, 10),
        dryRun: isDryRun
      });
      if (res && res.data) {
        setCleanupResult(res.data.data);
        toast.success(res.data.message || 'Inventory cleanup operation completed.');
        await fetchStorageStats();
        await fetchTrips();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to run inventory cleanup.');
    } finally {
      setRunningCleanup(false);
    }
  };

  // View Trip Details
  const handleViewDetails = async (trip) => {
    try {
      setLoadingDetails(true);
      setDetailsModalOpen(true);
      const res = await api.get(`/trips/${trip._id}`);
      if (res && res.data) {
        setSelectedTripDetails(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load trip details.');
      setDetailsModalOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  // View Passenger Manifest
  const handleViewManifest = async (trip) => {
    try {
      setLoadingManifest(true);
      setManifestModalOpen(true);
      const res = await api.get(`/trips/${trip._id}/manifest`);
      if (res && res.data) {
        setManifestData(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load passenger manifest.');
      setManifestModalOpen(false);
    } finally {
      setLoadingManifest(false);
    }
  };

  // Table Columns
  const columns = [
    {
      header: 'Route Corridor',
      key: 'routeId',
      render: (row) => (
        <div>
          <div className="font-black text-navy flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{row.routeId?.routeName || 'Corridor'}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            {row.routeId?.sourceStopId?.city || 'Origin'} → {row.routeId?.destinationStopId?.city || 'Dest'}
          </div>
        </div>
      )
    },
    {
      header: 'Vehicle & Capacity',
      key: 'busId',
      render: (row) => (
        <div className="text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-1">
            <Bus className="w-3 h-3 text-primary" />
            {row.busId?.busNumber || 'Bus N/A'}
          </div>
          <div className="text-slate-500 text-[11px] font-mono">
            {row.busId?.registrationNumber} ({row.busId?.totalSeats} seats)
          </div>
        </div>
      )
    },
    {
      header: 'Operator',
      key: 'operatorId',
      render: (row) => (
        <div className="text-xs">
          <div className="font-bold text-navy flex items-center gap-1">
            <Building className="w-3 h-3 text-navy" />
            {row.operatorId?.companyName || 'Operator'}
          </div>
          <div className="text-slate-400 text-[11px] font-medium">
            {row.operatorId?.contactPerson || '—'}
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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={Eye}
            onClick={() => handleViewDetails(row)}
            title="Inspect Trip Details"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={Users}
            onClick={() => handleViewManifest(row)}
            title="View Passenger Manifest"
          />
          <Link
            to={`/admin/reports?tripId=${row._id}`}
            className="p-1.5 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100 transition-colors"
            title="Occupancy & Revenue Analytics"
          >
            <BarChart3 className="w-4 h-4" />
          </Link>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Trips Master &amp; Lifecycle Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            System-wide trip schedule monitoring, lifecycle status automation, and seat inventory storage governance.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={fetchTrips}
            loading={loading}
            className="font-bold"
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={HardDrive}
            onClick={handleOpenStorageModal}
            className="border-slate-300 text-navy hover:bg-slate-50 font-bold"
          >
            Storage &amp; Retention
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Sliders}
            onClick={handleUpdateLifecycleStatuses}
            loading={updatingStatuses}
            className="font-bold shadow-xs"
          >
            Update Lifecycle Statuses
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-2 rounded-2xl border border-slate-200 overflow-x-auto shadow-2xs">
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
            onClick={() => {
              setStatusFilter(tab.id);
              setPage(1);
            }}
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

      {/* Search and Filters Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Bus, Registration, Route or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1);
                  fetchTrips();
                }
              }}
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>

          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPage(1);
                fetchTrips();
              }}
              className="w-full font-bold"
            >
              Apply Filter
            </Button>
            {(searchQuery || dateFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('');
                  setPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden" noPadding>
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton count={6} />
          </div>
        ) : trips.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Calendar}
              title="No Trips Found"
              description="No trip schedules match your selected lifecycle status or filter criteria."
            />
          </div>
        ) : (
          <div>
            <DataTable
              columns={columns}
              data={trips}
              keyField="_id"
            />

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">
                  Showing {trips.length} of {pagination.total} trips (Page {pagination.page} of {pagination.pages})
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.pages}
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Storage & Retention Governance Modal */}
      <Modal
        isOpen={storageModalOpen}
        onClose={() => setStorageModalOpen(false)}
        title="Seat Inventory Storage & Archival Governance"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5 text-xs text-slate-600">
          <p className="leading-relaxed">
            BusGo stores segment-based inventory per physical seat. To prevent perpetual storage bloat while guaranteeing safety, SeatInventory records are eligible for archival to cold storage only after the trip is completed beyond the configured retention period and all bookings, payments, and refunds are settled.
          </p>

          {/* Current Metrics */}
          {loadingStats ? (
            <LoadingSkeleton count={3} />
          ) : storageStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/20">
                <span className="text-[10px] text-primary block font-bold uppercase">Active Seats</span>
                <span className="text-xl font-black text-navy font-mono">{storageStats.activeSeatInventories}</span>
              </div>
              <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-600 block font-bold uppercase">Archived Seats</span>
                <span className="text-xl font-black text-navy font-mono">{storageStats.archivedSeatInventories}</span>
              </div>
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
                <span className="text-[10px] text-amber-700 block font-bold uppercase">Expired Holds</span>
                <span className="text-xl font-black text-amber-800 font-mono">{storageStats.expiredHeldSegmentsCount}</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-bold uppercase">Past Retention</span>
                <span className="text-xl font-black text-navy font-mono">{storageStats.completedTripsPastRetention}</span>
              </div>
            </div>
          ) : null}

          {/* Controls */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="font-bold text-navy">
                Retention Threshold (Days):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(e.target.value)}
                  className="w-24 px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-navy focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchStorageStats}
                  loading={loadingStats}
                  className="font-bold"
                >
                  Recalculate
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-200">
              <input
                type="checkbox"
                id="dryRunCheck"
                checked={isDryRun}
                onChange={(e) => setIsDryRun(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer"
              />
              <label htmlFor="dryRunCheck" className="font-semibold text-navy cursor-pointer text-xs">
                Dry Run Mode (Simulate archival without modifying or deleting data)
              </label>
            </div>
          </div>

          {/* Cleanup Result Feedback */}
          {cleanupResult && (
            <div className="p-4 rounded-2xl bg-navy text-white space-y-2 shadow-xs">
              <div className="font-bold flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Operation Summary (Mode: {cleanupResult.archival?.dryRun ? 'Dry Run' : 'Live Execution'})</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div>Expired Holds Released: <strong className="text-white font-mono">{cleanupResult.holdCleanup?.releasedHoldsCount || 0}</strong></div>
                <div>Eligible Trips: <strong className="text-white font-mono">{cleanupResult.archival?.eligibleTripsCount || 0}</strong></div>
                <div>Seats Archived: <strong className="text-white font-mono">{cleanupResult.archival?.archivedSeatsCount || 0}</strong></div>
                <div>Skipped Trips: <strong className="text-white font-mono">{cleanupResult.archival?.skippedTripsCount || 0}</strong></div>
              </div>
              {cleanupResult.archival?.skippedTrips && cleanupResult.archival.skippedTrips.length > 0 && (
                <div className="mt-2 text-[10px] text-amber-300 space-y-1">
                  <span className="font-bold block">Safety Guardrail Interventions:</span>
                  {cleanupResult.archival.skippedTrips.map((st, i) => (
                    <div key={i}>Trip {st.tripId}: {st.reason}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStorageModalOpen(false)}
            >
              Close
            </Button>
            <Button
              variant={isDryRun ? 'primary' : 'danger'}
              size="sm"
              icon={HardDrive}
              onClick={handleRunCleanup}
              loading={runningCleanup}
              className="font-bold shadow-xs"
            >
              {isDryRun ? 'Execute Dry Run Simulation' : 'Execute Live Storage Archival'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Trip Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Trip Schedule Details"
        maxWidth="max-w-2xl"
      >
        {loadingDetails ? (
          <div className="p-6">
            <LoadingSkeleton count={4} />
          </div>
        ) : selectedTripDetails?.trip ? (
          <div className="space-y-4 text-xs text-slate-600">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Corridor</span>
                <div className="font-black text-navy mt-0.5">{selectedTripDetails.trip.routeId?.routeName}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Status</span>
                <div className="mt-0.5"><StatusBadge status={selectedTripDetails.trip.tripStatus} /></div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Base Fare</span>
                <div className="font-black text-navy font-mono mt-0.5">₹{selectedTripDetails.trip.baseFare}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Bus</span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {selectedTripDetails.trip.busId?.busNumber} ({selectedTripDetails.trip.busId?.busType})
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Operator</span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {selectedTripDetails.trip.operatorId?.companyName}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Physical Seats</span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {selectedTripDetails.totalInventorySeats} seats
                </div>
              </div>
            </div>

            {/* Sequence of Stops */}
            <div>
              <h4 className="font-black text-navy mb-2 uppercase text-[11px] tracking-wider">Scheduled Route Stops &amp; Timings</h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 text-[11px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Seq</th>
                      <th className="p-3">Stop</th>
                      <th className="p-3">City</th>
                      <th className="p-3">Arrival</th>
                      <th className="p-3">Departure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedTripDetails.tripStops || []).map((ts) => (
                      <tr key={ts._id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-primary">#{ts.stopSequence}</td>
                        <td className="p-3 font-bold text-navy">{ts.stopId?.stopName}</td>
                        <td className="p-3 text-slate-600">{ts.stopId?.city}</td>
                        <td className="p-3 text-slate-500 font-mono">
                          {ts.arrivalTime ? new Date(ts.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="p-3 text-slate-500 font-mono">
                          {ts.departureTime ? new Date(ts.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Passenger Manifest Modal */}
      <Modal
        isOpen={manifestModalOpen}
        onClose={() => setManifestModalOpen(false)}
        title="Passenger Journey Manifest"
        maxWidth="max-w-2xl"
      >
        {loadingManifest ? (
          <div className="p-6">
            <LoadingSkeleton count={4} />
          </div>
        ) : manifestData ? (
          <div className="space-y-4 text-xs text-slate-600">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-black text-navy text-sm block">
                  {manifestData.trip?.routeId?.routeName || 'Trip Corridor'}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Vehicle: {manifestData.trip?.busId?.busNumber} ({manifestData.trip?.busId?.registrationNumber})
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Manifested</span>
                <span className="text-base font-black text-primary font-mono">{manifestData.totalPassengers || 0} Passengers</span>
              </div>
            </div>

            {manifestData.manifest?.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No confirmed passengers booked for this scheduled journey.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 text-[11px] font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-3">Seat</th>
                      <th className="p-3">PNR</th>
                      <th className="p-3">Passenger</th>
                      <th className="p-3">Boarding → Dropping</th>
                      <th className="p-3">Fare</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {manifestData.manifest.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-primary">{m.seatNumber}</td>
                        <td className="p-3 font-mono text-navy font-bold">{m.pnr}</td>
                        <td className="p-3">
                          <div className="font-bold text-navy">{m.passenger?.fullName || '—'}</div>
                          <div className="text-[10px] text-slate-400">
                            {m.passenger?.gender}, {m.passenger?.age} yrs
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">
                            {m.boardingStop?.stopName || `Stop #${m.fromSequence}`} → {m.droppingStop?.stopName || `Stop #${m.toSequence}`}
                          </div>
                        </td>
                        <td className="p-3 font-black text-navy font-mono">₹{m.fare}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setManifestModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
