import React, { useState } from 'react';
import { UploadCloud, File, CheckCircle2, AlertTriangle } from 'lucide-react';

export function FileUpload({
  label,
  accept = '.pdf,.doc,.docx,.jpg,.png',
  maxSizeMB = 10,
  onFileSelect,
  disabled = false,
  className = ''
}) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">{label}</label>}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-indigo-500 bg-indigo-50/50'
            : selectedFile
            ? 'border-emerald-300 bg-emerald-50/20'
            : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          type="file"
          id="file-upload-input"
          accept={accept}
          disabled={disabled}
          onChange={handleChange}
          className="hidden"
        />
        <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center">
          {selectedFile ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
              <p className="text-xs text-slate-500 mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for secure WorkDrive upload</p>
              <span className="mt-3 inline-block text-xs text-indigo-600 font-semibold hover:underline">Choose a different file</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                <span className="text-indigo-600 hover:underline">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-slate-500 mt-1">Supported: PDF, DOCX, JPG, PNG (up to {maxSizeMB}MB)</p>
            </div>
          )}
        </label>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon = File,
  title = 'No records found',
  description = 'There are no active items in this category at the moment.',
  action = null
}) {
  return (
    <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
      <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ message = 'Loading records...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{message}</p>
    </div>
  );
}

export function ErrorState({
  title = 'Service Unavailable',
  message = "We're temporarily unable to load this information. Please try again shortly.",
  onRetry = null
}) {
  return (
    <div className="text-center py-8 px-4 rounded-xl border border-rose-200 bg-rose-50/40">
      <div className="w-10 h-10 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2 font-bold text-lg">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-bold text-rose-900">{title}</h4>
      <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function ZohoSyncBadge({ synced = false, crmId = null, label = 'Zoho CRM' }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
      <span className={`w-2 h-2 rounded-full ${synced ? 'bg-emerald-500' : 'bg-amber-400'}`} />
      <span className="font-semibold text-slate-800">{label}:</span>
      <span className="font-mono text-slate-600 text-[11px]">{synced ? (crmId || 'Connected') : 'Pending Sync'}</span>
    </div>
  );
}
