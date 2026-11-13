import { useState, useEffect } from 'react';
import { Clock, ShieldCheck, User, Mail, Phone, AlertCircle, ArrowRight, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import InputField from '../forms/InputField';
import SelectField from '../forms/SelectField';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import useAuth from '../../hooks/useAuth';

export default function PassengerFormModal({
  isOpen,
  onClose,
  holdData,
  onBookingSuccess,
  onHoldExpired,
  onSeatConflict,
  initialPassengersDraft = null
}) {
  const { user } = useAuth();
  const toast = useToast();

  const [passengers, setPassengers] = useState([]);
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [timeLeft, setTimeLeft] = useState(600); // in seconds
  const [submitting, setSubmitting] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [conflictError, setConflictError] = useState(null);

  // Initialize passenger list whenever holdData changes, preserving any prior draft
  useEffect(() => {
    if (holdData && Array.isArray(holdData.heldSeats)) {
      setPassengers((prev) => {
        return holdData.heldSeats.map((seatNum, idx) => {
          const draft = initialPassengersDraft?.[idx] || prev[idx];
          return {
            seatNumber: seatNum,
            fullName: draft?.fullName || (idx === 0 && user?.name ? user.name : ''),
            age: draft?.age || '',
            gender: draft?.gender || 'male'
          };
        });
      });
      if (user?.phone) setContactPhone(user.phone);
      if (user?.email) setContactEmail(user.email);
      setConflictError(null);
    }
  }, [holdData, user, initialPassengersDraft]);

  // Live Countdown Timer
  useEffect(() => {
    if (!isOpen || !holdData?.holdExpiresAt) return;

    const calculateRemaining = () => {
      const expiry = new Date(holdData.holdExpiresAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      return diff;
    };

    setTimeLeft(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        toast.error('Your 10-minute seat hold has expired. Please select your seats again.');
        if (onHoldExpired) onHoldExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, holdData, onHoldExpired, toast]);

  if (!isOpen || !holdData) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isExpiringSoon = timeLeft < 120; // under 2 minutes

  const handlePassengerChange = (index, field, value) => {
    setPassengers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    // Clear field-level error
    if (formErrors[`p_${index}_${field}`]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[`p_${index}_${field}`];
        return copy;
      });
    }
  };

  const validate = () => {
    const errors = {};
    passengers.forEach((p, idx) => {
      if (!p.fullName || !p.fullName.trim()) {
        errors[`p_${idx}_fullName`] = 'Passenger name is required';
      }
      const ageNum = parseInt(p.age, 10);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        errors[`p_${idx}_age`] = 'Age must be between 1 and 120';
      }
      if (!['male', 'female', 'other'].includes(p.gender)) {
        errors[`p_${idx}_gender`] = 'Please select a gender';
      }
    });

    if (!contactPhone || !/^\d{10}$/.test(contactPhone.trim())) {
      errors.contactPhone = 'Valid 10-digit phone number is required';
    }

    if (!contactEmail || !/^\S+@\S+\.\S+$/.test(contactEmail.trim())) {
      errors.contactEmail = 'Valid email address is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitBooking = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (submitting) return; // Prevent double submission

    if (!validate()) {
      toast.error('Please fix the errors in the passenger form.');
      return;
    }

    setSubmitting(true);
    setConflictError(null);

    try {
      const payload = {
        tripId: holdData.tripId,
        boardingStopId: holdData.boardingStop?._id || holdData.boardingStop,
        droppingStopId: holdData.droppingStop?._id || holdData.droppingStop,
        holdToken: holdData.holdToken,
        passengers: passengers.map((p) => ({
          fullName: p.fullName.trim(),
          age: parseInt(p.age, 10),
          gender: p.gender,
          seatNumber: p.seatNumber,
          phone: contactPhone.trim(),
          email: contactEmail.trim().toLowerCase()
        }))
      };

      const res = await api.post('/bookings', payload);
      toast.success(res.message || 'Booking created successfully!');
      if (onBookingSuccess) {
        onBookingSuccess(res.data);
      }
    } catch (err) {
      const code = err.code;
      const message = err.message || 'Failed to finalize booking.';

      if (code === 'SEAT_HOLD_EXPIRED') {
        const displayMsg = 'Your seat selection has expired. Please select your seats again.';
        toast.error(displayMsg);
        setConflictError({
          code,
          message: displayMsg,
          action: 'Choose Alternative Seats'
        });
      } else if (code === 'SEAT_ALREADY_BOOKED' || code === 'SEAT_HOLD_NOT_OWNED') {
        const displayMsg = 'Sorry, this seat was just booked by another passenger. Please choose another seat.';
        toast.error(displayMsg);
        setConflictError({
          code,
          message: displayMsg,
          action: 'Select Another Seat'
        });
      } else if (code === 'BOOKING_ALREADY_PROCESSED') {
        const displayMsg = 'Your booking is already being processed. Please check My Bookings.';
        toast.warning(displayMsg);
        setConflictError({
          code,
          message: displayMsg,
          action: 'View My Bookings'
        });
      } else if (code === 'TRIP_NOT_BOOKABLE') {
        const displayMsg = 'This trip is no longer accepting bookings.';
        toast.error(displayMsg);
        setConflictError({
          code,
          message: displayMsg,
          action: 'Choose Another Trip'
        });
      } else {
        toast.error(message);
        setConflictError({
          code: code || 'CONFLICT',
          message,
          action: 'Retry Booking'
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConflictAction = () => {
    if (!conflictError) return;
    if (conflictError.code === 'BOOKING_ALREADY_PROCESSED') {
      window.location.href = '/customer/dashboard';
    } else if (
      conflictError.code === 'SEAT_HOLD_EXPIRED' ||
      conflictError.code === 'SEAT_ALREADY_BOOKED' ||
      conflictError.code === 'SEAT_HOLD_NOT_OWNED' ||
      conflictError.code === 'SEAT_HOLD_MISMATCH'
    ) {
      if (onSeatConflict) {
        onSeatConflict(passengers);
      } else if (onHoldExpired) {
        onHoldExpired(passengers);
      } else {
        onClose();
      }
    } else if (conflictError.code === 'TRIP_NOT_BOOKABLE') {
      onClose();
    } else {
      handleSubmitBooking();
    }
  };

  const handleCancelHold = async () => {
    setReleasing(true);
    try {
      await api.post('/bookings/release-hold', {
        tripId: holdData.tripId,
        seatNumbers: holdData.heldSeats,
        holdToken: holdData.holdToken
      });
      toast.info('Seat hold released.');
      onClose();
    } catch (err) {
      onClose();
    } finally {
      setReleasing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancelHold}
      title="Passenger Details & Ticket Reservation"
      subtitle="Complete passenger information to confirm your reserved seats"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmitBooking} className="space-y-6">
        {/* Countdown Timer Alert Banner */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
            isExpiringSoon
              ? 'bg-rose-50 border-rose-200 text-rose-900 animate-pulse'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isExpiringSoon ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider block">
                Exclusive Seat Hold Active: {holdData.heldSeats.join(', ')}
              </span>
              <span className="text-xs opacity-80">
                Seats reserved exclusively for you. Complete details before timer expires.
              </span>
            </div>
          </div>
          <div className="text-right pl-3">
            <span
              className={`text-xl font-mono font-black ${
                isExpiringSoon ? 'text-rose-700' : 'text-amber-800'
              }`}
            >
              {formattedTime}
            </span>
          </div>
        </div>

        {/* Journey Quick Summary */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Route</span>
            <span className="font-bold text-slate-900 truncate block">
              {holdData.boardingStop?.stopName || 'Boarding'} →{' '}
              {holdData.droppingStop?.stopName || 'Dropping'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Seats</span>
            <span className="font-bold text-slate-900">{holdData.heldSeats.join(', ')}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Fare / Seat</span>
            <span className="font-bold text-slate-900">₹{holdData.seatFare}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Total Payable</span>
            <span className="font-black text-primary text-base">₹{holdData.totalAmount}</span>
          </div>
        </div>

        {/* Conflict Error Notice */}
        {conflictError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-900">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-bold text-sm text-rose-950">{conflictError.message}</p>
              <p className="text-xs text-rose-800">
                {conflictError.code === 'SEAT_HOLD_EXPIRED' &&
                  'Your 10-minute hold window expired. You can pick new seats without retyping passenger details.'}
                {conflictError.code === 'SEAT_ALREADY_BOOKED' &&
                  'Another passenger completed booking for this seat. Please choose another seat from the map.'}
                {conflictError.code === 'BOOKING_ALREADY_PROCESSED' &&
                  'This booking request has already been registered in the system.'}
                {conflictError.code === 'TRIP_NOT_BOOKABLE' &&
                  'This trip schedule is currently inactive or completed.'}
              </p>
              {conflictError.action && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleConflictAction}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-xs transition-all"
                  >
                    {conflictError.action}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Passenger Fields */}
        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Passenger Information ({passengers.length})
          </h4>

          {passengers.map((p, idx) => (
            <div
              key={p.seatNumber}
              className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900">
                  Passenger {idx + 1}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                  Seat {p.seatNumber}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div className="sm:col-span-3">
                  <InputField
                    label="Full Name"
                    placeholder="e.g. Rahul Sharma"
                    value={p.fullName}
                    onChange={(e) => handlePassengerChange(idx, 'fullName', e.target.value)}
                    error={formErrors[`p_${idx}_fullName`]}
                    required
                  />
                </div>

                <div className="sm:col-span-1">
                  <InputField
                    label="Age"
                    type="number"
                    min="1"
                    max="120"
                    placeholder="Age"
                    value={p.age}
                    onChange={(e) => handlePassengerChange(idx, 'age', e.target.value)}
                    error={formErrors[`p_${idx}_age`]}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <SelectField
                    label="Gender"
                    value={p.gender}
                    onChange={(e) => handlePassengerChange(idx, 'gender', e.target.value)}
                    options={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' }
                    ]}
                    error={formErrors[`p_${idx}_gender`]}
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Details */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Booking Contact (E-Ticket & Updates)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Contact Phone"
              type="tel"
              icon={Phone}
              placeholder="10-digit mobile number"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              error={formErrors.contactPhone}
              required
            />
            <InputField
              label="Contact Email"
              type="email"
              icon={Mail}
              placeholder="name@example.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              error={formErrors.contactEmail}
              required
            />
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleCancelHold}
            disabled={submitting || releasing}
          >
            {releasing ? 'Releasing...' : 'Cancel & Release Seats'}
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={submitting}
            disabled={submitting || timeLeft <= 0}
            icon={ArrowRight}
          >
            Confirm & Reserve (₹{holdData.totalAmount})
          </Button>
        </div>
      </form>
    </Modal>
  );
}
