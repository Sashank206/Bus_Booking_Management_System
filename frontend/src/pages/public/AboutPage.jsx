import { Bus, ShieldCheck, Zap, Users, RotateCcw, Clock, Award } from 'lucide-react';
import Card from '../../components/ui/Card';

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#D92D3A]">
          About BusGo
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-[#202633] tracking-tight">
          Redefining Intercity Travel in India
        </h1>
        <p className="text-sm sm:text-base text-[#667085] leading-relaxed">
          BusGo is a commercial-grade intercity bus ticketing and transport management platform. We connect discerning travelers with certified fleet operators through atomic reservation concurrency, dynamic segment allocation, and transparent service guarantees.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Segment-Based Routing" subtitle="Maximum Corridor Capacity">
          <p className="text-xs text-[#667085] leading-relaxed">
            Unlike legacy reservation portals that lock seats for an entire route, BusGo calculates half-open intervals <code className="bg-[#F2F4F7] text-[#D92D3A] px-1.5 py-0.5 rounded font-mono font-bold">[fromSeq, toSeq)</code>, allowing independent travelers to book non-overlapping segments on the same physical seat.
          </p>
        </Card>

        <Card title="Atomic Concurrency" subtitle="Zero Double Booking Risk">
          <p className="text-xs text-[#667085] leading-relaxed">
            Temporary seat holds are acquired atomically with 10-minute expirations. If a payment is interrupted or a passenger abandons checkout, held segments are released instantly without blocking genuine passengers.
          </p>
        </Card>

        <Card title="Role Isolation" subtitle="Customer, Operator & Governance">
          <p className="text-xs text-[#667085] leading-relaxed">
            Strict multi-tenant security guarantees that operators manage only their approved fleet, passengers access only their verified tickets, and platform administrators oversee safety, approvals, and audits.
          </p>
        </Card>
      </div>

      {/* Cancellation Policy Reference */}
      <div className="bg-white rounded-2xl border border-[#E4E7EC] p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-[#D92D3A]">
          <RotateCcw className="w-5 h-5" />
          <h3 className="text-base font-bold text-[#202633]">Platform Cancellation &amp; Refund Policy</h3>
        </div>
        <p className="text-xs text-[#667085] leading-relaxed">
          BusGo maintains transparent cancellation charges based strictly on departure window thresholds:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#E4E7EC]">
            <span className="font-bold text-[#202633] block">More than 24h prior</span>
            <span className="text-emerald-700 font-bold">90% Refund</span>
            <span className="text-[10px] text-[#667085] block">10% cancellation charge</span>
          </div>
          <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#E4E7EC]">
            <span className="font-bold text-[#202633] block">12h to 24h prior</span>
            <span className="text-blue-700 font-bold">75% Refund</span>
            <span className="text-[10px] text-[#667085] block">25% cancellation charge</span>
          </div>
          <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#E4E7EC]">
            <span className="font-bold text-[#202633] block">2h to 12h prior</span>
            <span className="text-amber-700 font-bold">50% Refund</span>
            <span className="text-[10px] text-[#667085] block">50% cancellation charge</span>
          </div>
          <div className="p-3 bg-[#FFF1F2] rounded-xl border border-[#FECDD3]">
            <span className="font-bold text-[#D92D3A] block">Within 2h of departure</span>
            <span className="text-[#D92D3A] font-bold">No Refund</span>
            <span className="text-[10px] text-[#667085] block">Departure cutoff passed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
