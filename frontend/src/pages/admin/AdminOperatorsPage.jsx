import { useState } from 'react';
import { Users, CheckCircle, XCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

export default function AdminOperatorsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Operator Management &amp; Approvals
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Vet transport agencies, inspect business credentials, and grant trip publishing privileges.
          </p>
        </div>
      </div>

      <Card title="Operator Approval Queue" subtitle="Pending and verified bus operators">
        <EmptyState
          icon={Users}
          title="Operator Queue Initialized"
          description="In Phase 5, all registered bus operators appear here with live actions to inspect business profiles, approve or reject onboarding applications."
        />
      </Card>
    </div>
  );
}

