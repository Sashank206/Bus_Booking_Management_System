export default function Card({
  children,
  title,
  subtitle,
  action,
  className = '',
  bodyClassName = 'p-5 sm:p-6',
  footer,
  noPadding = false
}) {
  return (
    <div
      className={`bg-white rounded-xl sm:rounded-2xl border border-[#E4E7EC] shadow-[0_1px_3px_0_rgba(16,24,40,0.05)] overflow-hidden transition-all ${className}`}
    >
      {(title || action || subtitle) && (
        <div className="px-5 py-4 border-b border-[#F2F4F7] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            {title && (
              <h3 className="text-sm sm:text-base font-bold text-[#202633] tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-[#667085] mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className={noPadding ? '' : bodyClassName}>{children}</div>

      {footer && (
        <div className="px-5 py-3.5 bg-[#F9FAFB] border-t border-[#F2F4F7] text-xs text-[#667085]">
          {footer}
        </div>
      )}
    </div>
  );
}
