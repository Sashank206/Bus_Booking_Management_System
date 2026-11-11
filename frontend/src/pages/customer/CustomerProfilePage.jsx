import { useState } from 'react';
import { User, Mail, Phone, Lock, Save, ShieldCheck } from 'lucide-react';
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage your personal information and contact settings.</p>
      </div>

      <Card title="Personal Details" subtitle="Information associated with your bookings">
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <InputField
            label="Full Name"
            icon={User}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <InputField
            label="Email Address"
            type="email"
            icon={Mail}
            value={user?.email || ''}
            disabled
            helperText="Account email cannot be modified directly."
          />

          <InputField
            label="Phone Number"
            type="tel"
            icon={Phone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
          />

          <div className="pt-2 flex justify-end">
            <Button type="submit" variant="primary" size="md" loading={saving} icon={Save}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

