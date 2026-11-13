import { useState, useMemo } from 'react';
import {
  AlertCircle,
  Clock,
  CheckSquare,
  Square,
  ShieldAlert,
  ArrowRight,
  Info,
  DollarSign
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import useToast from '../../hooks/useToast';
import api from '../../services/api';

export default function CancellationModal({
  isOpen,
  onClose,
  bookingData,
  onCancellationSuccess
}) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [reason, setReason] = useState('Change of travel plans');

  if (!isOpen || !bookingData) return null;

  const booking = bookingData.booking || bookingData;
  const trip = bookingData.trip || booking.tripId || {};
  const bookingSeats = (bookingData.bookingSeats || booking.bookingSeats || []).filter(
    (bs) => bs.allocationStatus === 'confirmed'
  );
  const passengers = bookingData.passengers || booking.passengers || [];

  // Determine departure time
  const departureTime = trip.departureTime || trip.travelDate || booking.journeyDate;
  const depDate = new Date(departureTime);
  const now = new Date();
  const hoursUntilDeparture = Math.max(0, (depDate.getTime() - now.getTime()) / (1000 * 60 * 60));

  // Determine applicable tier percentage
  let chargePercent = 100;
  let isEligible = true;

  if (hoursUntilDeparture < 2) {
    isEligible = false;
    chargePercent = 100;
  } else if (hoursUntilDeparture >= 24) {
    chargePercent = 10;
  } else if (hoursUntilDeparture >= 12) {
    chargePercent = 25;
  } else {
    chargePercent = 50;
  }

  // Toggle seat selection
  const handleToggleSeat = (seatId) => {
    setSelectedSeatIds((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSeatIds.length === bookingSeats.length) {
      setSelectedSeatIds([]);
    } else {
      setSelectedSeatIds(bookingSeats.map((s) => s._id));
    }
  };

  // Live calculations
  const calculation = useMemo(() => {
    const selectedSeats = bookingSeats.filter((s) => selectedSeatIds.includes(s._id));
    const grossFare = selectedSeats.reduce((sum, s) => sum + (s.segmentFare || 0), 0);
    const deduction = Math.round((grossFare * chargePercent) / 100);
    const estimatedRefund = Math.max(0, grossFare - deduction);

    return {
      count: selectedSeats.length,
      grossFare,
      chargePercent,
      deduction,
      estimatedRefund
    };
  }, [bookingSeats, selectedSeatIds, chargePercent]);

  const handleSubmitCancellation = async (e) => {
    e.preventDefault();

    if (selectedSeatIds.length === 0) {
      toast.error('Please select at least one seat to cancel.');
      return;
    }

    if (!isEligible) {
      toast.error('Tickets cannot be cancelled within 2 hours of departure.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/bookings/${booking._id}/cancel`, {
        bookingSeatIds: selectedSeatIds,
        reason
      });

      toast.success(res.message || 'Seat cancellation processed successfully.');
      if (onCancellationSuccess) {
        onCancellationSuccess(res.data);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to process cancellation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Ticket / Release Seats"
      subtitle={`Manage cancellation and refunds for PNR: ${booking.pnr}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmitCancellation} className="space-y-5">
        {/* Departure Time & Policy Tier Banner */}
        <div
          className={`rounded-xl p-3.5 border flex items-start gap-2.5 text-xs ${
            isEligible
              ? 'bg-blue-50 border-blue-200 text-blue-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <Clock className={`w-4 h-4 shrink-0 mt-0.5 ${isEligible ? 'text-blue-600' : 'text-rose-600'}`} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold">
                {hoursUntilDeparture > 0
                  ? `Departure in ${hoursUntilDeparture.toFixed(1)} hours`
                  : 'Journey schedule elapsed'}
              </span>
              <span className="font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-white border border-slate-200">
                {isEligible ? `${100 - chargePercent}% Refund Tier` : '0% Non-Cancellable'}
              </span>
            </div>
            <p className="text-[11px] mt-1 opacity-90 leading-relaxed">
              {isEligible
                ? `Policy deduction: ${chargePercent}% cancellation fee applied per selected seat.`
                : 'Tickets cannot be cancelled within the mandatory 2-hour pre-departure cutoff window.'}
            </p>
          </div>
        </div>

        {/* Seat Selection Checklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="uppercase tracking-wider text-slate-600 font-bold">Select Seats to Cancel</span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-primary hover:text-primary-hover font-bold transition-colors"
            >
              {selectedSeatIds.length === bookingSeats.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {bookingSeats.map((bs) => {
              const isSelected = selectedSeatIds.includes(bs._id);
              const passenger = passengers.find(
                (p) => (p._id || p).toString() === (bs.passengerId?._id || bs.passengerId)?.toString()
              );

              return (
                <div
                  key={bs._id}
                  onClick={() => handleToggleSeat(bs._id)}
                  className={`p-3 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                    isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {passenger ? passenger.fullName : 'Passenger'}
                      </span>
                      <span className="text-[11px] text-slate-500 capitalize">
                        {passenger ? `${passenger.gender}, ${passenger.age} yrs` : 'Allocated Passenger'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Seat {bs.seatNumber}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      ₹{bs.segmentFare || 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cancellation Reason */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Reason for Cancellation
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="Change of travel plans">Change of travel plans</option>
            <option value="Found alternate transportation">Found alternate transportation</option>
            <option value="Personal emergency">Personal emergency</option>
            <option value="Booked wrong bus or schedule by mistake">Booked wrong bus or schedule by mistake</option>
            <option value="Other">Other reason</option>
          </select>
        </div>

        {/* Live Calculation Box */}
        <div className="bg-navy text-white rounded-xl p-4 space-y-2.5 text-xs shadow-sm">
          <div className="flex items-center justify-between text-slate-300">
            <span>Selected Seats ({calculation.count}) Gross Fare:</span>
            <span className="font-mono font-bold">₹{calculation.grossFare}</span>
          </div>

          <div className="flex items-center justify-between text-rose-300">
            <span>Policy Deduction ({calculation.chargePercent}%):</span>
            <span className="font-mono font-bold">- ₹{calculation.deduction}</span>
          </div>

          <div className="border-t border-slate-800 pt-2 flex items-center justify-between font-bold text-sm">
            <span className="text-white">Estimated Refund:</span>
            <span className="text-amber-400 font-mono text-base font-black">
              ₹{calculation.estimatedRefund}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={submitting}>
            Keep Reservation
          </Button>

          <Button
            type="submit"
            variant="danger"
            size="md"
            loading={submitting}
            disabled={submitting || selectedSeatIds.length === 0 || !isEligible}
          >
            {submitting ? 'Cancelling...' : `Confirm Cancellation (${selectedSeatIds.length} Seats)`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
