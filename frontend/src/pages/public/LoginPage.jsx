import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Bus, Mail, Lock, LogIn, ShieldCheck, UserCheck, Briefcase } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import InputField from '../../components/forms/InputField';
import Button from '../../components/ui/Button';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectPath = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email address and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await login(email, password);
      toast.success(`Welcome back, ${data.user.name}!`);

      const role = data.user.role;
      const defaultPath =
        role === 'admin'
          ? '/admin/dashboard'
          : role === 'operator'
          ? '/operator/dashboard'
          : '/customer/dashboard';

      let targetPath = defaultPath;
      if (redirectPath) {
        const isAdminRoute = redirectPath.startsWith('/admin');
        const isOperatorRoute = redirectPath.startsWith('/operator');
        const isCustomerRoute = redirectPath.startsWith('/customer');

        if (isAdminRoute && role === 'admin') {
          targetPath = redirectPath;
        } else if (isOperatorRoute && (role === 'operator' || role === 'admin')) {
          targetPath = redirectPath;
        } else if (isCustomerRoute && (role === 'customer' || role === 'admin')) {
          targetPath = redirectPath;
        }
      }

      navigate(targetPath, { replace: true });
    } catch (err) {
      const msg = err.message || 'Login failed. Please verify credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Helper for quick demo filling
  const fillCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-xs">
              <Bus className="w-6 h-6" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              Bus<span className="text-amber-500">Go</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Sign In to Your Account
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Access customer reservations, operator fleets, or system administration.
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-lg">
          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="Email Address"
              name="email"
              type="email"
              icon={Mail}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <InputField
              label="Password"
              name="password"
              type="password"
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full"
                icon={LogIn}
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5 text-center">
              Quick-Fill Test Accounts (Demo)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin@busgo.com', 'AdminPass123!')}
                className="flex flex-col items-center p-2 rounded-lg border border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-purple-900 transition-colors text-center cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600 mb-1" />
                <span className="text-[11px] font-bold">Admin</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('operator@busgo.com', 'OperatorPass123!')}
                className="flex flex-col items-center p-2 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-900 transition-colors text-center cursor-pointer"
              >
                <Briefcase className="w-4 h-4 text-amber-600 mb-1" />
                <span className="text-[11px] font-bold">Operator</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('customer@busgo.com', 'CustomerPass123!')}
                className="flex flex-col items-center p-2 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-900 transition-colors text-center cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-blue-600 mb-1" />
                <span className="text-[11px] font-bold">Customer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Links to Registration */}
        <div className="text-center space-y-2 text-xs text-slate-500">
          <p>
            Don't have a customer account?{' '}
            <Link to="/register" className="font-semibold text-slate-900 hover:underline">
              Create Customer Account
            </Link>
          </p>
          <p>
            Operating a bus service?{' '}
            <Link to="/operator-register" className="font-semibold text-amber-600 hover:underline">
              Apply as Bus Operator
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

