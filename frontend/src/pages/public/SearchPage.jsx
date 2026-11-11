import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Calendar,
  Bus,
  ArrowRightLeft,
  Clock,
  Filter,
  RotateCcw,
  Star,
  Users,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import SeatMap from '../../components/booking/SeatMap';
import PassengerFormModal from '../../components/booking/PassengerFormModal';
import TicketModal from '../../components/booking/TicketModal';
import Modal from '../../components/ui/Modal';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  // Search input state
  const [origin, setOrigin] = useState(searchParams.get('origin') || '');
  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [date, setDate] = useState(
    searchParams.get('date') || new Date().toISOString().split('T')[0]
  );

  // Stop suggestions state
  const [allStops, setAllStops] = useState([]);

  // Results state
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Active expanded trip for seat selection
  const [expandedTripId, setExpandedTripId] = useState(null);
  const [tripSeatData, setTripSeatData] = useState(null);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState([]);

  // Hold & Booking modal state
  const [holdData, setHoldData] = useState(null);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [holdingSeats, setHoldingSeats] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showAuthRequiredModal, setShowAuthRequiredModal] = useState(false);

  // Filtering & Sorting State
  const [selectedBusTypes, setSelectedBusTypes] = useState([]);
  const [selectedTimeWindows, setSelectedTimeWindows] = useState([]);
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [maxFareLimit, setMaxFareLimit] = useState(3000);
  const [sortBy, setSortBy] = useState('departure'); // 'departure', 'fare_asc', 'duration', 'seats'

  // Fetch stops list once on mount for autocompletion / suggestions
  useEffect(() => {
    let isMounted = true;
    const fetchStops = async () => {
      try {
        const res = await api.get('/stops?limit=100');
        if (isMounted && res.data?.stops) {
          setAllStops(res.data.stops);
        }
      } catch (err) {
        // Silently catch suggestion failure
      }
    };
    fetchStops();
    return () => {
      isMounted = false;
    };
  }, []);

  // Perform search whenever searchParams change
  useEffect(() => {
    const qOrigin = searchParams.get('origin');
    const qDestination = searchParams.get('destination');
    const qDate = searchParams.get('date');

    if (qOrigin && qDestination) {
      setOrigin(qOrigin);
      setDestination(qDestination);
      if (qDate) setDate(qDate);
      executeSearch(qOrigin, qDestination, qDate || date);
    }
  }, [searchParams]);

  const executeSearch = async (from, to, journeyDate) => {
    setLoading(true);
    setHasSearched(true);
    setExpandedTripId(null);
    setSelectedSeats([]);
    setTripSeatData(null);

    try {
      const res = await api.get('/trips/search', {
        params: {
          origin: from,
          destination: to,
          date: journeyDate
        }
      });
      setTrips(res.data?.trips || []);
    } catch (err) {
      toast.error(err.message || 'Failed to search scheduled trips.');
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) {
      toast.error('Please specify both origin and destination cities/stops.');
      return;
    }
    const params = new URLSearchParams();
    params.set('origin', origin.trim());
    params.set('destination', destination.trim());
    if (date) params.set('date', date);
    setSearchParams(params);
  };

  const handleSwapStops = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  // Expand / Collapse Trip Seat Map
  const handleToggleTripSeats = async (trip) => {
    if (expandedTripId === trip._id) {
      setExpandedTripId(null);
      setTripSeatData(null);
      setSelectedSeats([]);
      return;
    }

    setExpandedTripId(trip._id);
    setSelectedSeats([]);
    setLoadingSeats(true);

    try {
      const res = await api.get(`/trips/${trip._id}/seats`, {
        params: {
          fromStopId: trip.boardingStop.stopId,
          toStopId: trip.droppingStop.stopId
        }
      });
      setTripSeatData(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load bus seat availability.');
      setExpandedTripId(null);
    } finally {
      setLoadingSeats(false);
    }
  };

  const handleSeatToggle = (seatNumber) => {
    setSelectedSeats((prev) => {
      if (prev.includes(seatNumber)) {
        return prev.filter((s) => s !== seatNumber);
      } else {
        return [...prev, seatNumber];
      }
    });
  };

  // Proceed to acquire hold and book
  const handleProceedToBooking = async (trip) => {
    if (!isAuthenticated) {
      setShowAuthRequiredModal(true);
      return;
    }

    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat to proceed.');
      return;
    }

    setHoldingSeats(true);
    try {
      const res = await api.post('/bookings/hold', {
        tripId: trip._id,
        seatNumbers: selectedSeats,
        boardingStopId: trip.boardingStop.stopId,
        droppingStopId: trip.droppingStop.stopId
      });

      setHoldData(res.data);
      setShowPassengerModal(true);
      toast.success(res.message || 'Seats held for 10 minutes.');
    } catch (err) {
      toast.error(err.message || 'Failed to acquire seat hold. Another passenger may have just reserved this seat.');
      // Refresh seat layout
      handleToggleTripSeats(trip);
    } finally {
      setHoldingSeats(false);
    }
  };

  const handleBookingSuccess = (bookingResult) => {
    setShowPassengerModal(false);
    setHoldData(null);
    setConfirmedBookingData(bookingResult);
    setShowTicketModal(true);
    // Refresh search results
    executeSearch(origin, destination, date);
  };

  const handleHoldExpired = () => {
    setShowPassengerModal(false);
    setHoldData(null);
    setSelectedSeats([]);
    if (expandedTripId) {
      const currentTrip = trips.find((t) => t._id === expandedTripId);
      if (currentTrip) handleToggleTripSeats(currentTrip);
    }
  };

  // Extract unique operators and bus types from current search results
  const availableOperators = useMemo(() => {
    const map = new Map();
    trips.forEach((t) => {
      const op = t.operator;
      if (op && op._id) {
        map.set(op._id, op.companyName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [trips]);

  // Client-Side Filtered & Sorted Trips
  const filteredTrips = useMemo(() => {
    let result = [...trips];

    // Filter by Bus Type
    if (selectedBusTypes.length > 0) {
      result = result.filter((t) => {
        const typeStr = (t.bus?.busType || '').toLowerCase();
        return selectedBusTypes.some((bt) => typeStr.includes(bt.toLowerCase()));
      });
    }

    // Filter by Operator
    if (selectedOperators.length > 0) {
      result = result.filter((t) => selectedOperators.includes(t.operator?._id));
    }

    // Filter by Fare Limit
    if (maxFareLimit) {
      result = result.filter((t) => t.fare <= maxFareLimit);
    }

    // Filter by Departure Time Window
    if (selectedTimeWindows.length > 0) {
      result = result.filter((t) => {
        const dep = new Date(t.boardingStop.departureTime);
        const hour = dep.getHours();
        return selectedTimeWindows.some((window) => {
          if (window === 'morning') return hour >= 6 && hour < 12;
          if (window === 'afternoon') return hour >= 12 && hour < 18;
          if (window === 'evening') return hour >= 18 && hour < 24;
          if (window === 'early_morning') return hour >= 0 && hour < 6;
          return true;
        });
      });
    }

    // Sort Results
    result.sort((a, b) => {
      if (sortBy === 'fare_asc') return a.fare - b.fare;
      if (sortBy === 'duration') return a.durationMinutes - b.durationMinutes;
      if (sortBy === 'seats') return b.availableSeats - a.availableSeats;
      // Default: departure time
      return new Date(a.boardingStop.departureTime) - new Date(b.boardingStop.departureTime);
    });

    return result;
  }, [trips, selectedBusTypes, selectedOperators, maxFareLimit, selectedTimeWindows, sortBy]);

  const clearAllFilters = () => {
    setSelectedBusTypes([]);
    setSelectedTimeWindows([]);
    setSelectedOperators([]);
    setMaxFareLimit(3000);
    setSortBy('departure');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '—';
    return new Date(timeString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m > 0 ? `${m}m` : ''}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end">
            {/* Origin */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                From (Origin)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  list="stop-suggestions"
                  placeholder="Origin Stop or City"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>
            </div>

            {/* Swap Button */}
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center pb-1">
              <button
                type="button"
                onClick={handleSwapStops}
                title="Swap origin and destination"
                className="p-2 rounded-full border border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Destination */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                To (Destination)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  list="stop-suggestions"
                  placeholder="Destination Stop or City"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>
            </div>

            {/* Date */}
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Travel Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-2 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="lg:col-span-1">
              <Button
                type="submit"
                variant="accent"
                size="md"
                className="w-full py-2.5 justify-center"
                loading={loading}
                icon={Search}
              >
                Search
              </Button>
            </div>
          </div>

          {/* Datalist for active stop autocomplete */}
          <datalist id="stop-suggestions">
            {allStops.map((s) => (
              <option key={s._id} value={s.city ? `${s.city} - ${s.stopName}` : s.stopName} />
            ))}
          </datalist>
        </form>
      </div>

      {/* Main Results Layout: Filters + Trip Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Filters
                </h3>
              </div>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-amber-600 hover:text-amber-700 font-bold"
              >
                Reset All
              </button>
            </div>

            {/* Departure Time Filter */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase text-slate-500">Departure Time</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'early_morning', label: 'Before 6 AM' },
                  { id: 'morning', label: '6 AM - 12 PM' },
                  { id: 'afternoon', label: '12 PM - 6 PM' },
                  { id: 'evening', label: 'After 6 PM' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setSelectedTimeWindows((prev) =>
                        prev.includes(item.id)
                          ? prev.filter((id) => id !== item.id)
                          : [...prev, item.id]
                      )
                    }
                    className={`p-2 rounded-lg border text-center font-semibold transition-colors ${
                      selectedTimeWindows.includes(item.id)
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bus Type Filter */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase text-slate-500">Bus Type</h4>
              <div className="space-y-1.5 text-xs">
                {['AC', 'Sleeper', 'Seater', 'Non-AC'].map((bt) => (
                  <label key={bt} className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedBusTypes.includes(bt)}
                      onChange={(e) =>
                        setSelectedBusTypes((prev) =>
                          e.target.checked ? [...prev, bt] : prev.filter((t) => t !== bt)
                        )
                      }
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>{bt} Buses</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Max Fare Slider */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <h4 className="font-bold uppercase text-slate-500">Max Fare</h4>
                <span className="font-bold text-slate-900">₹{maxFareLimit}</span>
              </div>
              <input
                type="range"
                min="300"
                max="3000"
                step="50"
                value={maxFareLimit}
                onChange={(e) => setMaxFareLimit(Number(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer"
              />
            </div>

            {/* Operator Filter */}
            {availableOperators.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase text-slate-500">Operators</h4>
                <div className="space-y-1.5 text-xs max-h-36 overflow-y-auto">
                  {availableOperators.map((op) => (
                    <label key={op.id} className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedOperators.includes(op.id)}
                        onChange={(e) =>
                          setSelectedOperators((prev) =>
                            e.target.checked ? [...prev, op.id] : prev.filter((id) => id !== op.id)
                          )
                        }
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span className="truncate">{op.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Trips Listing */}
        <div className="lg:col-span-3 space-y-4">
          {/* Top Sort Bar */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <span className="text-xs font-bold text-slate-700">
              {filteredTrips.length} {filteredTrips.length === 1 ? 'Trip' : 'Trips'} Available
            </span>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Sort by:</span>
              <div className="flex items-center gap-1">
                {[
                  { id: 'departure', label: 'Departure' },
                  { id: 'fare_asc', label: 'Price: Low to High' },
                  { id: 'duration', label: 'Fastest' },
                  { id: 'seats', label: 'Seats Left' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSortBy(s.id)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      sortBy === s.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Loading Skeletons */}
          {loading && (
            <div className="space-y-4">
              <LoadingSkeleton count={3} />
            </div>
          )}

          {/* Empty Results State */}
          {!loading && hasSearched && filteredTrips.length === 0 && (
            <EmptyState
              icon={Bus}
              title="No buses available for this route"
              description={`We could not find any active journeys operating from '${origin}' to '${destination}' on ${date}. Try selecting another travel date or adjusting your filters.`}
              action={
                <Button variant="secondary" size="sm" onClick={clearAllFilters} icon={RotateCcw}>
                  Reset Filters
                </Button>
              }
            />
          )}

          {/* Initial Search Prompt */}
          {!loading && !hasSearched && (
            <EmptyState
              icon={Search}
              title="Enter your journey details"
              description="Specify origin and destination cities/stops to explore verified bus schedules, cabin seat maps, and instant bookings."
            />
          )}

          {/* Trip Cards */}
          {!loading &&
            filteredTrips.map((trip) => {
              const isExpanded = expandedTripId === trip._id;
              const isLowSeats = trip.availableSeats <= 5 && trip.availableSeats > 0;

              return (
                <div
                  key={trip._id}
                  className={`bg-white rounded-2xl border transition-all shadow-xs ${
                    isExpanded ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Card Main Row */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      {/* Operator & Bus Details */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-bold text-slate-900">
                            {trip.operator?.companyName || 'Bus Operator'}
                          </h3>
                          {trip.operator?.rating && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {trip.operator.rating}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          {trip.bus?.busType || 'Standard'} • Reg: {trip.bus?.registrationNumber || trip.bus?.busNumber}
                        </p>
                      </div>

                      {/* Fare & Seats Summary */}
                      <div className="text-left sm:text-right">
                        <div className="flex items-baseline gap-1 sm:justify-end">
                          <span className="text-xs text-slate-400 font-medium">Starts from</span>
                          <span className="text-2xl font-black text-slate-900 font-mono">
                            ₹{trip.fare}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold block ${
                            isLowSeats ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {trip.availableSeats} seats remaining
                        </span>
                      </div>
                    </div>

                    {/* Timeline / Route Progress */}
                    <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                      {/* Departure */}
                      <div>
                        <span className="text-lg font-black text-slate-900 font-mono block">
                          {formatTime(trip.boardingStop.departureTime)}
                        </span>
                        <span className="text-xs font-bold text-slate-800 block">
                          {trip.boardingStop.stopName}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {trip.boardingStop.city || ''}
                        </span>
                      </div>

                      {/* Duration Pill */}
                      <div className="flex flex-col items-center justify-center text-center">
                        <span className="text-[11px] font-bold text-slate-500 mb-1">
                          {formatDuration(trip.durationMinutes)}
                        </span>
                        <div className="w-full flex items-center gap-1 px-4">
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                          <div className="h-0.5 w-full bg-slate-300 border-t border-dashed border-slate-400" />
                          <Bus className="w-3.5 h-3.5 text-slate-500" />
                          <div className="h-0.5 w-full bg-slate-300 border-t border-dashed border-slate-400" />
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        </div>
                      </div>

                      {/* Arrival */}
                      <div className="text-left sm:text-right">
                        <span className="text-lg font-black text-slate-900 font-mono block">
                          {formatTime(trip.droppingStop.arrivalTime)}
                        </span>
                        <span className="text-xs font-bold text-slate-800 block">
                          {trip.droppingStop.stopName}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {trip.droppingStop.city || ''}
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {trip.bus?.amenities && trip.bus.amenities.length > 0 && (
                          <span>Amenities: {trip.bus.amenities.slice(0, 3).join(', ')}</span>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant={isExpanded ? 'secondary' : 'accent'}
                        size="sm"
                        onClick={() => handleToggleTripSeats(trip)}
                        icon={isExpanded ? ChevronUp : ChevronDown}
                      >
                        {isExpanded ? 'Hide Seat Map' : 'Select Seats'}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Seat Map Drawer */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50/60 p-6 space-y-6 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            Live Cabin Seat Layout
                          </h4>
                          <p className="text-xs text-slate-500">
                            Click available seats to select (up to 6 seats max).
                          </p>
                        </div>

                        {selectedSeats.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-600">Selected:</span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs">
                              {selectedSeats.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Seat Map Component */}
                      <SeatMap
                        seatLayout={tripSeatData?.seatLayout}
                        selectedSeats={selectedSeats}
                        onSeatToggle={handleSeatToggle}
                        maxSelectable={6}
                        segmentFare={trip.fare}
                        loading={loadingSeats}
                      />

                      {/* Bottom Selection Summary & Hold Trigger */}
                      {selectedSeats.length > 0 && (
                        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-xs font-semibold text-slate-500 block">
                              Reservation Summary
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                              {selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'} (
                              {selectedSeats.join(', ')}) • Total: ₹{trip.fare * selectedSeats.length}
                            </span>
                          </div>

                          <Button
                            type="button"
                            variant="accent"
                            size="md"
                            loading={holdingSeats}
                            onClick={() => handleProceedToBooking(trip)}
                            icon={ArrowRightLeft}
                          >
                            Hold Seats & Enter Passenger Details
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* 10-Minute Hold & Passenger Information Modal */}
      {showPassengerModal && holdData && (
        <PassengerFormModal
          isOpen={showPassengerModal}
          onClose={() => {
            setShowPassengerModal(false);
            setHoldData(null);
            setSelectedSeats([]);
          }}
          holdData={holdData}
          onBookingSuccess={handleBookingSuccess}
          onHoldExpired={handleHoldExpired}
        />
      )}

      {/* Booking Confirmation / Ticket Modal */}
      {showTicketModal && confirmedBookingData && (
        <TicketModal
          isOpen={showTicketModal}
          onClose={() => {
            setShowTicketModal(false);
            setConfirmedBookingData(null);
          }}
          bookingData={confirmedBookingData}
        />
      )}

      {/* Authentication Required Modal */}
      {showAuthRequiredModal && (
        <Modal
          isOpen={showAuthRequiredModal}
          onClose={() => setShowAuthRequiredModal(false)}
          title="Sign in to Continue Reservation"
          subtitle="Customer account required for ticket reservation"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              To hold seats and issue your travel ticket with a unique PNR, please log in with your customer account or register for free.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAuthRequiredModal(false)}
              >
                Cancel
              </Button>
              <Link to="/login">
                <Button variant="accent" size="sm">
                  Log In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" size="sm">
                  Register
                </Button>
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
