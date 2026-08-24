import React from 'react';

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
  hover = false,
  padding = 'p-6',
  ...props
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 shadow-xs ${
        hover ? 'transition-all duration-200 hover:shadow-md hover:border-slate-300' : ''
      } ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            {title && <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={padding}>{children}</div>
    </div>
  );
}

export default Card;
