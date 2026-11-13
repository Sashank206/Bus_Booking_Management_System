import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There is currently no data matching your criteria.',
  action,
  className = ''
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-[#F8F9FA] rounded-2xl border border-dashed border-[#D0D5DD] ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-white border border-[#E4E7EC] flex items-center justify-center text-[#98A2B3] mb-3.5 shadow-xs">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm sm:text-base font-bold text-[#202633] mb-1">{title}</h4>
      <p className="text-xs sm:text-sm text-[#667085] max-w-sm mb-4 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
