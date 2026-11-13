import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Bus, Mail, Lock, LogIn, ShieldCheck, UserCheck, Briefcase, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
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
            <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-white font-bold shadow-xs">
              <Bus className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tight text-navy">
              Bus<span className="text-primary">Go</span>
            </span>
          </Link>
          <h2 className="text-2xl font-black text-navy tracking-tight">
            Sign In to Your Account
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Access customer reservations, operator fleets, or system administration.
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold leading-relaxed">
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

            <div className="relative">
              <InputField
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                icon={Lock}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full font-bold shadow-xs"
                icon={LogIn}
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2.5 text-center">
              Quick-Fill Demo Credentials
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin@busgo.com', 'BusGo@Demo2026')}
                className="flex flex-col items-center p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-navy transition-all text-center cursor-pointer shadow-2xs hover:border-slate-300"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600 mb-1" />
                <span className="text-[11px] font-bold">Admin</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('rajesh@travels.com', 'BusGo@Demo2026')}
                className="flex flex-col items-center p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-navy transition-all text-center cursor-pointer shadow-2xs hover:border-slate-300"
              >
                <Briefcase className="w-4 h-4 text-primary mb-1" />
                <span className="text-[11px] font-bold">Operator</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('priya.sharma@example.com', 'BusGo@Demo2026')}
                className="flex flex-col items-center p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-navy transition-all text-center cursor-pointer shadow-2xs hover:border-slate-300"
              >
                <UserCheck className="w-4 h-4 text-emerald-600 mb-1" />
                <span className="text-[11px] font-bold">Customer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Links to Registration */}
        <div className="text-center space-y-2 text-xs text-slate-500">
          <p>
            Don't have a customer account?{' '}
            <Link to="/register" className="font-bold text-primary hover:underline">
              Create Customer Account
            </Link>
          </p>
          <p>
            Operating an Indian bus fleet?{' '}
            <Link to="/operator-register" className="font-bold text-navy hover:underline">
              Register as Fleet Operator
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
