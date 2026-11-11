import { MapPin, Route as RouteIcon, Plus } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

export default function AdminStopsRoutesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Stops &amp; Routes Master Network
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure global physical stops, GPS coordinates, routes, and ordered stop sequences.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={Plus}>
            Add Stop
          </Button>
          <Button variant="primary" size="sm" icon={RouteIcon}>
            Create Route
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Master Physical Stops" subtitle="Locations across all operating cities">
          <EmptyState
            icon={MapPin}
            title="Stops Master"
            description="Manage boarding and dropping points with precise geographic coordinates."
          />
        </Card>

        <Card title="Route Network" subtitle="Defined paths and sequential stops">
          <EmptyState
            icon={RouteIcon}
            title="Route Master"
            description="Manage reusable source-to-destination routes and their ordered stop sequences."
          />
        </Card>
      </div>
    </div>
  );
}

