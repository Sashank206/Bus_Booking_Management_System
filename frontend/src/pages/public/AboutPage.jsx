import Card from '../../components/ui/Card';
import { Bus, ShieldCheck, Zap, Users } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          About BusGo
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          BusGo is a next-generation bus booking management system engineered as a modular monolith. It redefines interstate passenger transport through mathematical segment inventory, atomic hold concurrency guards, and role-based operational portals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Segment-Based Routing" subtitle="Mathematical interval allocation">
          <p className="text-xs text-slate-600 leading-relaxed">
            Unlike legacy reservation systems that lock an entire bus seat for the entire journey, BusGo models journey stops as half-open intervals <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">[from, to)</code>, maximizing seat utilization across boarding stations.
          </p>
        </Card>

        <Card title="Atomic Concurrency" subtitle="Guarded temporary holds">
          <p className="text-xs text-slate-600 leading-relaxed">
            Eliminates double bookings through atomic conditional updates directly against MongoDB SeatInventory records. High-concurrency seat requests either succeed cleanly or fail instantly with rollbacks.
          </p>
        </Card>

        <Card title="Role Isolation" subtitle="Customer, Operator & Admin">
          <p className="text-xs text-slate-600 leading-relaxed">
            Features three distinct portals with strict server-enforced role checks and operator resource ownership barriers, preventing unauthorized cross-tenant data access.
          </p>
        </Card>
      </div>
    </div>
  );
}

