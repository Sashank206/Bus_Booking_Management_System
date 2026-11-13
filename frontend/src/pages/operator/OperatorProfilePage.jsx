import { Building2, FileBadge, MapPin, User, Mail, Phone, ShieldCheck } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';

export default function OperatorProfilePage() {
  const { user, operator } = useAuth();

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header Banner */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-navy text-white flex items-center justify-center font-black text-2xl shadow-sm">
          {(operator?.companyName || user?.name || 'O').charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-black text-navy tracking-tight">{operator?.companyName || user?.name}</h1>
            <StatusBadge status={operator?.approvalStatus || 'pending'} />
          </div>
          <p className="text-xs text-slate-500 font-medium">Official Fleet Partner Profile • Reg: {operator?.registrationNumber || 'Pending'}</p>
        </div>
      </div>

      <Card title="Transport Operator Accreditation" subtitle="Information submitted during onboarding &amp; licensing verification">
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Platform Accreditation</span>
            <StatusBadge status={operator?.approvalStatus || 'pending'} />
          </div>

          <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Registered Company Name
            </span>
            <span className="font-bold text-navy text-sm">{operator?.companyName || '—'}</span>
          </div>

          <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <FileBadge className="w-4 h-4 text-primary" /> Corporate Registration / GST No.
            </span>
            <span className="font-mono font-bold text-navy bg-slate-100 px-2.5 py-1 rounded-md">{operator?.registrationNumber || '—'}</span>
          </div>

          <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Authorized Signatory
            </span>
            <span className="font-bold text-navy">{operator?.contactPerson || user?.name}</span>
          </div>

          <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> Operator Business Email
            </span>
            <span className="font-bold text-navy font-mono">{user?.email}</span>
          </div>

          <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" /> Operations Phone
            </span>
            <span className="font-bold text-navy font-mono">{user?.phone || '—'}</span>
          </div>

          <div className="py-2.5">
            <span className="text-slate-500 font-medium block mb-1.5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Registered Business Headquarters
            </span>
            <p className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-800 font-medium leading-relaxed">
              {operator?.businessAddress || 'Address not registered'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
