import React from 'react';
import { getStatusTheme } from '../utils/formatters';

export function StatusBadge({ status, label, className = '' }) {
  const theme = getStatusTheme(status);
  const displayLabel = label || theme.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${theme.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${theme.badge}`} />
      {displayLabel}
    </span>
  );
}

export function ProgressBar({ currentStep = 1, totalSteps = 10, label = 'Application Progress', className = '' }) {
  const percentage = Math.min(100, Math.max(0, Math.round((currentStep / totalSteps) * 100)));

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        <span className="text-xs font-bold text-indigo-600">
          Step {currentStep} of {totalSteps} ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function DataTable({ columns = [], data = [], keyField = 'id', emptyMessage = 'No records available' }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm italic">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr className="bg-slate-50/75">
            {columns.map((col, idx) => (
              <th
                key={idx}
                scope="col"
                className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {data.map((row, rowIdx) => (
            <tr key={row[keyField] || rowIdx} className="hover:bg-slate-50/50 transition-colors">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={`px-4 py-3 text-sm text-slate-700 ${col.cellClassName || ''}`}>
                  {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
