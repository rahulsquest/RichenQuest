import React from 'react';
import { FileText, Download, Trash2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '../utils/formatters';

export function DocumentCard({ doc, onDelete }) {
  if (!doc) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <StatusBadge status={doc.reviewStatus} />
        </div>

        <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">{doc.title}</h4>
        <p className="text-xs text-slate-500 font-mono mt-0.5">{doc.fileName}</p>

        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
          <span>{doc.fileSize}</span>
          <span>•</span>
          <span>{formatDate(doc.uploadedAt)}</span>
        </div>

        {doc.reviewerNotes && (
          <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-700 block text-[11px]">Counselor Review:</span>
            {doc.reviewerNotes}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] font-mono text-slate-400">
          WorkDrive: {doc.zohoWorkDriveFileId?.startsWith('ZWD') ? 'Synced' : 'Pending'}
        </span>
        <div className="flex items-center gap-1">
          {onDelete && (
            <button
              onClick={() => onDelete(doc.documentId)}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete Document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentCard;
