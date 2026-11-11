import { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Route as RouteIcon,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Trash2,
  ArrowRight,
  Clock,
  Layers,
  Compass
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import InputField from '../../components/forms/InputField';
import SelectField from '../../components/forms/SelectField';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import useToast from '../../hooks/useToast';
import api from '../../services/api';

export default function AdminStopsRoutesPage() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('stops'); // 'stops' | 'routes'

  // Stops state
  const [stops, setStops] = useState([]);
  const [stopsLoading, setStopsLoading] = useState(true);
  const [stopSearch, setStopSearch] = useState('');
  const [addStopModalOpen, setAddStopModalOpen] = useState(false);
  const [submittingStop, setSubmittingStop] = useState(false);
  const [newStop, setNewStop] = useState({
    stopName: '',
    city: '',
    state: '',
    address: '',
    latitude: '',
    longitude: ''
  });

  // Routes state
  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [createRouteModalOpen, setCreateRouteModalOpen] = useState(false);
  const [submittingRoute, setSubmittingRoute] = useState(false);
  const [selectedRouteDetails, setSelectedRouteDetails] = useState(null);
  const [routeDetailsModalOpen, setRouteDetailsModalOpen] = useState(false);

  const [newRoute, setNewRoute] = useState({
    sourceStopId: '',
    destinationStopId: '',
    routeName: '',
    distanceKm: '',
    estimatedDurationMinutes: '',
    intermediateStops: [] // array of { stopId, distanceFromStart }
  });

  // Fetch Stops
  const fetchStops = useCallback(async () => {
    try {
      setStopsLoading(true);
      const params = {};
      if (stopSearch.trim()) {
        params.search = stopSearch.trim();
      }
      const res = await api.get('/stops', { params });
      if (res && res.data) {
        setStops(res.data.stops || []);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch stops.');
    } finally {
      setStopsLoading(false);
    }
  }, [stopSearch, toast]);

  // Fetch Routes
  const fetchRoutes = useCallback(async () => {
    try {
      setRoutesLoading(true);
      const res = await api.get('/routes');
      if (res && res.data) {
        setRoutes(res.data.routes || []);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch routes.');
    } finally {
      setRoutesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStops();
    fetchRoutes();
  }, [fetchStops, fetchRoutes]);

  // Handle Create Stop
  const handleCreateStop = async (e) => {
    e.preventDefault();
    try {
      setSubmittingStop(true);
      await api.post('/stops', {
        stopName: newStop.stopName.trim(),
        city: newStop.city.trim(),
        state: newStop.state.trim() || undefined,
        address: newStop.address.trim() || undefined,
        latitude: newStop.latitude ? parseFloat(newStop.latitude) : undefined,
        longitude: newStop.longitude ? parseFloat(newStop.longitude) : undefined
      });
      toast.success(`Stop "${newStop.stopName}" created successfully!`);
      setAddStopModalOpen(false);
      setNewStop({
        stopName: '',
        city: '',
        state: '',
        address: '',
        latitude: '',
        longitude: ''
      });
      await fetchStops();
    } catch (err) {
      toast.error(err.message || 'Failed to create stop.');
    } finally {
      setSubmittingStop(false);
    }
  };

  // Handle Toggle Stop Status
  const handleToggleStopStatus = async (stop) => {
    try {
      await api.patch(`/stops/${stop._id}/status`);
      toast.success(`Stop status updated.`);
      await fetchStops();
    } catch (err) {
      toast.error(err.message || 'Failed to update stop status.');
    }
  };

  // Handle Create Route
  const handleCreateRoute = async (e) => {
    e.preventDefault();
    if (newRoute.sourceStopId === newRoute.destinationStopId) {
      toast.error('Source and destination stops cannot be the same.');
      return;
    }

    try {
      setSubmittingRoute(true);

      // Build structured stops sequence if intermediate stops present
      let stopsPayload = undefined;
      if (newRoute.intermediateStops.length > 0) {
        stopsPayload = [
          {
            stopId: newRoute.sourceStopId,
            stopSequence: 0,
            distanceFromStart: 0
          },
          ...newRoute.intermediateStops.map((item, idx) => ({
            stopId: item.stopId,
            stopSequence: idx + 1,
            distanceFromStart: parseFloat(item.distanceFromStart) || (idx + 1) * 50
          })),
          {
            stopId: newRoute.destinationStopId,
            stopSequence: newRoute.intermediateStops.length + 1,
            distanceFromStart: parseFloat(newRoute.distanceKm) || (newRoute.intermediateStops.length + 1) * 100
          }
        ];
      }

      await api.post('/routes', {
        sourceStopId: newRoute.sourceStopId,
        destinationStopId: newRoute.destinationStopId,
        routeName: newRoute.routeName.trim() || undefined,
        distanceKm: newRoute.distanceKm ? parseFloat(newRoute.distanceKm) : undefined,
        estimatedDurationMinutes: newRoute.estimatedDurationMinutes
          ? parseInt(newRoute.estimatedDurationMinutes, 10)
          : undefined,
        stops: stopsPayload
      });

      toast.success('Route created successfully!');
      setCreateRouteModalOpen(false);
      setNewRoute({
        sourceStopId: '',
        destinationStopId: '',
        routeName: '',
        distanceKm: '',
        estimatedDurationMinutes: '',
        intermediateStops: []
      });
      await fetchRoutes();
    } catch (err) {
      toast.error(err.message || 'Failed to create route.');
    } finally {
      setSubmittingRoute(false);
    }
  };

  // Handle Toggle Route Status
  const handleToggleRouteStatus = async (route) => {
    try {
      await api.patch(`/routes/${route._id}/status`);
      toast.success('Route status updated.');
      await fetchRoutes();
    } catch (err) {
      toast.error(err.message || 'Failed to update route status.');
    }
  };

  // Open Route details
  const openRouteDetails = async (route) => {
    try {
      const res = await api.get(`/routes/${route._id}`);
      if (res && res.data) {
        setSelectedRouteDetails(res.data);
        setRouteDetailsModalOpen(true);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load route details.');
    }
  };

  // Add intermediate stop in form
  const addIntermediateStopField = () => {
    setNewRoute((prev) => ({
      ...prev,
      intermediateStops: [
        ...prev.intermediateStops,
        { stopId: '', distanceFromStart: '' }
      ]
    }));
  };

  const removeIntermediateStopField = (index) => {
    setNewRoute((prev) => ({
      ...prev,
      intermediateStops: prev.intermediateStops.filter((_, i) => i !== index)
    }));
  };

  const updateIntermediateStop = (index, field, value) => {
    setNewRoute((prev) => {
      const updated = [...prev.intermediateStops];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, intermediateStops: updated };
    });
  };

  // Stops Table Columns
  const stopColumns = [
    {
      header: 'Stop Name',
      key: 'stopName',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-purple-600" />
            {row.stopName}
          </div>
          {row.address && (
            <div className="text-[11px] text-slate-500 mt-0.5 max-w-xs truncate">
              {row.address}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'City & State',
      key: 'city',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-800">
          {row.city}{row.state ? `, ${row.state}` : ''}
        </span>
      )
    },
    {
      header: 'Coordinates',
      key: 'coordinates',
      render: (row) => (
        <span className="text-xs font-mono text-slate-500">
          {row.latitude && row.longitude
            ? `${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}`
            : '—'}
        </span>
      )
    },
    {
      header: 'Status',
      key: 'isActive',
      render: (row) => (
        <StatusBadge status={row.isActive ? 'active' : 'suspended'} />
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleToggleStopStatus(row)}
          className={row.isActive ? 'text-amber-600 border-amber-200' : 'text-emerald-600 border-emerald-200'}
        >
          {row.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      )
    }
  ];

  // Routes Table Columns
  const routeColumns = [
    {
      header: 'Route Name / Origin → Dest',
      key: 'routeName',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <RouteIcon className="w-3.5 h-3.5 text-purple-600" />
            {row.routeName}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <span>{row.sourceStopId?.city || 'Origin'}</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span>{row.destinationStopId?.city || 'Destination'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Distance & Duration',
      key: 'distance',
      render: (row) => (
        <div className="text-xs text-slate-700">
          <div>{row.distanceKm ? `${row.distanceKm} km` : '—'}</div>
          {row.estimatedDurationMinutes && (
            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-slate-400" />
              {Math.floor(row.estimatedDurationMinutes / 60)}h{' '}
              {row.estimatedDurationMinutes % 60}m
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Intermediate Stops',
      key: 'totalStops',
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
          <Layers className="w-3 h-3 text-slate-500" />
          {row.totalStops || 2} stops
        </span>
      )
    },
    {
      header: 'Status',
      key: 'isActive',
      render: (row) => (
        <StatusBadge status={row.isActive ? 'active' : 'suspended'} />
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={Eye}
            onClick={() => openRouteDetails(row)}
            title="Inspect Stop Sequence"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleRouteStatus(row)}
            className={row.isActive ? 'text-amber-600 border-amber-200' : 'text-emerald-600 border-emerald-200'}
          >
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      )
    }
  ];

  const stopOptions = stops
    .filter((s) => s.isActive)
    .map((s) => ({
      value: s._id,
      label: `${s.stopName} (${s.city}${s.state ? `, ${s.state}` : ''})`
    }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Stops &amp; Routes Master Network
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure geographic boarding locations, multi-city travel corridors, and ordered stop sequences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'stops' ? (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setAddStopModalOpen(true)}
            >
              Add Physical Stop
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setCreateRouteModalOpen(true)}
            >
              Create Route Corridor
            </Button>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('stops')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'stops'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Physical Stops Master ({stops.length})
        </button>
        <button
          onClick={() => setActiveTab('routes')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'routes'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RouteIcon className="w-4 h-4" />
          Route Corridors &amp; Sequences ({routes.length})
        </button>
      </div>

      {/* Stops Tab View */}
      {activeTab === 'stops' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200">
            <div className="w-full sm:w-80">
              <InputField
                placeholder="Search stops by name or city..."
                icon={Search}
                value={stopSearch}
                onChange={(e) => setStopSearch(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={fetchStops}
              loading={stopsLoading}
            >
              Refresh
            </Button>
          </div>

          <Card noPadding>
            <DataTable
              columns={stopColumns}
              data={stops}
              loading={stopsLoading}
              emptyTitle="No Stops Configured"
              emptyMessage="Click 'Add Physical Stop' to create boarding and dropping locations."
            />
          </Card>
        </div>
      )}

      {/* Routes Tab View */}
      {activeTab === 'routes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={fetchRoutes}
              loading={routesLoading}
            >
              Refresh Routes
            </Button>
          </div>

          <Card noPadding>
            <DataTable
              columns={routeColumns}
              data={routes}
              loading={routesLoading}
              emptyTitle="No Routes Configured"
              emptyMessage="Click 'Create Route Corridor' to link physical stops into a travel route."
            />
          </Card>
        </div>
      )}

      {/* Modal: Add Physical Stop */}
      <Modal
        isOpen={addStopModalOpen}
        onClose={() => setAddStopModalOpen(false)}
        title="Add Master Stop Location"
        subtitle="Register a geographic boarding/dropping point"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateStop} className="space-y-4">
          <InputField
            label="Stop Name"
            required
            placeholder="e.g. Kashmere Gate ISBT"
            value={newStop.stopName}
            onChange={(e) => setNewStop({ ...newStop, stopName: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="City"
              required
              placeholder="e.g. Delhi"
              value={newStop.city}
              onChange={(e) => setNewStop({ ...newStop, city: e.target.value })}
            />
            <InputField
              label="State"
              placeholder="e.g. Delhi"
              value={newStop.state}
              onChange={(e) => setNewStop({ ...newStop, state: e.target.value })}
            />
          </div>

          <InputField
            label="Landmark / Full Address"
            placeholder="e.g. Near Metro Gate 1, Ring Road"
            value={newStop.address}
            onChange={(e) => setNewStop({ ...newStop, address: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Latitude"
              type="number"
              step="any"
              placeholder="e.g. 28.6675"
              value={newStop.latitude}
              onChange={(e) => setNewStop({ ...newStop, latitude: e.target.value })}
            />
            <InputField
              label="Longitude"
              type="number"
              step="any"
              placeholder="e.g. 77.2285"
              value={newStop.longitude}
              onChange={(e) => setNewStop({ ...newStop, longitude: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setAddStopModalOpen(false)}
              disabled={submittingStop}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              loading={submittingStop}
            >
              Save Stop
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Route Corridor */}
      <Modal
        isOpen={createRouteModalOpen}
        onClose={() => setCreateRouteModalOpen(false)}
        title="Create Reusable Route Corridor"
        subtitle="Connect source, intermediate, and destination stops"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateRoute} className="space-y-4">
          <InputField
            label="Route Name (Optional)"
            placeholder="e.g. Delhi - Amritsar Express Corridor"
            value={newRoute.routeName}
            onChange={(e) => setNewRoute({ ...newRoute, routeName: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectField
              label="Origin (Source Stop)"
              required
              options={stopOptions}
              value={newRoute.sourceStopId}
              onChange={(e) => setNewRoute({ ...newRoute, sourceStopId: e.target.value })}
              placeholder="Select origin stop..."
            />
            <SelectField
              label="Destination Stop"
              required
              options={stopOptions}
              value={newRoute.destinationStopId}
              onChange={(e) => setNewRoute({ ...newRoute, destinationStopId: e.target.value })}
              placeholder="Select destination stop..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Total Distance (km)"
              type="number"
              placeholder="e.g. 450"
              value={newRoute.distanceKm}
              onChange={(e) => setNewRoute({ ...newRoute, distanceKm: e.target.value })}
            />
            <InputField
              label="Estimated Duration (minutes)"
              type="number"
              placeholder="e.g. 480 (8 hours)"
              value={newRoute.estimatedDurationMinutes}
              onChange={(e) => setNewRoute({ ...newRoute, estimatedDurationMinutes: e.target.value })}
            />
          </div>

          {/* Intermediate Stops section */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Ordered Intermediate Stops
                </h4>
                <p className="text-[11px] text-slate-500">
                  Optional waypoints between origin (pos 0) and destination.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                icon={Plus}
                onClick={addIntermediateStopField}
              >
                Add Intermediate Stop
              </Button>
            </div>

            {newRoute.intermediateStops.map((st, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-400 w-5">
                  #{idx + 1}
                </span>
                <div className="flex-1">
                  <SelectField
                    options={stopOptions}
                    value={st.stopId}
                    onChange={(e) => updateIntermediateStop(idx, 'stopId', e.target.value)}
                    placeholder="Select waypoint..."
                  />
                </div>
                <div className="w-32">
                  <InputField
                    type="number"
                    placeholder="Dist from start (km)"
                    value={st.distanceFromStart}
                    onChange={(e) => updateIntermediateStop(idx, 'distanceFromStart', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeIntermediateStopField(idx)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                  title="Remove stop"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setCreateRouteModalOpen(false)}
              disabled={submittingRoute}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              loading={submittingRoute}
            >
              Save Route Corridor
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Route Details & Ordered Stop Timeline */}
      <Modal
        isOpen={routeDetailsModalOpen}
        onClose={() => setRouteDetailsModalOpen(false)}
        title={selectedRouteDetails?.route?.routeName || 'Route Corridor Sequence'}
        subtitle="Complete ordered stops and segment distance profile"
        maxWidth="max-w-xl"
      >
        {selectedRouteDetails && (
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900">
              <div>
                <span className="font-bold">Total Distance:</span> {selectedRouteDetails.route.distanceKm || '—'} km
              </div>
              <div>
                <span className="font-bold">Estimated Time:</span>{' '}
                {selectedRouteDetails.route.estimatedDurationMinutes
                  ? `${Math.floor(selectedRouteDetails.route.estimatedDurationMinutes / 60)}h ${selectedRouteDetails.route.estimatedDurationMinutes % 60}m`
                  : '—'}
              </div>
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-purple-200">
              {selectedRouteDetails.routeStops?.map((rs, idx) => (
                <div key={rs._id} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-purple-600 border-2 border-white shadow-xs" />
                  <div className="bg-white p-3 rounded-lg border border-slate-200 flex-1 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                          Seq #{rs.stopSequence}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {rs.stopId?.stopName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {rs.stopId?.city}, {rs.stopId?.state || ''}
                      </div>
                    </div>
                    <div className="text-right text-xs font-mono text-slate-600">
                      {rs.distanceFromStart || 0} km
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setRouteDetailsModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
