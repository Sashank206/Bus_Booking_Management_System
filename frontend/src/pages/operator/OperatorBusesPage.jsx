import { useState, useEffect, useCallback } from 'react';
import {
  Bus as BusIcon,
  Plus,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  Sliders,
  ShieldAlert,
  Sparkles,
  Wifi,
  Zap,
  Coffee,
  Tv
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import InputField from '../../components/forms/InputField';
import SelectField from '../../components/forms/SelectField';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import api from '../../services/api';

export default function OperatorBusesPage() {
  const { isOperatorApproved } = useAuth();
  const toast = useToast();

  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [viewLayoutModalOpen, setViewLayoutModalOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    busNumber: '',
    busName: '',
    busType: 'AC Seater (2+2)',
    registrationNumber: '',
    rows: 10,
    columns: 4,
    deckCount: 1,
    seatType: 'seater',
    amenities: ['Charging Point', 'Reading Lamp', 'Water Bottle']
  });

  // Generated seats preview
  const [generatedSeats, setGeneratedSeats] = useState([]);

  // Generate seat layout based on rows, columns, and seatType
  const generateSeats = useCallback((rows, cols, type, deck = 1) => {
    const seats = [];
    const colLetters = ['A', 'B', 'C', 'D', 'E'];

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const letter = colLetters[c - 1] || `${c}`;
        const seatNumber = `${r}${letter}`;
        seats.push({
          seatNumber,
          row: r,
          col: c,
          deck,
          seatType: type
        });
      }
    }
    return seats;
  }, []);

  // Update generated seats whenever rows/cols/seatType change
  useEffect(() => {
    const seats = generateSeats(form.rows, form.columns, form.seatType, form.deckCount);
    setGeneratedSeats(seats);
  }, [form.rows, form.columns, form.seatType, form.deckCount, generateSeats]);

  const fetchBuses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/buses');
      if (res && res.data) {
        setBuses(res.data.buses || []);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load fleet buses.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  const handleRegisterBus = async (e) => {
    e.preventDefault();
    if (!isOperatorApproved) {
      toast.error('Only approved operators can register buses.');
      return;
    }

    try {
      setSubmitting(true);
      const totalSeats = generatedSeats.length;

      const payload = {
        busNumber: form.busNumber.trim(),
        busName: form.busName.trim() || undefined,
        busType: form.busType,
        registrationNumber: form.registrationNumber.trim().toUpperCase(),
        totalSeats,
        seatLayout: {
          rows: parseInt(form.rows, 10),
          columns: parseInt(form.columns, 10),
          deckCount: parseInt(form.deckCount, 10),
          seats: generatedSeats
        },
        amenities: form.amenities
      };

      await api.post('/buses', payload);
      toast.success(`Bus ${payload.busNumber} registered with ${totalSeats} seats!`);
      setRegisterModalOpen(false);
      setForm({
        busNumber: '',
        busName: '',
        busType: 'AC Seater (2+2)',
        registrationNumber: '',
        rows: 10,
        columns: 4,
        deckCount: 1,
        seatType: 'seater',
        amenities: ['Charging Point', 'Reading Lamp', 'Water Bottle']
      });
      await fetchBuses();
    } catch (err) {
      toast.error(err.message || 'Failed to register bus.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (bus) => {
    try {
      await api.patch(`/buses/${bus._id}/status`);
      toast.success('Bus status updated.');
      await fetchBuses();
    } catch (err) {
      toast.error(err.message || 'Failed to update bus status.');
    }
  };

  const openLayoutModal = (bus) => {
    setSelectedBus(bus);
    setViewLayoutModalOpen(true);
  };

  const toggleAmenity = (name) => {
    setForm((prev) => {
      const exists = prev.amenities.includes(name);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== name)
          : [...prev.amenities, name]
      };
    });
  };

  const columns = [
    {
      header: 'Bus Fleet # & Name',
      key: 'busNumber',
      render: (row) => (
        <div>
          <div className="font-black text-navy flex items-center gap-1.5">
            <BusIcon className="w-3.5 h-3.5 text-primary" />
            {row.busNumber}
          </div>
          {row.busName && (
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">{row.busName}</div>
          )}
        </div>
      )
    },
    {
      header: 'Registration No.',
      key: 'registrationNumber',
      render: (row) => (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
          {row.registrationNumber}
        </span>
      )
    },
    {
      header: 'Bus Type',
      key: 'busType',
      render: (row) => (
        <span className="text-xs text-slate-700 font-semibold">{row.busType}</span>
      )
    },
    {
      header: 'Total Capacity',
      key: 'totalSeats',
      render: (row) => (
        <span className="text-xs font-black text-navy">
          {row.totalSeats} seats
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
            onClick={() => openLayoutModal(row)}
            title="Inspect Seat Layout"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleStatus(row)}
            className={row.isActive ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}
          >
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
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
            Bus Fleet Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            Configure vehicle identifiers, seat types, deck arrangements, and onboard comforts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={fetchBuses}
            loading={loading}
          >
            Refresh
          </Button>

          {isOperatorApproved && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setRegisterModalOpen(true)}
              className="font-bold shadow-xs"
            >
              Register New Bus
            </Button>
          )}
        </div>
      </div>

      {!isOperatorApproved && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
          <span>
            Fleet registration is temporarily locked pending administrator approval of your operator profile.
          </span>
        </div>
      )}

      {/* Fleet Table */}
      <Card noPadding>
        <DataTable
          columns={columns}
          data={buses}
          loading={loading}
          emptyTitle="No Buses Registered"
          emptyMessage="You have not registered any vehicles yet. Click 'Register New Bus' to configure your fleet."
        />
      </Card>

      {/* Modal: Register New Bus */}
      <Modal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        title="Register New Fleet Vehicle"
        subtitle="Define bus identifiers, seat configuration, and onboard comforts"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleRegisterBus} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField
              label="Bus Fleet Code"
              required
              placeholder="e.g. VOLVO-9600-A"
              value={form.busNumber}
              onChange={(e) => setForm({ ...form, busNumber: e.target.value })}
            />
            <InputField
              label="Vehicle Registration #"
              required
              placeholder="e.g. DL 01 AB 1234"
              value={form.registrationNumber}
              onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField
              label="Marketing Name / Model (Optional)"
              placeholder="e.g. Royal Cruiser Multi-Axle"
              value={form.busName}
              onChange={(e) => setForm({ ...form, busName: e.target.value })}
            />
            <SelectField
              label="Bus Category"
              required
              options={[
                { value: 'AC Seater (2+2)', label: 'AC Seater (2+2)' },
                { value: 'AC Sleeper (2+1)', label: 'AC Sleeper (2+1)' },
                { value: 'Volvo Multi-Axle AC Sleeper', label: 'Volvo Multi-Axle AC Sleeper' },
                { value: 'BharatBenz Semi-Sleeper AC', label: 'BharatBenz Semi-Sleeper AC' },
                { value: 'Non-AC Deluxe Seater', label: 'Non-AC Deluxe Seater' }
              ]}
              value={form.busType}
              onChange={(e) => setForm({ ...form, busType: e.target.value })}
            />
          </div>

          {/* Seat Layout Customizer */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  Seat Layout Configuration
                </h4>
                <p className="text-[11px] text-slate-500">
                  Rows, columns, and seat type dictate physical capacity.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-primary/10 text-primary border border-primary/20">
                {generatedSeats.length} Total Seats
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rows
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={form.rows}
                  onChange={(e) =>
                    setForm({ ...form, rows: Math.max(1, parseInt(e.target.value || 1, 10)) })
                  }
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Columns
                </label>
                <select
                  value={form.columns}
                  onChange={(e) =>
                    setForm({ ...form, columns: parseInt(e.target.value, 10) })
                  }
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={3}>3 Columns (2+1 Layout)</option>
                  <option value={4}>4 Columns (2+2 Layout)</option>
                  <option value={5}>5 Columns (2+3 Layout)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Seat Type
                </label>
                <select
                  value={form.seatType}
                  onChange={(e) => setForm({ ...form, seatType: e.target.value })}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="seater">Seater</option>
                  <option value="sleeper">Sleeper</option>
                  <option value="semi_sleeper">Semi-Sleeper</option>
                </select>
              </div>
            </div>

            {/* Visual Seat Preview Grid */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-500 block mb-2 uppercase tracking-wider">
                Cabin Layout Preview (Front → Back):
              </span>
              <div className="p-3 bg-white rounded-xl border border-slate-200 overflow-x-auto max-h-40">
                <div
                  className="grid gap-1.5 w-fit mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${form.columns}, minmax(36px, 1fr))`
                  }}
                >
                  {generatedSeats.map((seat) => (
                    <div
                      key={seat.seatNumber}
                      className="p-1 rounded-md text-center text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {seat.seatNumber}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Amenities Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Onboard Amenities
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                'Charging Point',
                'Reading Lamp',
                'Water Bottle',
                'Wi-Fi',
                'Blanket & Pillow',
                'Snacks',
                'Emergency Exit'
              ].map((amenity) => {
                const selected = form.amenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      selected
                        ? 'bg-primary text-white border-primary shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {amenity}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setRegisterModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              loading={submitting}
              className="font-bold shadow-xs"
            >
              Register Bus
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Seat Layout */}
      <Modal
        isOpen={viewLayoutModalOpen}
        onClose={() => setViewLayoutModalOpen(false)}
        title={`Seat Map — ${selectedBus?.busNumber || 'Bus'}`}
        subtitle={`${selectedBus?.busType || ''} (${selectedBus?.totalSeats || 0} seats capacity)`}
        maxWidth="max-w-md"
      >
        {selectedBus && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-navy">{selectedBus.registrationNumber}</span>
                <span className="text-[11px] text-slate-500 block">
                  {selectedBus.seatLayout?.rows || 10} Rows × {selectedBus.seatLayout?.columns || 4} Columns
                </span>
              </div>
              <StatusBadge status={selectedBus.isActive ? 'active' : 'suspended'} />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="text-center text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">
                Driver Cabin / Front
              </div>
              <div
                className="grid gap-2 w-fit mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${selectedBus.seatLayout?.columns || 4}, minmax(40px, 1fr))`
                }}
              >
                {selectedBus.seatLayout?.seats?.map((seat) => (
                  <div
                    key={seat.seatNumber}
                    className="p-2 rounded-lg text-center text-xs font-bold font-mono bg-white text-navy border border-slate-300 shadow-2xs"
                  >
                    {seat.seatNumber}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setViewLayoutModalOpen(false)}
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
