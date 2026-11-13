import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth,
  size = 'md',
  className = ''
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl'
  };

  const resolvedWidth = maxWidth || sizeMap[size] || 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto print:static print:inset-auto print:overflow-visible print:z-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#171C2B]/60 backdrop-blur-xs transition-opacity print:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center print:block print:p-0 print:m-0">
        <div
          role="dialog"
          aria-modal="true"
          className={`relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all my-8 w-full ${resolvedWidth} border border-[#E4E7EC] print:static print:transform-none print:shadow-none print:border-none print:rounded-none print:m-0 print:p-0 print:w-full print:max-w-none print:overflow-visible ${className}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#F2F4F7] print:hidden">
            <div>
              {title && (
                <h3 className="text-base font-bold text-[#202633] tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && <p className="text-xs text-[#667085] mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="text-[#667085] hover:text-[#202633] p-1.5 rounded-lg hover:bg-[#F2F4F7] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 print:p-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
