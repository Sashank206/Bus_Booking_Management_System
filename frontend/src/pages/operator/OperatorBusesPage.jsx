import { Bus, Plus } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import useAuth from '../../hooks/useAuth';

export default function OperatorBusesPage() {
  const { isOperatorApproved } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bus Fleet Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage your buses, registration numbers, and seat layouts.</p>
        </div>

        {isOperatorApproved && (
          <Button variant="accent" size="md" icon={Plus}>
            Register New Bus
          </Button>
        )}
      </div>

      <Card>
        <EmptyState
          icon={Bus}
          title="Fleet Directory Initialized"
          description={
            isOperatorApproved
              ? 'No vehicles added to your fleet yet. Click "Register New Bus" to configure seat types and deck layouts.'
              : 'Fleet registration will unlock once your operator business account is approved by an administrator.'
          }
        />
      </Card>
    </div>
  );
}

