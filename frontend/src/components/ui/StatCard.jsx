export default function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color = 'red',
  className = ''
}) {
  const colorMap = {
    red: 'bg-[#FFF1F2] text-[#D92D3A] border-[#FECDD3]',
    navy: 'bg-[#F0F2F5] text-[#171C2B] border-[#D0D5DD]',
    emerald: 'bg-[#ECFDF3] text-[#16865C] border-[#ABEFC6]',
    amber: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]',
    purple: 'bg-[#F4F3FF] text-[#5925DC] border-[#D9D6FE]',
    blue: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
    slate: 'bg-[#F8F9FA] text-[#344054] border-[#EAECF0]'
  };

  return (
    <div
      className={`bg-white rounded-xl sm:rounded-2xl border border-[#E4E7EC] p-5 shadow-[0_1px_3px_0_rgba(16,24,40,0.05)] flex items-start justify-between gap-4 transition-all hover:border-[#D0D5DD] ${className}`}
    >
      <div className="space-y-1.5 flex-1 min-w-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#667085] block truncate">
          {title}
        </span>
        <span className="text-2xl sm:text-3xl font-extrabold text-[#202633] tracking-tight block truncate">
          {value}
        </span>

        {(description || trend) && (
          <div className="flex items-center flex-wrap gap-2 pt-1 text-xs">
            {trend && (
              <span
                className={`font-bold inline-flex items-center gap-0.5 ${
                  trend.isPositive ? 'text-[#16865C]' : 'text-[#D92D3A]'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.label}
              </span>
            )}
            {description && <span className="text-[#667085] truncate">{description}</span>}
          </div>
        )}
      </div>

      {Icon && (
        <div
          className={`p-3 rounded-xl border shrink-0 ${
            colorMap[color] || colorMap.red
          }`}
        >
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      )}
    </div>
  );
}
