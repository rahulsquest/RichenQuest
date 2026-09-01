import React, { useState, useEffect } from 'react';
import { FileText, Plus, UploadCloud, ShieldCheck, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DocumentCard } from '../../components/DocumentCard';
import { Modal } from '../../components/Modal';
import { Input, Select } from '../../components/Input';
import { FileUpload, EmptyState, LoadingState } from '../../components/FileUpload';
import Button from '../../components/Button';
import documentService from '../../services/documentService';
import { DOCUMENT_CATEGORIES } from '../../constants/entities';

export default function Documents() {
  const { student } = useAuth();
  const { addToast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [uploadForm, setUploadForm] = useState({
    documentType: 'PASSPORT',
    title: '',
    file: null
  });

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentService.getDocuments(student?.studentId);
      setDocuments(data.documents || []);
    } catch {
      addToast('Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [student]);

  const handleFileSelect = (file) => {
    setUploadForm(prev => ({
      ...prev,
      file,
      title: prev.title || file.name.replace(/\.[^/.]+$/, '')
    }));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      addToast('Please select a file to upload', 'warning');
      return;
    }

    setUploading(true);
    try {
      const res = await documentService.uploadDocument({
        studentId: student?.studentId,
        documentType: uploadForm.documentType,
        title: uploadForm.title || uploadForm.file.name,
        fileName: uploadForm.file.name,
        fileSize: `${(uploadForm.file.size / (1024 * 1024)).toFixed(2)} MB`,
        mimeType: uploadForm.file.type || 'application/pdf'
      });
      /*  Was: "queued for WorkDrive synchronization". The server now refuses
       *  with 503 when the file was not actually stored, so reaching this line
       *  means it was — but the wording still asserted a specific downstream
       *  system. Say what is known. */
      addToast(res?.message || 'Document uploaded.', 'success');
      setUploadModalOpen(false);
      setUploadForm({ documentType: 'PASSPORT', title: '', file: null });
      fetchDocuments();
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await documentService.deleteDocument(docId);
      addToast('Document deleted from vault.', 'info');
      fetchDocuments();
    } catch (err) {
      addToast(err.message || 'Delete failed', 'error');
    }
  };

  const filteredDocs = selectedCategory === 'ALL'
    ? documents
    : documents.filter(d => d.documentType === selectedCategory);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600">
            WorkDrive File Vault
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Student Document Dossier
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload and track verification of academic transcripts, SOPs, passports, and visa records.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setUploadModalOpen(true)}
          icon={Plus}
        >
          Upload Document
        </Button>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Files ({documents.length})
        </button>
        {DOCUMENT_CATEGORIES.map((cat) => {
          const count = documents.filter(d => d.documentType === cat.type).length;
          return (
            <button
              key={cat.type}
              onClick={() => setSelectedCategory(cat.type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.type
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Documents Grid */}
      {loading ? (
        <LoadingState message="Loading documents from WorkDrive vault..." />
      ) : filteredDocs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Documents Found in this Category"
          description="Upload your academic files to allow your admissions counselor to verify them."
          action={
            <Button size="sm" variant="primary" onClick={() => setUploadModalOpen(true)}>
              Upload New Document
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <DocumentCard key={doc.documentId} doc={doc} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Student Document"
        subtitle="Files are securely processed and verified by your counselor"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <Select
            label="Document Category"
            name="documentType"
            value={uploadForm.documentType}
            onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
            options={DOCUMENT_CATEGORIES.map(c => ({ value: c.type, label: c.label }))}
            required
          />

          <Input
            label="Document Title"
            name="title"
            value={uploadForm.title}
            onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
            placeholder="e.g. Official Undergraduate Transcripts"
            required
          />

          <FileUpload
            label="Select File"
            onFileSelect={handleFileSelect}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={uploading}
              icon={UploadCloud}
            >
              Upload to WorkDrive
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
