import { useState, useEffect } from 'react';
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
  RotateCcw
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import StatusBadge from '../../components/ui/StatusBadge';
import TicketModal from '../../components/booking/TicketModal';

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [activeTicketData, setActiveTicketData] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [fetchingTicket, setFetchingTicket] = useState(false);

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

  // Compute live statistics
  const activeCount = bookings.filter(
    (b) => b.bookingStatus === 'confirmed' || b.bookingStatus === 'pending_payment'
  ).length;

  const confirmedCount = bookings.filter((b) => b.bookingStatus === 'confirmed').length;
  const pendingCount = bookings.filter((b) => b.bookingStatus === 'pending_payment').length;

  // Filter bookings by selected status tab
  const filteredBookings = bookings.filter((b) => {
    if (selectedStatus === 'all') return true;
    return b.bookingStatus === selectedStatus;
  });

  const handleOpenTicket = async (booking) => {
    setFetchingTicket(true);
    try {
      const res = await api.get(`/bookings/${booking._id}`);
      setActiveTicketData(res.data);
      setShowTicketModal(true);
    } catch (err) {
      toast.error(err.message || 'Failed to load ticket details.');
    } finally {
      setFetchingTicket(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-amber-400 block mb-1">
            Customer Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            View your upcoming bus journeys, check PNR statuses, view your official e-tickets, and manage reservations.
          </p>
        </div>

        <Link to="/search">
          <Button variant="accent" size="md" icon={Search}>
            Book New Trip
          </Button>
        </Link>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block uppercase">
                Active Bookings
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {activeCount}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block uppercase">
                Pending Payment
              </span>
              <span className="text-2xl font-black text-amber-600 font-mono">
                {pendingCount}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block uppercase">
                Account Status
              </span>
              <span className="text-sm font-bold text-emerald-600 uppercase">
                {user?.accountStatus || 'Active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Card */}
      <Card
        title="My Reservations & Travel History"
        subtitle="Manage and print all your verified bus tickets"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchBookings}
              icon={RotateCcw}
              disabled={loading}
            >
              Refresh
            </Button>
            <Link to="/search">
              <Button variant="secondary" size="sm" icon={Search}>
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
            { id: 'cancelled', label: 'Cancelled', count: bookings.filter((b) => b.bookingStatus === 'cancelled').length }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                selectedStatus === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedStatus === tab.id ? 'bg-slate-800 text-amber-300' : 'bg-slate-200 text-slate-700'
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
            title={selectedStatus === 'all' ? 'No bookings found' : `No ${selectedStatus} bookings`}
            description={
              selectedStatus === 'all'
                ? "You haven't reserved any bus tickets yet. Search our route network to find and book your next journey."
                : `You do not have any tickets with status '${selectedStatus}'.`
            }
            action={
              <Link to="/search">
                <Button variant="accent" size="sm" icon={Search}>
                  Book a Trip
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

              return (
                <div
                  key={b._id}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-shadow shadow-2xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
                        <Bus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            PNR:
                          </span>
                          <span className="font-mono font-black text-slate-900 text-sm">
                            {b.pnr}
                          </span>
                          <StatusBadge status={b.bookingStatus} />
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          {operator.companyName || 'Bus Operator'} • {bus.busNumber || 'Bus'} ({bus.busType || 'Standard'})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-medium">Total Fare</span>
                        <span className="text-base font-black text-slate-900 font-mono">
                          ₹{b.totalAmount}
                        </span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenTicket(b)}
                        icon={Eye}
                        disabled={fetchingTicket}
                      >
                        View Ticket
                      </Button>
                    </div>
                  </div>

                  {/* Route & Passenger Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                        Travel Itinerary
                      </span>
                      <span className="font-bold text-slate-800">
                        {boardingStop?.stopName || route.sourceStopId?.stopName || 'Origin'} →{' '}
                        {droppingStop?.stopName || route.destinationStopId?.stopName || 'Destination'}
                      </span>
                      <span className="text-slate-500 block text-[11px]">
                        {formatDate(trip.travelDate || b.bookingDate)} • {formatTime(trip.departureTime)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                        Reserved Seats
                      </span>
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono inline-block mt-0.5">
                        {seats}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                        Passengers ({b.passengers?.length || 0})
                      </span>
                      <span className="font-medium text-slate-700 truncate block">
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

      {/* Ticket Modal */}
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
    </div>
  );
}
