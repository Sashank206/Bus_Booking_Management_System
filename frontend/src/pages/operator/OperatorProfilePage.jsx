import { Building2, FileBadge, MapPin, User, Mail, Phone } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';

export default function OperatorProfilePage() {
  const { user, operator } = useAuth();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Company Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">Your official transport business and accreditation details.</p>
      </div>

      <Card title="Business Identity" subtitle="Information submitted during onboarding">
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Verification Status</span>
            <StatusBadge status={operator?.approvalStatus || 'pending'} />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" /> Company Name
            </span>
            <span className="font-bold text-slate-900">{operator?.companyName || '—'}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <FileBadge className="w-4 h-4 text-slate-400" /> Registration / GST No.
            </span>
            <span className="font-bold text-slate-900">{operator?.registrationNumber || '—'}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" /> Contact Representative
            </span>
            <span className="font-bold text-slate-900">{operator?.contactPerson || user?.name}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" /> Business Email
            </span>
            <span className="font-bold text-slate-900">{user?.email}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" /> Contact Phone
            </span>
            <span className="font-bold text-slate-900">{user?.phone || '—'}</span>
          </div>

          <div className="py-2">
            <span className="text-slate-500 font-medium block mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" /> Business Headquarters
            </span>
            <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-800">
              {operator?.businessAddress || 'Address not registered'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

