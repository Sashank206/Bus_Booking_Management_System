import { Printer, Bus, Calendar, MapPin, CheckCircle2, Ticket, User, ShieldCheck } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';

export default function TicketModal({ isOpen, onClose, bookingData }) {
  if (!isOpen || !bookingData) return null;

  const { booking, trip, passengers = [], bookingSeats = [], payment } = bookingData;

  const pnr = booking?.pnr || 'N/A';
  const status = booking?.bookingStatus || 'pending_payment';
  const bus = trip?.busId || {};
  const operator = trip?.operatorId || {};
  const route = trip?.routeId || {};

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      return new Date(timeString).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  const boardingStop = bookingSeats[0]?.boardingStopId;
  const droppingStop = bookingSeats[0]?.droppingStopId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="BusGo Official Travel E-Ticket"
      subtitle="Valid electronic ticket for boarding verification"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6 print:p-0" id="busgo-printable-ticket">
        {/* Ticket Header & PNR Badge */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bus className="w-4 h-4 text-amber-400" />
              <span className="text-xs uppercase tracking-wider font-bold text-amber-400">
                BusGo Reservation
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight">{operator.companyName || 'Bus Operator'}</h2>
            <p className="text-xs text-slate-300">
              {bus.busNumber || 'Bus'} • {bus.busType || 'Standard'} ({bus.registrationNumber || 'N/A'})
            </p>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-center sm:text-right min-w-[140px]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
              PNR NUMBER
            </span>
            <span className="text-lg font-black font-mono text-amber-400 tracking-wider">
              {pnr}
            </span>
            <div className="mt-1 flex justify-center sm:justify-end">
              <StatusBadge status={status} />
            </div>
          </div>
        </div>

        {/* Route & Timing Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Boarding Point */}
            <div className="space-y-1 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Boarding Station</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {boardingStop?.stopName || route.sourceStopId?.stopName || 'Origin Point'}
              </h3>
              <p className="text-xs text-slate-500">
                {boardingStop?.city || route.sourceStopId?.city || ''}
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs font-bold text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDate(trip?.travelDate || booking?.bookingDate)}</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                  {formatTime(trip?.departureTime)}
                </span>
              </div>
            </div>

            {/* Dropping Point */}
            <div className="space-y-1 sm:pl-2">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>Dropping Station</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {droppingStop?.stopName || route.destinationStopId?.stopName || 'Destination Point'}
              </h3>
              <p className="text-xs text-slate-500">
                {droppingStop?.city || route.destinationStopId?.city || ''}
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs font-bold text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDate(trip?.travelDate || booking?.bookingDate)}</span>
                <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-mono">
                  {formatTime(trip?.arrivalTime)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Passenger Manifest */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
            <span>Passenger Details ({passengers.length})</span>
            <span className="text-slate-400 font-normal">Allocated Seats</span>
          </h4>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {passengers.map((p, idx) => {
              const seatAlloc = bookingSeats.find(
                (bs) => (bs.passengerId?._id || bs.passengerId)?.toString() === p._id?.toString()
              );
              return (
                <div key={p._id || idx} className="p-3 bg-white flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-[11px]">
                      {idx + 1}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">{p.fullName}</span>
                      <span className="text-slate-500 text-[11px] capitalize">
                        {p.gender}, {p.age} yrs
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold">
                      Seat {p.seatNumber || seatAlloc?.seatNumber || '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fare Summary & Total */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Total Amount Paid / Due</span>
            <span className="text-[11px] text-slate-400">
              Includes all applicable taxes and reservation charges
            </span>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-slate-900 font-mono">
              ₹{booking?.totalAmount || 0}
            </span>
          </div>
        </div>

        {/* Boarding Instructions Note */}
        <div className="text-[11px] text-slate-500 bg-amber-50/50 border border-amber-200/50 rounded-xl p-3 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Please report at the boarding point at least 15 minutes prior to scheduled departure. Carry a valid government photo ID along with this e-ticket for verification.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 print:hidden">
          <Button variant="ghost" size="md" onClick={onClose}>
            Close
          </Button>

          <Button variant="secondary" size="md" onClick={handlePrint} icon={Printer}>
            Print Ticket
          </Button>
        </div>
      </div>
    </Modal>
  );
}

