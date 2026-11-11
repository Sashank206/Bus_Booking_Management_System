import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, User, Mail, Lock, Phone, UserPlus } from 'lucide-react';
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

    // Client-side quick validation
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
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-xs">
              <Bus className="w-6 h-6" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              Bus<span className="text-amber-500">Go</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Create Customer Account
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Book buses, reserve temporary seat holds, and manage your tickets.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-lg">
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
              placeholder="rajesh@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
            />

            <InputField
              label="Password"
              name="password"
              type="password"
              icon={Lock}
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              helperText="Must contain at least 6 characters"
              required
            />

            <InputField
              label="Mobile Number (Optional)"
              name="phone"
              type="tel"
              icon={Phone}
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="accent"
                size="md"
                loading={loading}
                className="w-full"
                icon={UserPlus}
              >
                Complete Registration
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-slate-900 hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}

