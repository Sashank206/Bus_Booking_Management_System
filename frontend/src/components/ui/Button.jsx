import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-[#D92D3A] text-white hover:bg-[#B91C2C] active:bg-[#8F1420] shadow-xs focus-visible:ring-[#D92D3A]',
  accent:
    'bg-[#D92D3A] text-white font-semibold hover:bg-[#B91C2C] active:bg-[#8F1420] shadow-xs focus-visible:ring-[#D92D3A]',
  navy:
    'bg-[#171C2B] text-white hover:bg-[#232A3E] active:bg-[#0F121C] shadow-xs focus-visible:ring-[#171C2B]',
  secondary:
    'bg-[#F1F3F5] text-[#202633] hover:bg-[#E4E7EC] active:bg-[#D0D5DD] focus-visible:ring-slate-300',
  outline:
    'border border-[#D0D5DD] bg-white text-[#344054] hover:bg-[#F9FAFB] hover:border-[#98A2B3] active:bg-[#F2F4F7] focus-visible:ring-slate-300 shadow-xs',
  danger:
    'bg-[#D92D3A] text-white hover:bg-[#B91C2C] active:bg-[#8F1420] shadow-xs focus-visible:ring-rose-500',
  ghost:
    'text-[#475467] hover:bg-[#F2F4F7] hover:text-[#1D2939] active:bg-[#EAECF0] focus-visible:ring-slate-200',
  success:
    'bg-[#16865C] text-white hover:bg-[#126E4B] active:bg-[#0E563B] shadow-xs focus-visible:ring-[#16865C]'
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-md font-medium',
  sm: 'px-3 py-1.5 text-xs rounded-lg font-medium',
  md: 'px-4 py-2 text-sm rounded-lg font-semibold',
  lg: 'px-5 py-2.5 text-sm sm:text-base rounded-xl font-semibold'
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon: Icon,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
        variants[variant] || variants.primary
      } ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 mr-1.5 shrink-0" />}
          {children}
        </>
      )}
    </button>
  );
}
