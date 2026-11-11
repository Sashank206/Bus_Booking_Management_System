import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-lg">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <Compass className="w-8 h-8" />
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Route Not Found (404)
        </h1>

        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          The requested page or route endpoint does not exist. Please check your URL or navigate back to the home page.
        </p>

        <Link to="/">
          <Button variant="accent" size="md" icon={Home}>
            Back to BusGo Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

