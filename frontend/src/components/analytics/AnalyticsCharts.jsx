import { useState } from 'react';

/**
 * Responsive SVG Line & Area Trend Chart
 */
export function TrendLineChart({
  data = [],
  xKey = '_id',
  yKey = 'totalBookings',
  title = 'Trend Over Time',
  height = 200,
  strokeColor = '#3b82f6',
  fillColor = '#93c5fd',
  valuePrefix = '',
  valueSuffix = ''
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
        No trend data available for selected period.
      </div>
    );
  }

  const values = data.map((d) => d[yKey] || 0);
  const maxValue = Math.max(...values, 10);
  const minValue = 0;

  const padding = 35;
  const chartWidth = 500;
  const chartHeight = height;

  const points = data.map((d, index) => {
    const x =
      padding + (index / Math.max(1, data.length - 1)) * (chartWidth - padding * 2);
    const val = d[yKey] || 0;
    const y =
      chartHeight - padding - (val / maxValue) * (chartHeight - padding * 2);
    return { x, y, label: d[xKey], value: val };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h4>
        {hoveredPoint && (
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
            {hoveredPoint.label}: {valuePrefix}
            {hoveredPoint.value.toLocaleString()}
            {valueSuffix}
          </span>
        )}
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto overflow-visible"
        >
          {/* Horizontal Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - padding - ratio * (chartHeight - padding * 2);
            const val = Math.round(ratio * maxValue);
            return (
              <g key={ratio}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={padding - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#94a3b8"
                >
                  {valuePrefix}
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill={fillColor} fillOpacity="0.25" />

          {/* Stroke Line */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={hoveredPoint?.label === pt.label ? 5 : 3}
              fill="#ffffff"
              stroke={strokeColor}
              strokeWidth="2"
              className="cursor-pointer transition-all hover:scale-125"
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {/* X-Axis Labels (Sampled to avoid crowding) */}
          {points
            .filter(
              (_, i) =>
                i === 0 ||
                i === points.length - 1 ||
                i === Math.floor(points.length / 2)
            )
            .map((pt, i) => (
              <text
                key={i}
                x={pt.x}
                y={chartHeight - 10}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
              >
                {pt.label}
              </text>
            ))}
        </svg>
      </div>
    </div>
  );
}

/**
 * Status Distribution Bar Chart
 */
export function StatusBarChart({
  data = [],
  title = 'Distribution',
  totalLabel = 'Total'
}) {
  const statusColors = {
    confirmed: { bg: 'bg-emerald-500', text: 'text-emerald-700', label: 'Confirmed' },
    partially_cancelled: { bg: 'bg-amber-500', text: 'text-amber-700', label: 'Partially Cancelled' },
    cancelled: { bg: 'bg-rose-500', text: 'text-rose-700', label: 'Cancelled' },
    pending_payment: { bg: 'bg-blue-500', text: 'text-blue-700', label: 'Pending Payment' },
    expired: { bg: 'bg-slate-400', text: 'text-slate-700', label: 'Expired' }
  };

  const total = data.reduce((sum, item) => sum + (item.count || 0), 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
        No records in this distribution.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h4>
        <span className="text-xs font-medium text-slate-500">
          {totalLabel}: <strong className="text-slate-800">{total}</strong>
        </span>
      </div>

      {/* Stacked Progress Bar */}
      <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
        {data.map((item) => {
          const pct = ((item.count || 0) / total) * 100;
          if (pct === 0) return null;
          const conf = statusColors[item.status] || { bg: 'bg-indigo-500' };
          return (
            <div
              key={item.status}
              style={{ width: `${pct}%` }}
              className={`${conf.bg} transition-all duration-300 relative group`}
              title={`${item.status}: ${item.count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legend & Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
        {data.map((item) => {
          const conf = statusColors[item.status] || {
            bg: 'bg-indigo-500',
            label: item.status
          };
          const pct = ((item.count || 0) / total) * 100;
          return (
            <div
              key={item.status}
              className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100"
            >
              <div className={`w-2.5 h-2.5 rounded-full ${conf.bg}`} />
              <div className="flex-1 truncate">
                <span className="font-medium text-slate-700">{conf.label}:</span>{' '}
                <span className="font-bold">{item.count}</span>{' '}
                <span className="text-slate-400">({pct.toFixed(0)}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Occupancy Circular Gauge / Percentage Display
 */
export function OccupancyGauge({
  percentage = 0,
  title = 'Occupancy Rate',
  subtitle = 'Average seat utilization'
}) {
  const cleanPct = Math.min(100, Math.max(0, percentage));
  const getColor = (pct) => {
    if (pct >= 75) return '#10b981'; // Green
    if (pct >= 40) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const color = getColor(cleanPct);
  const strokeWidth = 8;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (cleanPct / 100) * circumference;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-4">
      <div className="space-y-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h4>
        <p className="text-2xl font-bold text-slate-900">{cleanPct}%</p>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>

      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute text-sm font-bold text-slate-700">
          {cleanPct}%
        </span>
      </div>
    </div>
  );
}

