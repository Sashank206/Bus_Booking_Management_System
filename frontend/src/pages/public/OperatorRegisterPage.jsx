import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bus,
  Building2,
  Mail,
  Lock,
  Phone,
  FileBadge,
  MapPin,
  User,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import InputField from '../../components/forms/InputField';
import Button from '../../components/ui/Button';

export default function OperatorRegisterPage() {
  const { registerOperator } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    companyName: '',
    registrationNumber: '',
    businessAddress: '',
    contactPerson: ''
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
    if (!formData.name.trim()) validationErrors.name = 'Contact name is required';
    if (!formData.companyName.trim()) validationErrors.companyName = 'Company name is required';
    if (!formData.email.trim()) validationErrors.email = 'Business email is required';
    if (!formData.password || formData.password.length < 6) {
      validationErrors.password = 'Password must be at least 6 characters long';
    }
    if (!formData.phone.trim()) validationErrors.phone = 'Phone number is required';
    if (!formData.registrationNumber.trim()) validationErrors.registrationNumber = 'Registration number is required';
    if (!formData.businessAddress.trim()) validationErrors.businessAddress = 'Business address is required';

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const data = await registerOperator(formData);
      toast.success(
        'Operator onboarding request submitted. Your profile is pending Administrator review.'
      );
      navigate('/operator/dashboard', { replace: true });
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      }
      toast.error(err.message || 'Operator registration failed. Please review fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-6">
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
            Bus Operator Partner Registration
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Publish bus schedules, configure seating layouts, and manage bookings across Indian routes.
          </p>
        </div>

        {/* Notice Card */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="font-bold">Administrative Review Required:</strong> All operator applications undergo compliance verification by platform administrators before trips can be published for passenger booking.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Company / Fleet Name"
                name="companyName"
                type="text"
                icon={Building2}
                placeholder="e.g., Royal Travels Pvt Ltd"
                value={formData.companyName}
                onChange={handleChange}
                error={errors.companyName}
                required
              />

              <InputField
                label="Registration / GST No."
                name="registrationNumber"
                type="text"
                icon={FileBadge}
                placeholder="e.g., 07AAAAA0000A1Z5"
                value={formData.registrationNumber}
                onChange={handleChange}
                error={errors.registrationNumber}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Primary Contact Person"
                name="name"
                type="text"
                icon={User}
                placeholder="e.g., Vikram Sharma"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                required
              />

              <InputField
                label="Contact Phone"
                name="phone"
                type="tel"
                icon={Phone}
                placeholder="+91 98765 00000"
                value={formData.phone}
                onChange={handleChange}
                error={errors.phone}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Business Email"
                name="email"
                type="email"
                icon={Mail}
                placeholder="contact@royaltravels.com"
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
            </div>

            <InputField
              label="Headquarters Business Address"
              name="businessAddress"
              type="text"
              icon={MapPin}
              placeholder="e.g., Suite 402, Transport Nagar, New Delhi"
              value={formData.businessAddress}
              onChange={handleChange}
              error={errors.businessAddress}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full font-bold shadow-xs"
                icon={Building2}
              >
                Submit Operator Application
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500">
          Already registered as an operator?{' '}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
