import { useState } from 'react';
import { User, Mail, Phone, Lock, Save, ShieldCheck, CheckCircle } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import InputField from '../../components/forms/InputField';
import Button from '../../components/ui/Button';

export default function CustomerProfilePage() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name, phone });
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-2xl shadow-sm">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-black text-navy tracking-tight">{user?.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
              Verified Passenger
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">{user?.email}</p>
        </div>
      </div>

      <Card title="Personal Information" subtitle="Details used for travel booking confirmations and electronic tickets">
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <InputField
            label="Full Name"
            icon={User}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <InputField
            label="Email Address (Login Identity)"
            type="email"
            icon={Mail}
            value={user?.email || ''}
            disabled
            helperText="Primary login email cannot be edited directly."
          />

          <InputField
            label="Contact Mobile Number"
            type="tel"
            icon={Phone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            helperText="Used for SMS and WhatsApp travel alerts."
          />

          <div className="pt-2 flex justify-end">
            <Button type="submit" variant="primary" size="md" loading={saving} icon={Save} className="font-bold shadow-xs">
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
