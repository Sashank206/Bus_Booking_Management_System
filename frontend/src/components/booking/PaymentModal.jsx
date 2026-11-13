import { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Bus,
  Calendar,
  Clock,
  User,
  ArrowRight,
  Lock,
  Smartphone
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import useToast from '../../hooks/useToast';
import api from '../../services/api';

export default function PaymentModal({
  isOpen,
  onClose,
  bookingData,
  onPaymentSuccess,
  onPaymentFailure
}) {
  const toast = useToast();
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('simulated_upi');

  if (!isOpen || !bookingData) return null;

  const booking = bookingData.booking || bookingData;
  const trip = bookingData.trip || booking.tripId || {};
  const bus = trip.busId || {};
  const operator = trip.operatorId || {};
  const passengers = bookingData.passengers || booking.passengers || [];
  const bookingSeats = bookingData.bookingSeats || booking.bookingSeats || [];

  const handleSimulatePayment = async (simulationAction) => {
    if (processing) return;

    setProcessing(true);
    const idempotencyKey = `PAY_IDEM_${booking._id}_${Date.now()}`;

    try {
      const res = await api.post('/payments/simulate', {
        bookingId: booking._id,
        idempotencyKey,
        simulationAction,
        paymentMethod
      });

      if (simulationAction === 'success') {
        toast.success(res.message || 'Payment simulation successful! Your booking is confirmed.');
        if (onPaymentSuccess) {
          onPaymentSuccess(res.data);
        }
      } else {
        toast.error(res.message || 'Payment simulation failed. Held seats have been released.');
        if (onPaymentFailure) {
          onPaymentFailure(res.data);
        }
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Payment simulation encountered an error.');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="BusGo Secure Payment Simulation"
      subtitle="Complete your bus ticket payment via simulated gateway"
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        {/* Simulation Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-950">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block">Developer Assessment Environment — Simulated Gateway</span>
            <span className="text-[11px] text-amber-800 leading-relaxed block">
              No real bank, credit card, or UPI charges will occur. Choose below whether to simulate a successful payment or a gateway rejection.
            </span>
          </div>
        </div>

        {/* Booking Summary Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <Bus className="w-4 h-4 text-primary" />
              <span className="font-bold text-slate-900">{operator.companyName || 'Bus Operator'}</span>
              <span className="text-slate-400">({bus.busType || 'Standard'})</span>
            </div>
            <div className="font-mono font-bold text-slate-700">
              PNR: <span className="text-primary font-black">{booking.pnr}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-slate-600">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Journey Date</span>
              <span className="font-semibold text-slate-900">
                {formatDate(booking.journeyDate || trip.travelDate)}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Selected Seats</span>
              <span className="font-bold text-primary font-mono">
                {bookingSeats.map((s) => s.seatNumber).join(', ') || 'Allocated'}
              </span>
            </div>
          </div>

          {passengers.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Passengers ({passengers.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {passengers.map((p, idx) => (
                  <span
                    key={p._id || idx}
                    className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700 font-medium text-[11px]"
                  >
                    {p.fullName} ({p.gender}, {p.age}y)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Simulated Payment Method Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Select Payment Method
          </label>
          <div className="grid grid-cols-3 gap-2.5 text-xs">
            {[
              { id: 'simulated_upi', label: 'UPI / QR Code', icon: Smartphone, desc: 'GPay, PhonePe, Paytm' },
              { id: 'simulated_card', label: 'Debit / Credit Card', icon: CreditCard, desc: 'Visa, Master, RuPay' },
              { id: 'simulated_netbanking', label: 'Net Banking', icon: Lock, desc: 'All Indian Banks' }
            ].map((method) => {
              const Icon = method.icon;
              const isSelected = paymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary font-bold shadow-xs ring-1 ring-primary'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold block">{method.label}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{method.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fare Total Display */}
        <div className="bg-navy text-white rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-300 block font-semibold">Total Amount Due</span>
            <span className="text-[11px] text-slate-400">All convenience fees & taxes included</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-amber-400 font-mono">
              ₹{booking.totalAmount || 0}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2 pt-2">
          <Button
            type="button"
            variant="success"
            size="lg"
            className="w-full justify-center text-sm font-bold shadow-sm"
            onClick={() => handleSimulatePayment('success')}
            loading={processing}
            disabled={processing}
            icon={CheckCircle2}
          >
            {processing ? 'Processing Payment...' : 'Simulate Payment Success'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="md"
            className="w-full justify-center text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            onClick={() => handleSimulatePayment('failure')}
            loading={processing}
            disabled={processing}
            icon={XCircle}
          >
            Simulate Payment Failure & Release Hold
          </Button>
        </div>
      </div>
    </Modal>
  );
}
