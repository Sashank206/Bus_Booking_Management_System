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
  AlertCircle,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Wifi,
  Coffee
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
import PaymentModal from '../../components/booking/PaymentModal';
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
  const [passengerDraft, setPassengerDraft] = useState(null);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [holdingSeats, setHoldingSeats] = useState(false);
  const [pendingPaymentBooking, setPendingPaymentBooking] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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

  const handleDayShift = (days) => {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + days);
    const newDateStr = currentDate.toISOString().split('T')[0];
    setDate(newDateStr);

    const params = new URLSearchParams(searchParams);
    params.set('date', newDateStr);
    setSearchParams(params);
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
      const code = err.code;
      if (code === 'SEAT_ALREADY_BOOKED') {
        toast.error('Sorry, this seat was just booked by another passenger. Please choose another seat.');
      } else if (code === 'TRIP_NOT_BOOKABLE') {
        toast.error('This trip is no longer accepting bookings.');
      } else {
        toast.error(err.message || 'Failed to acquire seat hold. Another passenger may have just reserved this seat.');
      }
      handleToggleTripSeats(trip);
    } finally {
      setHoldingSeats(false);
    }
  };

  const handleBookingSuccess = (bookingResult) => {
    setShowPassengerModal(false);
    setHoldData(null);
    setPassengerDraft(null);
    setPendingPaymentBooking(bookingResult);
    setShowPaymentModal(true);
    executeSearch(origin, destination, date);
  };

  const handlePaymentSuccess = (confirmedData) => {
    setShowPaymentModal(false);
    setPendingPaymentBooking(null);
    setPassengerDraft(null);
    setConfirmedBookingData(confirmedData);
    setShowTicketModal(true);
    executeSearch(origin, destination, date);
  };

  const handlePaymentFailure = () => {
    setShowPaymentModal(false);
    setPendingPaymentBooking(null);
    setSelectedSeats([]);
    executeSearch(origin, destination, date);
  };

  const handleHoldExpired = (savedPassengers = null) => {
    setShowPassengerModal(false);
    setHoldData(null);
    setSelectedSeats([]);
    if (savedPassengers) {
      setPassengerDraft(savedPassengers);
    }
    if (expandedTripId) {
      const currentTrip = trips.find((t) => t._id === expandedTripId);
      if (currentTrip) handleToggleTripSeats(currentTrip);
    }
  };

  const handleSeatConflict = (savedPassengers = null) => {
    setShowPassengerModal(false);
    setHoldData(null);
    setSelectedSeats([]);
    if (savedPassengers) {
      setPassengerDraft(savedPassengers);
    }
    if (expandedTripId) {
      const currentTrip = trips.find((t) => t._id === expandedTripId);
      if (currentTrip) handleToggleTripSeats(currentTrip);
    }
  };

  // Extract unique operators from current search results
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

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Search Header Bar (Sticky Top RedBus style) */}
      <div className="bg-white border-b border-slate-200 shadow-xs sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
              {/* Origin */}
              <div className="lg:col-span-4">
                <div className="relative">
                  <MapPin className="w-4 h-4 text-primary absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    list="stop-suggestions"
                    placeholder="Origin Stop or City"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              {/* Swap Button */}
              <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
                <button
                  type="button"
                  onClick={handleSwapStops}
                  title="Swap Origin and Destination"
                  className="w-9 h-9 rounded-full border border-slate-200 text-slate-500 hover:text-primary hover:border-primary hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Destination */}
              <div className="lg:col-span-3">
                <div className="relative">
                  <MapPin className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    list="stop-suggestions"
                    placeholder="Destination Stop or City"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              {/* Date */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-2 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div className="lg:col-span-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full py-2.5 justify-center shadow-xs font-bold"
                  loading={loading}
                  icon={Search}
                >
                  Modify Search
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
      </div>

      {/* Date Day-Strip Navigation Ribbon */}
      {hasSearched && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleDayShift(-1)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Day</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold text-slate-400">Travel Date:</span>
              <span className="text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                {formatDateDisplay(date)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleDayShift(1)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-50"
            >
              <span>Next Day</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Filters Sidebar */}
          <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-40">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-black text-navy uppercase tracking-wider">
                    Filters
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs text-primary hover:text-primary-hover font-bold transition-colors"
                >
                  Reset All
                </button>
              </div>

              {/* Departure Time Filter */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Departure Time
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'early_morning', label: 'Before 6 AM', icon: Moon },
                    { id: 'morning', label: '6 AM - 12 PM', icon: Sunrise },
                    { id: 'afternoon', label: '12 PM - 6 PM', icon: Sun },
                    { id: 'evening', label: 'After 6 PM', icon: Sunset }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = selectedTimeWindows.includes(item.id);
                    return (
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
                        className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                          isActive
                            ? 'bg-navy text-white border-navy shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                        <span className="text-[11px] leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bus Type Filter */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Bus Type
                </h4>
                <div className="space-y-2 text-xs">
                  {['AC', 'Sleeper', 'Seater', 'Non-AC'].map((bt) => (
                    <label key={bt} className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-700 hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={selectedBusTypes.includes(bt)}
                        onChange={(e) =>
                          setSelectedBusTypes((prev) =>
                            e.target.checked ? [...prev, bt] : prev.filter((t) => t !== bt)
                          )
                        }
                        className="rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span className="font-semibold">{bt} Buses</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Max Fare Slider */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    Max Ticket Price
                  </h4>
                  <span className="font-black text-primary font-mono">₹{maxFareLimit}</span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="3000"
                  step="50"
                  value={maxFareLimit}
                  onChange={(e) => setMaxFareLimit(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Operator Filter */}
              {availableOperators.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    Bus Operators ({availableOperators.length})
                  </h4>
                  <div className="space-y-2 text-xs max-h-40 overflow-y-auto pr-1">
                    {availableOperators.map((op) => (
                      <label key={op.id} className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={selectedOperators.includes(op.id)}
                          onChange={(e) =>
                            setSelectedOperators((prev) =>
                              e.target.checked ? [...prev, op.id] : prev.filter((id) => id !== op.id)
                            )
                          }
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="truncate font-semibold">{op.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Trips Listing */}
          <div className="lg:col-span-3 space-y-4">
            {/* Top Sort & Count Bar */}
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <span className="text-xs font-black text-navy uppercase tracking-wider">
                {filteredTrips.length} {filteredTrips.length === 1 ? 'Bus Service Available' : 'Bus Services Available'}
              </span>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Sort by:</span>
                <div className="flex items-center gap-1.5">
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        sortBy === s.id
                          ? 'bg-navy text-white shadow-2xs'
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
                title="No bus services found for this journey"
                description={`We could not find active bus schedules from '${origin}' to '${destination}' on ${date}. Try selecting another date or resetting your filters.`}
                action={
                  <Button variant="secondary" size="sm" onClick={clearAllFilters} icon={RotateCcw}>
                    Reset All Filters
                  </Button>
                }
              />
            )}

            {/* Initial Search Prompt */}
            {!loading && !hasSearched && (
              <EmptyState
                icon={Search}
                title="Search scheduled bus services"
                description="Specify your departure city and destination to explore verified intercity schedules, live seat maps, and book tickets."
              />
            )}

            {/* Trip Cards (Commercial RedBus Standard) */}
            {!loading &&
              filteredTrips.map((trip) => {
                const isExpanded = expandedTripId === trip._id;
                const isLowSeats = trip.availableSeats <= 5 && trip.availableSeats > 0;

                return (
                  <div
                    key={trip._id}
                    className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? 'border-primary shadow-md ring-2 ring-primary/10'
                        : 'border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    {/* Card Main Body */}
                    <div className="p-5 sm:p-6 space-y-4">
                      {/* Header Row: Operator, Bus Type, Fare */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-black text-navy tracking-tight">
                              {trip.operator?.companyName || 'Bus Operator'}
                            </h3>
                            {trip.operator?.rating && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
                                <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                                {trip.operator.rating}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-semibold">
                            {trip.bus?.busType || 'Standard'} • Reg: {trip.bus?.registrationNumber || trip.bus?.busNumber}
                          </p>
                        </div>

                        {/* Price & Seats Block */}
                        <div className="text-left sm:text-right">
                          <div className="flex items-baseline gap-1.5 sm:justify-end">
                            <span className="text-xs text-slate-400 font-medium">Starts from</span>
                            <span className="text-2xl font-black text-navy font-mono">
                              ₹{trip.fare}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-bold block ${
                              isLowSeats ? 'text-primary' : 'text-emerald-700'
                            }`}
                          >
                            {trip.availableSeats} seats remaining
                          </span>
                        </div>
                      </div>

                      {/* Journey Timetable Strip */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                        {/* Departure Stop */}
                        <div>
                          <span className="text-xl font-black text-navy font-mono block">
                            {formatTime(trip.boardingStop.departureTime)}
                          </span>
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {trip.boardingStop.stopName}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {trip.boardingStop.city || ''}
                          </span>
                        </div>

                        {/* Journey Duration Track */}
                        <div className="flex flex-col items-center justify-center text-center">
                          <span className="text-[11px] font-bold text-slate-500 mb-1">
                            {formatDuration(trip.durationMinutes)}
                          </span>
                          <div className="w-full flex items-center gap-1 px-4">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                            <div className="h-0.5 w-full bg-slate-300 border-t border-dashed border-slate-400" />
                            <div className="p-1 rounded-full bg-slate-200 text-slate-700">
                              <Bus className="w-3.5 h-3.5" />
                            </div>
                            <div className="h-0.5 w-full bg-slate-300 border-t border-dashed border-slate-400" />
                            <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                          </div>
                        </div>

                        {/* Arrival Stop */}
                        <div className="text-left sm:text-right">
                          <span className="text-xl font-black text-navy font-mono block">
                            {formatTime(trip.droppingStop.arrivalTime)}
                          </span>
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {trip.droppingStop.stopName}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {trip.droppingStop.city || ''}
                          </span>
                        </div>
                      </div>

                      {/* Amenities & Select Seats Button */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                            <Zap className="w-3 h-3 text-amber-500" /> Charging Point
                          </span>
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" /> Verified Bus
                          </span>
                          {trip.bus?.amenities && trip.bus.amenities.length > 0 && (
                            <span className="font-semibold text-slate-600">
                              +{trip.bus.amenities.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant={isExpanded ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleTripSeats(trip)}
                          icon={isExpanded ? ChevronUp : ChevronDown}
                          className="font-bold w-full sm:w-auto justify-center"
                        >
                          {isExpanded ? 'Hide Cabin' : 'Select Seats'}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Seat Map Drawer */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50/70 p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-black text-navy">
                              Select Your Cabin Seats
                            </h4>
                            <p className="text-xs text-slate-500">
                              Choose up to 6 seats per transaction. Click on an available seat to select.
                            </p>
                          </div>

                          {selectedSeats.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-600">Selected Seats:</span>
                              <span className="px-2.5 py-1 rounded-md bg-primary text-white font-mono font-bold text-xs">
                                {selectedSeats.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Seat Map */}
                        <SeatMap
                          seatLayout={tripSeatData?.seatLayout}
                          selectedSeats={selectedSeats}
                          onSeatToggle={handleSeatToggle}
                          maxSelectable={6}
                          segmentFare={trip.fare}
                          loading={loadingSeats}
                        />

                        {/* Bottom Sticky Reservation Summary Strip */}
                        {selectedSeats.length > 0 && (
                          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                              <span className="text-xs font-bold text-slate-400 block uppercase">
                                Selected Reservation
                              </span>
                              <span className="text-sm font-black text-navy">
                                {selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'} (
                                {selectedSeats.join(', ')}) • Total: ₹{trip.fare * selectedSeats.length}
                              </span>
                            </div>

                            <Button
                              type="button"
                              variant="primary"
                              size="md"
                              loading={holdingSeats}
                              onClick={() => handleProceedToBooking(trip)}
                              icon={ArrowRightLeft}
                              className="font-bold w-full sm:w-auto justify-center shadow-xs"
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
          initialPassengersDraft={passengerDraft}
          onBookingSuccess={handleBookingSuccess}
          onHoldExpired={handleHoldExpired}
          onSeatConflict={handleSeatConflict}
        />
      )}

      {/* Simulated Payment Modal */}
      {showPaymentModal && pendingPaymentBooking && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPendingPaymentBooking(null);
          }}
          bookingData={pendingPaymentBooking}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
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
                <Button variant="primary" size="sm">
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
