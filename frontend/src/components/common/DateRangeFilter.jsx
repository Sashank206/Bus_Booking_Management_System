import { useState } from 'react';
import { Calendar, Filter, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

export default function DateRangeFilter({
  selectedRange = '30days',
  startDate = '',
  endDate = '',
  onChange,
  onRefresh,
  loading = false,
  className = ''
}) {
  const [showCustom, setShowCustom] = useState(selectedRange === 'custom');
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  const presets = [
    { id: 'today', label: 'Today' },
    { id: '7days', label: 'Last 7 Days' },
    { id: '30days', label: 'Last 30 Days' },
    { id: 'this_month', label: 'This Month' },
    { id: 'prev_month', label: 'Previous Month' },
    { id: 'custom', label: 'Custom Range' }
  ];

  const handlePresetSelect = (presetId) => {
    if (presetId === 'custom') {
      setShowCustom(true);
      if (onChange) {
        onChange({ range: 'custom', startDate: customStart, endDate: customEnd });
      }
    } else {
      setShowCustom(false);
      if (onChange) {
        onChange({ range: presetId, startDate: '', endDate: '' });
      }
    }
  };

  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (onChange) {
      onChange({ range: 'custom', startDate: customStart, endDate: customEnd });
    }
  };

  return (
    <div
      className={`bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}
    >
      {/* Preset Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-2 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          Filter:
        </div>
        {presets.map((preset) => {
          const isActive = selectedRange === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Pickers or Refresh Action */}
      <div className="flex items-center gap-2 flex-wrap">
        {showCustom && (
          <form onSubmit={handleApplyCustom} className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="pl-3 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="Start Date"
                required
              />
            </div>
            <span className="text-slate-400 text-xs">to</span>
            <div className="relative">
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="pl-3 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="End Date"
                required
              />
            </div>
            <Button type="submit" variant="primary" size="sm" className="text-xs py-1.5 px-3">
              Apply
            </Button>
          </form>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}

