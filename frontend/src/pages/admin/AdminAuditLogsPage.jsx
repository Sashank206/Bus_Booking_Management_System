import { FileText, ShieldCheck } from 'lucide-react';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';

export default function AdminAuditLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Audit Trail</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable audit logs of critical user registrations, operator decisions, and financial operations.
        </p>
      </div>

      <Card title="Activity Log" subtitle="Chronological system-wide events">
        <EmptyState
          icon={FileText}
          title="Audit Trail Initialized"
          description="In Phase 5, all security events, registrations, approvals, and simulated transactions are queryable here."
        />
      </Card>
    </div>
  );
}

