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
  onHoldExpired
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

  // Initialize passenger list whenever holdData changes
  useEffect(() => {
    if (holdData && Array.isArray(holdData.heldSeats)) {
      setPassengers(
        holdData.heldSeats.map((seatNum, idx) => ({
          seatNumber: seatNum,
          fullName: idx === 0 && user?.name ? user.name : '',
          age: '',
          gender: 'male'
        }))
      );
      if (user?.phone) setContactPhone(user.phone);
      if (user?.email) setContactEmail(user.email);
    }
  }, [holdData, user]);

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
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors in the passenger form.');
      return;
    }

    setSubmitting(true);
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
      toast.error(err.message || 'Failed to finalize booking.');
    } finally {
      setSubmitting(false);
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
      title="Passenger Details & Reservation"
      subtitle="Complete passenger information to confirm your tickets"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmitBooking} className="space-y-6">
        {/* Countdown Timer Alert Banner */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between ${
            isExpiringSoon
              ? 'bg-rose-50 border-rose-200 text-rose-900 animate-pulse'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Clock className={`w-5 h-5 ${isExpiringSoon ? 'text-rose-600' : 'text-amber-600'}`} />
            <div>
              <span className="text-xs font-bold block">
                Temporary Hold Active: {holdData.heldSeats.join(', ')}
              </span>
              <span className="text-[11px] opacity-80">
                Seats reserved exclusively for you. Complete reservation before the timer expires.
              </span>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`text-lg font-mono font-black ${
                isExpiringSoon ? 'text-rose-700' : 'text-amber-800'
              }`}
            >
              {formattedTime}
            </span>
          </div>
        </div>

        {/* Journey Quick Summary */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Route</span>
            <span className="font-bold text-slate-800">
              {holdData.boardingStop?.stopName || 'Boarding'} →{' '}
              {holdData.droppingStop?.stopName || 'Dropping'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Seats</span>
            <span className="font-bold text-slate-800">{holdData.heldSeats.join(', ')}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Fare / Seat</span>
            <span className="font-bold text-slate-800">₹{holdData.seatFare}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Total Fare</span>
            <span className="font-extrabold text-amber-600 text-sm">₹{holdData.totalAmount}</span>
          </div>
        </div>

        {/* Passenger Fields */}
        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Passenger Information ({passengers.length})
          </h4>

          {passengers.map((p, idx) => (
            <div
              key={p.seatNumber}
              className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900">
                  Passenger {idx + 1}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
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
            Ticket & Invoice Contact
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
            variant="accent"
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

