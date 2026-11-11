export default function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color = 'blue',
  className = ''
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-700'
  };

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex items-start justify-between gap-4 ${className}`}
    >
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
          {title}
        </span>
        <span className="text-2xl font-extrabold text-slate-900 tracking-tight block">
          {value}
        </span>

        {(description || trend) && (
          <div className="flex items-center gap-2 mt-2 text-xs">
            {trend && (
              <span
                className={`font-semibold ${
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.label}
              </span>
            )}
            {description && <span className="text-slate-500">{description}</span>}
          </div>
        )}
      </div>

      {Icon && (
        <div className={`p-3 rounded-xl shrink-0 ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}

