import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import Button from '../../components/ui/Button';

export default function UnauthorizedPage() {
  const { user } = useAuth();

  const getHomePath = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'operator') return '/operator/dashboard';
    return '/customer/dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-lg">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
          Access Restricted (403)
        </h1>

        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          You do not have administrative permission to view this resource. Your current authenticated role is <strong className="text-slate-900 font-bold uppercase">{user?.role || 'Guest'}</strong>.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={getHomePath()}>
            <Button variant="primary" size="md" className="w-full sm:w-auto" icon={Home}>
              Go to My Portal
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" size="md" className="w-full sm:w-auto" icon={ArrowLeft}>
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
