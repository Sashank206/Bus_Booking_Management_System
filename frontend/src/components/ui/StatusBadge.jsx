const statusConfig = {
  // Booking & Payment
  confirmed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Confirmed' },
  successful: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Successful' },
  pending_payment: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending Payment' },
  partially_cancelled: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Partially Cancelled' },
  cancelled: { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Cancelled' },
  failed: { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Failed' },
  expired: { bg: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Expired' },
  released: { bg: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Released' },
  held: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Temporary Hold' },

  // Operator & Account Status
  approved: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Approved' },
  pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending Approval' },
  rejected: { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Rejected' },
  suspended: { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Suspended' },
  active: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Active' },

  // Trip Status
  scheduled: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Scheduled' },
  boarding: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Boarding' },
  in_progress: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'In Progress' },
  completed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Completed' }
};

export default function StatusBadge({ status, className = '' }) {
  const normalized = `${status || ''}`.toLowerCase();
  const config = statusConfig[normalized] || {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    label: status || 'Unknown'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {config.label}
    </span>
  );
}

