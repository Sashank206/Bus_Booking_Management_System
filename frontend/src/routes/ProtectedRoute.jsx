import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({
  children,
  allowedRoles = [],
  requireApproval = false
}) {
  const { user, operator, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Verifying credentials...
        </span>
      </div>
    );
  }

  // Not logged in
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role unauthorized
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Operator approval check if specifically required by route
  if (
    requireApproval &&
    user.role === 'operator' &&
    operator?.approvalStatus !== 'approved'
  ) {
    return <Navigate to="/operator/dashboard" replace />;
  }

  return children;
}

