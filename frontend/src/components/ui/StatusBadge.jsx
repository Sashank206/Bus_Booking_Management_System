const statusConfig = {
  // Booking & Payment
  confirmed: { bg: 'bg-[#ECFDF3] text-[#16865C] border-[#ABEFC6]', dot: 'bg-[#16865C]', label: 'Confirmed' },
  successful: { bg: 'bg-[#ECFDF3] text-[#16865C] border-[#ABEFC6]', dot: 'bg-[#16865C]', label: 'Successful' },
  pending_payment: { bg: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]', dot: 'bg-[#B54708]', label: 'Payment Pending' },
  partially_cancelled: { bg: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]', dot: 'bg-[#175CD3]', label: 'Partially Cancelled' },
  cancelled: { bg: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]', dot: 'bg-[#B42318]', label: 'Cancelled' },
  failed: { bg: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]', dot: 'bg-[#B42318]', label: 'Failed' },
  expired: { bg: 'bg-[#F8F9FA] text-[#475467] border-[#EAECF0]', dot: 'bg-[#98A2B3]', label: 'Expired' },
  released: { bg: 'bg-[#F8F9FA] text-[#475467] border-[#EAECF0]', dot: 'bg-[#98A2B3]', label: 'Released' },
  held: { bg: 'bg-[#FFF6ED] text-[#C4320A] border-[#FEE4E2]', dot: 'bg-[#C4320A]', label: 'Hold Active' },

  // Operator & Account Status
  approved: { bg: 'bg-[#ECFDF3] text-[#16865C] border-[#ABEFC6]', dot: 'bg-[#16865C]', label: 'Approved' },
  pending: { bg: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]', dot: 'bg-[#B54708]', label: 'Pending Review' },
  rejected: { bg: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]', dot: 'bg-[#B42318]', label: 'Rejected' },
  suspended: { bg: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]', dot: 'bg-[#B42318]', label: 'Suspended' },
  active: { bg: 'bg-[#ECFDF3] text-[#16865C] border-[#ABEFC6]', dot: 'bg-[#16865C]', label: 'Active' },

  // Trip Lifecycle Status
  scheduled: { bg: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]', dot: 'bg-[#175CD3]', label: 'Scheduled' },
  boarding: { bg: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]', dot: 'bg-[#B54708]', label: 'Boarding' },
  in_progress: { bg: 'bg-[#F4F3FF] text-[#5925DC] border-[#D9D6FE]', dot: 'bg-[#5925DC]', label: 'In Progress' },
  completed: { bg: 'bg-[#ECFDF3] text-[#16865C] border-[#ABEFC6]', dot: 'bg-[#16865C]', label: 'Completed' }
};

export default function StatusBadge({ status, className = '' }) {
  const normalized = `${status || ''}`.toLowerCase().trim();
  const config = statusConfig[normalized] || {
    bg: 'bg-[#F8F9FA] text-[#475467] border-[#EAECF0]',
    dot: 'bg-[#98A2B3]',
    label: status ? status.replace(/_/g, ' ') : 'Unknown'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold border ${config.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} shrink-0`}></span>
      <span className="capitalize">{config.label}</span>
    </span>
  );
}
