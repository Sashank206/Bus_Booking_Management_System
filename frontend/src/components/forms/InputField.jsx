import { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

const InputField = forwardRef(function InputField(
  {
    label,
    id,
    name,
    type = 'text',
    error,
    helperText,
    icon: Icon,
    className = '',
    required = false,
    ...props
  },
  ref
) {
  const inputId = id || name;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
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

        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          required={required}
          className={`block w-full rounded-lg sm:rounded-xl border text-sm font-medium transition-all placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#D92D3A]/20 focus:border-[#D92D3A] ${
            Icon ? 'pl-10' : 'pl-3.5'
          } pr-3.5 py-2.5 ${
            error
              ? 'border-[#FDA29B] text-[#B42318] focus:border-[#D92D3A] focus:ring-[#D92D3A]/20 bg-[#FEF3F2]/40'
              : 'border-[#D0D5DD] text-[#202633] bg-white'
          }`}
          {...props}
        />
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

export default InputField;
