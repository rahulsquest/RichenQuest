import React from 'react';

export function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-xs">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`block w-full rounded-lg text-sm transition duration-150 ease-in-out border ${
            Icon ? 'pl-9' : 'pl-3.5'
          } pr-3.5 py-2.5 ${
            error
              ? 'border-rose-300 text-rose-900 placeholder-rose-300 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20'
              : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white'
          } disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}

export function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`block w-full rounded-lg text-sm transition duration-150 ease-in-out border px-3.5 py-2.5 bg-white ${
          error
            ? 'border-rose-300 text-rose-900 focus:ring-rose-500 focus:border-rose-500'
            : 'border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
        } disabled:bg-slate-50 disabled:text-slate-500`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt, idx) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={idx} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
      {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}

export function Textarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  rows = 4,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
        className={`block w-full rounded-lg text-sm transition duration-150 ease-in-out border px-3.5 py-2.5 bg-white ${
          error
            ? 'border-rose-300 text-rose-900 placeholder-rose-300 focus:ring-rose-500 focus:border-rose-500'
            : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
        } disabled:bg-slate-50 disabled:text-slate-500`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}

export default Input;
