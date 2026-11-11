import { Calendar, Plus } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import useAuth from '../../hooks/useAuth';

export default function OperatorTripsPage() {
  const { isOperatorApproved } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Trip Scheduling &amp; Fares</h1>
          <p className="text-xs text-slate-500 mt-0.5">Assign buses to routes, set departure/arrival timings, and define segment base fares.</p>
        </div>

        {isOperatorApproved && (
          <Button variant="accent" size="md" icon={Plus}>
            Schedule New Trip
          </Button>
        )}
      </div>

      <Card>
        <EmptyState
          icon={Calendar}
          title="Trip Scheduler Initialized"
          description={
            isOperatorApproved
              ? 'No trips scheduled yet. Click "Schedule New Trip" to select a route and initialize the seat inventory.'
              : 'Trip scheduling will unlock after administrative approval.'
          }
        />
      </Card>
    </div>
  );
}

