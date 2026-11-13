import { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

const SelectField = forwardRef(function SelectField(
  {
    label,
    id,
    name,
    options = [],
    error,
    helperText,
    icon: Icon,
    className = '',
    required = false,
    placeholder = 'Select an option...',
    ...props
  },
  ref
) {
  const selectId = id || name;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-1.5"
        >
          {label}
          {required && <span className="text-[#D92D3A] ml-1">*</span>}
        </label>
      )}

      <div className="relative rounded-lg sm:rounded-xl shadow-xs">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98A2B3]">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <select
          ref={ref}
          id={selectId}
          name={name}
          required={required}
          className={`block w-full rounded-lg sm:rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#D92D3A]/20 focus:border-[#D92D3A] ${
            Icon ? 'pl-10' : 'pl-3.5'
          } pr-9 py-2.5 bg-white appearance-none cursor-pointer ${
            error
              ? 'border-[#FDA29B] text-[#B42318] focus:border-[#D92D3A] focus:ring-[#D92D3A]/20 bg-[#FEF3F2]/40'
              : 'border-[#D0D5DD] text-[#202633]'
          }`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const labelText = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={val} value={val}>
                {labelText}
              </option>
            );
          })}
        </select>

        {/* Custom dropdown chevron */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#667085]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#D92D3A] font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-[#667085]">{helperText}</p>
      ) : null}
    </div>
  );
});

export default SelectField;
