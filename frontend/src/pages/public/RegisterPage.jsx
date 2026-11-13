import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, User, Mail, Lock, Phone, UserPlus, Eye, EyeOff } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import InputField from '../../components/forms/InputField';
import Button from '../../components/ui/Button';

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = {};
    if (!formData.name.trim()) validationErrors.name = 'Full name is required';
    if (!formData.email.trim()) validationErrors.email = 'Email address is required';
    if (!formData.password || formData.password.length < 6) {
      validationErrors.password = 'Password must be at least 6 characters long';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const data = await register(formData);
      toast.success(`Account registered! Welcome to BusGo, ${data.user.name}.`);
      navigate('/customer/dashboard', { replace: true });
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      }
      toast.error(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
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
            Create Customer Account
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Book buses, reserve temporary seat holds, and manage your electronic tickets.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="Full Name"
              name="name"
              type="text"
              icon={User}
              placeholder="e.g., Rajesh Kumar"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />

            <InputField
              label="Email Address"
              name="email"
              type="email"
              icon={Mail}
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
            />

            <div className="relative">
              <InputField
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                icon={Lock}
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
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

            <InputField
              label="Mobile Number (Optional)"
              name="phone"
              type="tel"
              icon={Phone}
              placeholder="10-digit mobile number"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              helperText="For booking updates via SMS & WhatsApp."
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full font-bold shadow-xs"
                icon={UserPlus}
              >
                Create Account
              </Button>
            </div>
          </form>
        </div>

        {/* Links to Login */}
        <div className="text-center text-xs text-slate-500">
          Already have a BusGo account?{' '}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
