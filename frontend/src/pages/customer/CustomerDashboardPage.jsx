import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  Search,
  User,
  Clock,
  Calendar,
  Bus,
  CheckCircle2,
  AlertCircle,
  Eye,
  RotateCcw,
  CreditCard,
  XCircle,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Flag
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import StatusBadge from '../../components/ui/StatusBadge';
import TicketModal from '../../components/booking/TicketModal';
import PaymentModal from '../../components/booking/PaymentModal';
import CancellationModal from '../../components/booking/CancellationModal';

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals state
  const [activeTicketData, setActiveTicketData] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [fetchingTicket, setFetchingTicket] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activePaymentBooking, setActivePaymentBooking] = useState(null);

  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [activeCancellationBooking, setActiveCancellationBooking] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/my-bookings');
      setBookings(res.data?.bookings || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch customer bookings.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Timezone formatting helper for India (Asia/Kolkata)
  const formatISTDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return String(dateString);
    }
  };

  const formatISTTime = (timeString) => {
    if (!timeString) return '';
    try {
      return new Date(timeString).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return String(timeString);
    }
  };

  // Authoritative Trip Lifecycle State Evaluator
  // Matches backend tripLifecycleService logic:
  // now >= arrivalTime -> completed
  // now >= departureTime -> in_progress
  // now >= boardingWindow -> boarding
  const getEffectiveTripStatus = (trip) => {
    if (!trip) return 'unknown';
    if (trip.tripStatus === 'cancelled') return 'cancelled';
    if (trip.tripStatus === 'completed') return 'completed';

    const now = Date.now();
    const arrTime = trip.actualArrivalTime || trip.arrivalTime;
    if (arrTime && new Date(arrTime).getTime() <= now) {
      return 'completed';
    }
    const depTime = trip.departureTime;
    if (depTime && new Date(depTime).getTime() <= now) {
      return 'in_progress';
    }
    return trip.tripStatus || 'scheduled';
  };

  // Filter and sort genuinely upcoming confirmed/partially-cancelled bookings
  const upcomingBookings = useMemo(() => {
    const now = Date.now();
    return bookings
      .filter((b) => {
        // 1. Payment / Booking eligibility
        // Cannot be pending, fully cancelled, failed or expired
        if (
          b.bookingStatus === 'pending_payment' ||
          b.bookingStatus === 'cancelled' ||
          b.bookingStatus === 'failed' ||
          b.bookingStatus === 'expired'
        ) {
          return false;
        }

        // Partially cancelled bookings must have at least one active confirmed seat
        if (b.bookingStatus === 'partially_cancelled') {
          const hasActiveConfirmedSeat = b.bookingSeats?.some((bs) => bs.allocationStatus === 'confirmed');
          if (!hasActiveConfirmedSeat) return false;
        } else if (b.bookingStatus !== 'confirmed') {
          return false;
        }

        // 2. Trip lifecycle check
        const trip = b.tripId;
        if (!trip) return false;

        const effectiveStatus = getEffectiveTripStatus(trip);
        if (effectiveStatus === 'completed' || effectiveStatus === 'cancelled') {
          return false;
        }

        const depTime = trip.departureTime ? new Date(trip.departureTime).getTime() : 0;
        const arrTime = (trip.actualArrivalTime || trip.arrivalTime)
          ? new Date(trip.actualArrivalTime || trip.arrivalTime).getTime()
          : 0;

        // If scheduled arrival has already passed, it is completed and cannot be upcoming
        if (arrTime && arrTime <= now) return false;

        // Eligible if departure is in the future or currently boarding
        return depTime > now || (effectiveStatus === 'boarding' && arrTime > now);
      })
      .sort((a, b) => {
        const timeA = a.tripId?.departureTime ? new Date(a.tripId.departureTime).getTime() : Infinity;
        const timeB = b.tripId?.departureTime ? new Date(b.tripId.departureTime).getTime() : Infinity;
        return timeA - timeB;
      });
  }, [bookings]);

  // Nearest upcoming confirmed journey
  const nextUpcomingBooking = upcomingBookings.length > 0 ? upcomingBookings[0] : null;

  // Active confirmed seats for Next Journey display
  const nextJourneySeats = useMemo(() => {
    if (!nextUpcomingBooking) return '';
    const activeSeats = nextUpcomingBooking.bookingSeats
      ?.filter((s) => s.allocationStatus === 'confirmed' || !s.allocationStatus)
      ?.map((s) => s.seatNumber);
    if (activeSeats && activeSeats.length > 0) {
      return activeSeats.join(', ');
    }
    return nextUpcomingBooking.bookingSeats?.map((s) => s.seatNumber).join(', ') || '—';
  }, [nextUpcomingBooking]);

  // Compute live statistics
  const activeCount = upcomingBookings.length;
  const confirmedCount = bookings.filter((b) => b.bookingStatus === 'confirmed').length;
  const pendingCount = bookings.filter((b) => b.bookingStatus === 'pending_payment').length;
  const partialCount = bookings.filter((b) => b.bookingStatus === 'partially_cancelled').length;
  const cancelledCount = bookings.filter((b) => b.bookingStatus === 'cancelled').length;

  // Filter bookings by selected status tab
  const filteredBookings = bookings.filter((b) => {
    if (selectedStatus === 'all') return true;
    return b.bookingStatus === selectedStatus;
  });

  const handleOpenTicket = async (booking) => {
    setFetchingTicket(true);
    try {
      // Prefer /ticket endpoint which contains full policy summary and QR payload
      let res;
      try {
        res = await api.get(`/bookings/${booking._id}/ticket`);
      } catch {
        res = await api.get(`/bookings/${booking._id}`);
      }
      setActiveTicketData(res.data);
      setShowTicketModal(true);
    } catch (err) {
      toast.error(err.message || 'Failed to load ticket details.');
    } finally {
      setFetchingTicket(false);
    }
  };

  const handleOpenPayment = async (booking) => {
    try {
      const res = await api.get(`/bookings/${booking._id}`);
      setActivePaymentBooking(res.data);
      setShowPaymentModal(true);
    } catch (err) {
      toast.error(err.message || 'Failed to load booking details for payment.');
    }
  };

  const handlePaymentSuccess = (result) => {
    fetchBookings();
    if (result) {
      setActiveTicketData(result);
      setShowTicketModal(true);
    }
  };

  const handlePaymentFailure = () => {
    fetchBookings();
  };

  const handleOpenCancellation = async (booking) => {
    try {
      const res = await api.get(`/bookings/${booking._id}`);
      setActiveCancellationBooking(res.data);
      setShowCancellationModal(true);
    } catch (err) {
      toast.error(err.message || 'Failed to load booking details for cancellation.');
    }
  };

  const handleCancellationSuccess = () => {
    fetchBookings();
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-[#171C2B] text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs uppercase tracking-wider font-extrabold text-[#D92D3A] block mb-1">
            Verified Passenger Account
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
            Manage your verified bus reservations, view and print official 2-page e-tickets with security QR codes, and track refunds.
          </p>
        </div>

        <Link to="/search">
          <Button variant="primary" size="md" icon={Search} className="font-bold shadow-xs">
            Book New Journey
          </Button>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* NEXT JOURNEY OR CLEAN EMPTY STATE                                         */}
      {/* ========================================================================= */}
      {nextUpcomingBooking ? (
        <div className="bg-white rounded-2xl border-2 border-[#D92D3A]/25 p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#D92D3A] text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-xl shadow-2xs">
            Next Journey
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#D92D3A]/10 text-[#D92D3A] flex items-center justify-center font-bold shrink-0">
                <Bus className="w-7 h-7" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    PNR: <span className="font-mono font-black text-[#171C2B]">{nextUpcomingBooking.pnr}</span>
                  </span>
                  <StatusBadge status={nextUpcomingBooking.bookingStatus} />
                </div>
                <h3 className="text-base sm:text-lg font-black text-[#171C2B]">
                  {nextUpcomingBooking.tripId?.operatorId?.companyName || 'Bus Operator'}
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  {formatISTDate(nextUpcomingBooking.journeyDate || nextUpcomingBooking.tripId?.travelDate)} at{' '}
                  <span className="font-bold text-slate-900">{formatISTTime(nextUpcomingBooking.tripId?.departureTime)} IST</span>
                  {' • '}
                  <span className="font-bold text-[#D92D3A]">Seats: {nextJourneySeats}</span>
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              icon={Eye}
              onClick={() => handleOpenTicket(nextUpcomingBooking)}
              className="font-bold shadow-xs whitespace-nowrap self-stretch sm:self-auto"
            >
              View Boarding Pass
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">No upcoming journeys</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Your next adventure starts here. Search available bus schedules and reserve your seats across India.
              </p>
            </div>
          </div>
          <Link to="/search">
            <Button variant="primary" size="sm" icon={Search} className="font-bold shadow-xs whitespace-nowrap">
              Book New Journey
            </Button>
          </Link>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Upcoming Journeys"
          value={activeCount}
          subtitle="Confirmed future departures"
          icon={Ticket}
          theme="red"
        />

        <StatCard
          title="Pending Payments"
          value={pendingCount}
          subtitle="Hold active - pay to confirm"
          icon={Clock}
          theme="amber"
        />

        <StatCard
          title="Passenger Account"
          value={user?.accountStatus || 'Active'}
          subtitle="Multi-tenant RBAC verified"
          icon={ShieldCheck}
          theme="emerald"
        />
      </div>

      {/* Bookings Card Container */}
      <Card
        title="My Reservations & Travel History"
        subtitle="Manage, print, and track all your electronic bus tickets"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchBookings}
              icon={RotateCcw}
              disabled={loading}
              className="font-semibold text-slate-600 hover:text-slate-900"
            >
              Refresh
            </Button>
            <Link to="/search">
              <Button variant="secondary" size="sm" icon={Search} className="font-bold">
                Find Bus
              </Button>
            </Link>
          </div>
        }
      >
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'all', label: 'All Bookings', count: bookings.length },
            { id: 'confirmed', label: 'Confirmed', count: confirmedCount },
            { id: 'pending_payment', label: 'Pending Payment', count: pendingCount },
            { id: 'partially_cancelled', label: 'Partially Cancelled', count: partialCount },
            { id: 'cancelled', label: 'Cancelled', count: cancelledCount }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap font-bold cursor-pointer ${
                selectedStatus === tab.id
                  ? 'bg-[#171C2B] text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  selectedStatus === tab.id ? 'bg-[#D92D3A] text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-4 space-y-3">
            <LoadingSkeleton count={3} />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredBookings.length === 0 && (
          <EmptyState
            icon={Ticket}
            title={selectedStatus === 'all' ? 'No bookings found' : `No ${selectedStatus.replace('_', ' ')} bookings`}
            description={
              selectedStatus === 'all'
                ? "You haven't reserved any bus tickets yet. Search our route network to find and book your next journey."
                : `You do not have any bookings with status '${selectedStatus.replace('_', ' ')}'.`
            }
            action={
              <Link to="/search">
                <Button variant="primary" size="sm" icon={Search} className="font-bold">
                  Book a Bus Journey
                </Button>
              </Link>
            }
          />
        )}

        {/* Bookings List */}
        {!loading && filteredBookings.length > 0 && (
          <div className="space-y-4">
            {filteredBookings.map((b) => {
              const trip = b.tripId || {};
              const route = trip.routeId || {};
              const bus = trip.busId || {};
              const operator = trip.operatorId || {};
              const seats = b.bookingSeats?.map((bs) => bs.seatNumber).join(', ') || '—';
              const boardingStop = b.bookingSeats?.[0]?.boardingStopId;
              const droppingStop = b.bookingSeats?.[0]?.droppingStopId;

              const effectiveTripStatus = getEffectiveTripStatus(trip);
              const isTripCompleted = effectiveTripStatus === 'completed';
              const isTripCancelled = effectiveTripStatus === 'cancelled';
              const isTripDeparted = trip.departureTime && new Date(trip.departureTime).getTime() <= Date.now();

              // Cancellation eligibility:
              // Only confirmed or partially cancelled bookings on trips that have NOT completed and NOT departed
              const isCancellable =
                (b.bookingStatus === 'confirmed' || b.bookingStatus === 'partially_cancelled') &&
                !isTripCompleted &&
                !isTripCancelled &&
                !isTripDeparted;

              return (
                <div
                  key={b._id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#171C2B] flex items-center justify-center font-bold shrink-0">
                        <Bus className="w-5 h-5 text-[#D92D3A]" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            PNR:
                          </span>
                          <span className="font-mono font-black text-[#171C2B] text-sm">
                            {b.pnr}
                          </span>
                          <StatusBadge status={b.bookingStatus} />

                          {/* Distinct Trip Lifecycle Badge */}
                          {isTripCompleted && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              Trip Completed
                            </span>
                          )}
                          {effectiveTripStatus === 'in_progress' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                              Trip In Progress
                            </span>
                          )}
                          {isTripCancelled && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                              Trip Cancelled
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-semibold block mt-0.5">
                          {operator.companyName || 'Bus Operator'} • {bus.busNumber || 'Bus'} ({bus.busType || 'Standard'})
                          {bus.registrationNumber && ` • Reg: ${bus.registrationNumber}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-right mr-2">
                        <span className="text-xs text-slate-400 block font-medium">Total Fare</span>
                        <span className="text-lg font-black text-[#171C2B] font-mono">
                          ₹{b.totalAmount}
                        </span>
                      </div>

                      {/* Pay Now for Pending Bookings (if trip not completed) */}
                      {b.bookingStatus === 'pending_payment' && !isTripCompleted && (
                        <Button
                          variant="success"
                          size="sm"
                          icon={CreditCard}
                          onClick={() => handleOpenPayment(b)}
                          className="font-bold shadow-2xs"
                        >
                          Pay Now
                        </Button>
                      )}

                      {/* Cancel Seats ONLY for active upcoming trips (Never offered for completed trips!) */}
                      {isCancellable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={XCircle}
                          onClick={() => handleOpenCancellation(b)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 font-semibold"
                        >
                          Cancel Seats
                        </Button>
                      )}

                      {/* View Ticket is ALWAYS available (including for completed historical trips) */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenTicket(b)}
                        icon={Eye}
                        disabled={fetchingTicket}
                        className="font-bold border-slate-300"
                      >
                        View Ticket
                      </Button>
                    </div>
                  </div>

                  {/* Route & Passenger Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">
                        Travel Itinerary
                      </span>
                      <span className="font-bold text-slate-900 text-xs">
                        {boardingStop?.stopName || route.sourceStopId?.stopName || 'Origin'} →{' '}
                        {droppingStop?.stopName || route.destinationStopId?.stopName || 'Destination'}
                      </span>
                      <span className="text-slate-500 block text-[11px] font-medium mt-0.5">
                        {formatISTDate(trip.travelDate || b.bookingDate)} • {formatISTTime(trip.departureTime)} IST
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">
                        Reserved Seats
                      </span>
                      <span className="font-mono font-bold text-[#D92D3A] bg-[#D92D3A]/10 px-2.5 py-1 rounded-md inline-block mt-0.5">
                        {seats}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">
                        Passengers ({b.passengers?.length || 0})
                      </span>
                      <span className="font-semibold text-slate-700 truncate block mt-0.5">
                        {b.passengers?.map((p) => p.fullName).join(', ') || 'Passenger'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Ticket Modal (Official 2-Page E-Ticket) */}
      {showTicketModal && activeTicketData && (
        <TicketModal
          isOpen={showTicketModal}
          onClose={() => {
            setShowTicketModal(false);
            setActiveTicketData(null);
          }}
          bookingData={activeTicketData}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && activePaymentBooking && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setActivePaymentBooking(null);
          }}
          bookingData={activePaymentBooking}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
        />
      )}

      {/* Cancellation Modal */}
      {showCancellationModal && activeCancellationBooking && (
        <CancellationModal
          isOpen={showCancellationModal}
          onClose={() => {
            setShowCancellationModal(false);
            setActiveCancellationBooking(null);
          }}
          bookingData={activeCancellationBooking}
          onCancellationSuccess={handleCancellationSuccess}
        />
      )}
    </div>
  );
}
