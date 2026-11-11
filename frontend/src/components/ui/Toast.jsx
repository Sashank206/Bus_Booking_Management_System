import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const icons = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-500 shrink-0" />
};

const borderStyles = {
  success: 'border-emerald-200 bg-white text-slate-800',
  error: 'border-rose-200 bg-white text-slate-800',
  warning: 'border-amber-200 bg-white text-slate-800',
  info: 'border-blue-200 bg-white text-slate-800'
};

export default function Toast({ id, type = 'info', message, onClose }) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 max-w-sm w-full ${
        borderStyles[type] || borderStyles.info
      }`}
    >
      {icons[type] || icons.info}
      <div className="flex-1 text-sm font-medium leading-snug break-words">
        {message}
      </div>
      <button
        type="button"
        onClick={() => onClose(id)}
        aria-label="Dismiss toast"
        className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

