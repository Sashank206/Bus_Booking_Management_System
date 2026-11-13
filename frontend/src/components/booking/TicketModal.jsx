import { useState } from 'react';
import {
  Printer,
  Bus,
  Calendar,
  MapPin,
  CheckCircle2,
  Ticket,
  User,
  ShieldCheck,
  QrCode,
  Clock,
  AlertTriangle,
  Info,
  CreditCard,
  FileText,
  PhoneCall,
  Lock,
  ChevronRight
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';

export default function TicketModal({ isOpen, onClose, bookingData }) {
  const [activeScreenTab, setActiveScreenTab] = useState('page1'); // 'page1' | 'page2' (for on-screen preview)

  if (!isOpen || !bookingData) return null;

  // Normalize incoming payload variations (from /bookings/:id or /bookings/:id/ticket)
  const root = bookingData.data || bookingData;
  const booking = root.booking || (root.pnr ? root : {});
  const trip = root.trip || booking.tripId || {};
  const bus = trip.busId || {};
  const operator = trip.operatorId || {};
  const route = trip.routeId || {};
  const passengers = root.passengers || booking.passengers || [];
  const bookingSeats = root.bookingSeats || booking.bookingSeats || [];
  const payment = root.payment || {};
  const policySummary = root.policySummary || {
    cutoffHours: 2,
    policyName: 'Standard BusGo Cancellation & Refund Policy',
    tiers: [
      { minHoursBeforeDeparture: 24, cancellationChargePercent: 10, refundPercent: 90, description: 'More than 24 hours before departure' },
      { minHoursBeforeDeparture: 12, cancellationChargePercent: 25, refundPercent: 75, description: 'Between 12 and 24 hours before departure' },
      { minHoursBeforeDeparture: 2, cancellationChargePercent: 50, refundPercent: 50, description: 'Between 2 and 12 hours before departure' },
      { minHoursBeforeDeparture: 0, cancellationChargePercent: 100, refundPercent: 0, description: 'Within 2 hours of departure (Non-cancellable)' }
    ]
  };

  const pnr = booking.pnr || root.pnr || 'N/A';
  const status = booking.bookingStatus || root.bookingStatus || 'confirmed';
  const totalAmount = booking.totalAmount || root.totalAmount || 0;

  const boardingStop = root.boardingStop || bookingSeats[0]?.boardingStopId || route.sourceStopId;
  const droppingStop = root.droppingStop || bookingSeats[0]?.droppingStopId || route.destinationStopId;

  const handlePrint = () => {
    window.print();
  };

  // Consistent IST timezone formatting
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="BusGo Official Travel E-Ticket"
      subtitle="Valid electronic boarding pass & passenger travel document"
      maxWidth="max-w-3xl"
    >
      {/* On-Screen Screen Tab Bar & Print Trigger (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200 no-print">
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveScreenTab('page1')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeScreenTab === 'page1'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Page 1: Boarding Pass
          </button>
          <button
            type="button"
            onClick={() => setActiveScreenTab('page2')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeScreenTab === 'page2'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Page 2: Travel Rules &amp; Policies
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="navy"
            size="sm"
            onClick={handlePrint}
            icon={Printer}
            className="font-bold shadow-xs w-full sm:w-auto"
          >
            Print 2-Page E-Ticket
          </Button>
        </div>
      </div>

      {/* PRINT CONTAINER: Both pages exist here sequentially */}
      <div id="busgo-print-container" className="space-y-6 print:space-y-0">
        {/* ========================================================================= */}
        {/* PAGE 1: OFFICIAL BUSGO E-TICKET / BOARDING PASS                           */}
        {/* ========================================================================= */}
        <div
          className={`ticket-print-page-1 ${
            activeScreenTab !== 'page1' ? 'hidden print:flex' : 'flex flex-col space-y-4'
          }`}
        >
          {/* Header & PNR Badge */}
          <div className="bg-[#171C2B] text-white rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm print:rounded-xl print:p-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md bg-[#D92D3A] flex items-center justify-center text-white">
                  <Bus className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs uppercase tracking-wider font-black text-white">
                  Bus<span className="text-[#D92D3A]">Go</span> Official Boarding Pass
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white">
                {operator.companyName || 'BusGo Verified Carrier'}
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                {bus.busType || 'AC Sleeper / Seater'} • Bus No: <span className="font-bold text-white">{bus.busNumber || 'Standard Coach'}</span>
                {bus.registrationNumber && (
                  <span className="font-mono text-amber-300 ml-1">({bus.registrationNumber})</span>
                )}
              </p>
            </div>

            <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-center sm:text-right min-w-[160px] print:p-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                BOOKING PNR
              </span>
              <span className="text-2xl font-black font-mono text-amber-400 tracking-wider">
                {pnr}
              </span>
              <div className="mt-1 flex justify-center sm:justify-end">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>

          {/* Route Corridor & Boarding/Dropping Stations */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 print:p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Boarding Point */}
              <div className="space-y-1 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold uppercase tracking-wide">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Boarding Station &amp; Landmark</span>
                </div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {boardingStop?.stopName || route.sourceStopId?.stopName || 'Boarding Origin'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {boardingStop?.city || route.sourceStopId?.city || ''}
                  {boardingStop?.address ? ` • ${boardingStop.address}` : ''}
                </p>
                <div className="flex items-center gap-2 pt-1 text-xs font-bold text-slate-900">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatISTDate(trip?.travelDate || booking?.journeyDate || booking?.bookingDate)}</span>
                  <span className="text-emerald-900 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md font-mono font-bold text-[11px]">
                    {formatISTTime(trip?.departureTime)} IST
                  </span>
                </div>
              </div>

              {/* Dropping Point */}
              <div className="space-y-1 sm:pl-2">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold uppercase tracking-wide">
                  <MapPin className="w-3.5 h-3.5 text-[#D92D3A] shrink-0" />
                  <span>Dropping Station &amp; Destination</span>
                </div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {droppingStop?.stopName || route.destinationStopId?.stopName || 'Dropping Destination'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {droppingStop?.city || route.destinationStopId?.city || ''}
                  {droppingStop?.address ? ` • ${droppingStop.address}` : ''}
                </p>
                <div className="flex items-center gap-2 pt-1 text-xs font-bold text-slate-900">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatISTDate(trip?.travelDate || booking?.journeyDate || booking?.bookingDate)}</span>
                  <span className="text-slate-900 bg-slate-200 border border-slate-300 px-2 py-0.5 rounded-md font-mono font-bold text-[11px]">
                    {formatISTTime(trip?.arrivalTime)} IST
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Passenger Manifest Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-600">
              <span>Passenger Manifest ({passengers.length} Traveler{passengers.length > 1 ? 's' : ''})</span>
              <span>Confirmed Seat Allocations</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
              {passengers.map((p, idx) => {
                const seatAlloc = bookingSeats.find(
                  (bs) => (bs.passengerId?._id || bs.passengerId)?.toString() === p._id?.toString()
                );
                const seatNum = p.seatNumber || seatAlloc?.seatNumber || '—';
                const seatStatus = seatAlloc?.allocationStatus || (status === 'confirmed' ? 'confirmed' : 'held');

                return (
                  <div key={p._id || idx} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
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

                    <div className="flex items-center gap-2">
                      {seatStatus === 'cancelled' ? (
                        <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-mono font-bold text-xs">
                          Seat {seatNum} (Cancelled)
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-md bg-[#D92D3A]/10 text-[#D92D3A] border border-[#D92D3A]/20 font-mono font-black text-xs">
                          Seat {seatNum}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment & Security Verification Box */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center print:p-3">
            {/* Visual QR / Security Verification */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-white p-1.5 rounded-lg border border-slate-300 flex items-center justify-center shrink-0 shadow-2xs">
                <QrCode className="w-12 h-12 text-[#171C2B]" />
              </div>
              <div className="text-[10px]">
                <span className="font-black text-slate-900 uppercase block">Digital Security QR</span>
                <span className="text-slate-500 font-mono block">Auth: {pnr.slice(-6)}</span>
                <span className="text-emerald-700 font-bold block mt-0.5">● Verified Ticket</span>
              </div>
            </div>

            {/* Payment Mode & Reference */}
            <div className="text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Reference</span>
              <span className="font-mono font-bold text-slate-800 block text-xs">
                {payment.paymentReference || `SIM_${pnr}`}
              </span>
              <span className="text-[11px] text-slate-500 capitalize">
                Method: {payment.paymentMethod ? payment.paymentMethod.replace('simulated_', '') : 'UPI / Gateway'}
              </span>
            </div>

            {/* Total Fare */}
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Fare Paid</span>
              <span className="text-2xl font-black text-[#D92D3A] font-mono">
                ₹{totalAmount}
              </span>
              <span className="text-[10px] text-slate-500 block">Inclusive of all GST &amp; fees</span>
            </div>
          </div>

          {/* Important Boarding Notice & Helpline */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-slate-700 flex items-start gap-2.5 print:p-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-slate-900">
                Reporting Mandate: Please report at the boarding point at least 15–30 minutes before departure.
              </p>
              <p className="text-slate-600 text-[10px]">
                Carry a valid government photo ID along with this ticket. 24x7 Support Helpline: <span className="font-bold text-slate-900">+91 (011) 4000-BUSGO</span> | <span className="font-bold text-slate-900">support@busgo.com</span>
              </p>
            </div>
          </div>

          {/* Page 1 Footer Navigation Note */}
          <div className="pt-2 text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">
            Page 1 of 2 — Official Boarding Pass • Turn over for Travel Instructions &amp; Policies
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PAGE 2: TRAVEL GUIDELINES, POLICIES & PASSENGER PRIVACY NOTICE            */}
        {/* ========================================================================= */}
        <div
          className={`ticket-print-page-2 ${
            activeScreenTab !== 'page2' ? 'hidden print:flex' : 'flex flex-col space-y-4'
          }`}
        >
          {/* Page 2 Header */}
          <div className="border-b-2 border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#171C2B] flex items-center justify-center text-white">
                <FileText className="w-3.5 h-3.5 text-[#D92D3A]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Bus<span className="text-[#D92D3A]">Go</span> Travel Guidelines, Policies &amp; Privacy
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Official Terms of Carriage, Cancellation Schedule &amp; Data Safeguards
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PNR REF</span>
              <span className="font-mono font-black text-slate-900 text-xs">{pnr}</span>
            </div>
          </div>

          {/* Section A: Important Travel Instructions */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-900 font-black uppercase text-[11px] tracking-wide">
              <Clock className="w-3.5 h-3.5 text-[#D92D3A]" />
              <span>Section A — Important Travel Instructions</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-700 space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-900 shrink-0">1. Reporting Time:</span>
                <span>Passengers must arrive at the scheduled boarding location at least 15 to 30 minutes prior to departure. The carrier is not responsible for missed departures due to passenger delay.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-900 shrink-0">2. Mandatory Photo ID:</span>
                <span>All traveling passengers must carry a valid government-issued photo identity proof (Aadhaar, Passport, PAN Card, Driving License, or Voter ID).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-900 shrink-0">3. Electronic Document:</span>
                <span>This digital ticket on smartphone or a printed physical copy must be presented to the bus crew along with the passenger's photo identity proof upon boarding.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-900 shrink-0">4. Luggage Policy:</span>
                <span>Personal baggage up to 15 kg per passenger is permitted. Carriage of explosive, inflammable, hazardous, or contraband substances is strictly prohibited under Indian transport laws.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-900 shrink-0">5. Boarding Coordination:</span>
                <span>Please verify the bus crew contact details and exact pickup landmark 1 hour prior to departure via the contact numbers listed on Page 1.</span>
              </div>
            </div>
          </div>

          {/* Section B: Cancellation & Refund Rules (Configured Policy) */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-900 font-black uppercase text-[11px] tracking-wide">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Section B — Cancellation &amp; Refund Rules ({policySummary.policyName})</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-700 space-y-2">
              <p className="text-[10px] text-slate-500 font-medium">
                Cancellations are evaluated dynamically based on hours remaining before scheduled departure:
              </p>
              
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-100 font-bold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-3 py-1.5">Cancellation Time Window</th>
                      <th className="px-3 py-1.5 text-center text-rose-700">Deduction Charge</th>
                      <th className="px-3 py-1.5 text-right text-emerald-700">Refund Eligibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {policySummary.tiers.map((tier, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 font-medium text-slate-800">{tier.description}</td>
                        <td className="px-3 py-1.5 text-center font-bold text-rose-600">{tier.cancellationChargePercent}%</td>
                        <td className="px-3 py-1.5 text-right font-black text-emerald-600">{tier.refundPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 text-[10px] text-slate-600">
                <p>
                  • <span className="font-bold text-slate-900">Cutoff Window:</span> Cancellations made within {policySummary.cutoffHours} hours of scheduled departure or after departure are non-cancellable (0% refund).
                </p>
                <p>
                  • <span className="font-bold text-slate-900">Simulated Financial System:</span> In this assessment platform, payments and refunds are simulated for workflow verification and do not execute live banking / UPI transfers.
                </p>
                <p>
                  • <span className="font-bold text-slate-900">Settlement Lifecycle:</span> Refund records progress through <span className="font-semibold">Pending → Processing → Completed</span>. The refund estimate at cancellation is finalized upon settlement.
                </p>
              </div>
            </div>
          </div>

          {/* Section C: Passenger Privacy Notice */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-900 font-black uppercase text-[11px] tracking-wide">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Section C — Passenger Privacy &amp; Data Safeguards</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] text-slate-600 space-y-1">
              <p>
                1. <span className="font-bold text-slate-900">Purpose of Processing:</span> Passenger names, age, gender, and contact details are collected strictly to manage seat reservations, issue valid boarding passes, and provide trip updates.
              </p>
              <p>
                2. <span className="font-bold text-slate-900">Carrier Manifest Sharing:</span> Only necessary manifest data (passenger name, seat assignment, gender, contact number) is shared with the operating carrier for passenger verification.
              </p>
              <p>
                3. <span className="font-bold text-slate-900">Public PNR Privacy Masking:</span> Public verification endpoints apply cryptographic masking to sensitive contact details (e.g., masking customer phone numbers and emails) to prevent unauthorized inspection.
              </p>
              <p>
                4. <span className="font-bold text-slate-900">Security Hygiene:</span> Passengers should avoid sharing ticket QR codes or PNR references publicly. No authentication tokens or payment credentials are printed on this document.
              </p>
            </div>
          </div>

          {/* Section D: Support & Official Disclaimer */}
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-[10px] text-slate-600 space-y-1">
            <div className="flex items-center justify-between text-slate-900 font-black uppercase text-[10px]">
              <span>BusGo Customer Support Desk</span>
              <span>24x7 Passenger Care</span>
            </div>
            <p>
              Support Helpline: <span className="font-bold text-slate-900">+91 (011) 4000-BUSGO</span> | Email: <span className="font-bold text-slate-900">support@busgo.com</span> | Portal: <span className="font-bold text-slate-900">https://busgo.in</span>
            </p>
            <p className="text-slate-500 italic">
              Notice: This is a system-generated electronic document that does not require a physical signature. Route delays resulting from weather, road closures, or highway regulations are governed by carrier operating guidelines.
            </p>
          </div>

          {/* Page 2 Footer Navigation Note */}
          <div className="pt-2 text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">
            Page 2 of 2 — End of Official Travel Document
          </div>
        </div>
      </div>

      {/* On-screen Modal Footer Actions */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 no-print">
        <Button variant="ghost" size="md" onClick={onClose} className="font-bold">
          Close Preview
        </Button>

        <Button variant="navy" size="md" onClick={handlePrint} icon={Printer} className="font-bold">
          Print / Save as PDF
        </Button>
      </div>
    </Modal>
  );
}
