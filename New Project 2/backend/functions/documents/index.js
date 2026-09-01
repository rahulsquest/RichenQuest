/**
 * Zoho Catalyst Function: Documents
 * Handles student document uploads, Zoho WorkDrive integration boundary, and counselor review statuses.
 */

const CatalystDataStore = require('../shared/dataStore');
const { sendSuccess, sendError } = require('../shared/response');
const ZohoClient = require('../shared/zohoClient');

const documentsTable = CatalystDataStore.getTable('Documents');
const notificationsTable = CatalystDataStore.getTable('Notifications');

const DOCUMENT_CATEGORIES = [
  { type: 'PASSPORT', label: 'International Passport', required: true, description: 'Clear scan of bio page (must have 6+ months validity)' },
  { type: 'TRANSCRIPT', label: 'Academic Transcripts', required: true, description: 'Official semester/yearly grade sheets with university seal' },
  { type: 'DEGREE_CERTIFICATE', label: 'Degree Certificate', required: true, description: 'Graduation degree or provisional certificate' },
  { type: 'SOP', label: 'Statement of Purpose (SOP)', required: true, description: 'Target program essay detailing motivations and career goals' },
  { type: 'LOR', label: 'Letters of Recommendation (LOR)', required: true, description: 'Academic or professional recommendations (2 required)' },
  { type: 'ENGLISH_TEST', label: 'English Proficiency Scorecard', required: true, description: 'IELTS Academic, TOEFL iBT, or PTE scorecard' },
  { type: 'CV_RESUME', label: 'Curriculum Vitae / Resume', required: true, description: 'Updated academic & professional CV' },
  { type: 'OFFER_LETTER', label: 'University Offer Letters', required: false, description: 'Conditional / Unconditional acceptance letters from universities' },
  { type: 'FINANCIAL_DOC', label: 'Financial & Bank Solvency', required: false, description: 'Bank statements, loan sanction letters, or sponsorship affidavits' },
  { type: 'VISA', label: 'Visa & Biometrics Documents', required: false, description: 'CAS statement, visa application form, and TB test certificate' }
];

async function handleDocuments(req, res) {
  const method = req.method;
  const documentId = req.params?.id;

  /*  GET /api/documents — scoped to the caller's session only.
   *
   *  Confirmed by testing before this fix: requireStudent checks path
   *  segments and body fields, never req.query, and studentId here came
   *  straight from the query string — GET /api/documents?studentId=<any
   *  other student> returned 200 with that student's real documents, and
   *  GET /api/documents with no query at all returned EVERY student's
   *  documents unfiltered. A caller-supplied studentId is never honoured
   *  now, matching how every other route in this codebase derives identity
   *  from the session, not the request. */
  if (method === 'GET') {
    const studentId = req.student?.student?.studentId;
    const docs = studentId ? documentsTable.find(d => d.studentId === studentId) : [];

    return sendSuccess(res, {
      documents: docs,
      categories: DOCUMENT_CATEGORIES,
      workDriveSync: ZohoClient.getIntegrationStatus().zohoWorkDrive
    }, 'Documents retrieved successfully.');
  }

  // POST /api/documents (Upload new document metadata / file bridge)
  if (method === 'POST') {
    const {
      studentId,
      documentType,
      title,
      fileName,
      fileSize = '1.5 MB',
      mimeType = 'application/pdf',
      fileBase64
    } = req.body || {};

    if (!studentId || !documentType || !title || !fileName) {
      return sendError(res, 'VALIDATION_ERROR', 'Student ID, document type, title, and file name are required.', 400);
    }

    const newDocId = `DOC_RQ_${Date.now().toString().slice(-6)}`;

    /*  A malformed base64 body used to be swallowed with console.warn, leaving
     *  fileBuffer null — and the flow carried on to report the document
     *  "uploaded successfully" when the student's file never existed. Reject
     *  it so the student can send the file again. */
    let fileBuffer = null;
    if (fileBase64) {
      try {
        fileBuffer = Buffer.from(fileBase64.split(',')[1] || fileBase64, 'base64');
      } catch (e) {
        console.warn('Could not parse fileBase64:', e.message);
      }
      if (!fileBuffer || fileBuffer.length === 0) {
        return sendError(res, 'VALIDATION_ERROR',
          'That file could not be read. Please try selecting and uploading it again.', 400);
      }
    }

    // Upload to Zoho WorkDrive
    const workDriveResult = await ZohoClient.uploadWorkDriveFile(null, {
      originalname: fileName,
      mimetype: mimeType,
      buffer: fileBuffer
    });

    /*  SILENT-LOSS GUARD — the most damaging instance of it in this codebase.
     *
     *  When WorkDrive is UNCONFIGURED or the upload errors, the bytes are not
     *  stored anywhere. The old code still inserted a Documents row marked
     *  UNDER_REVIEW / "Awaiting counselor verification", notified the student,
     *  and answered "Document uploaded successfully and queued for counselor
     *  review." A student could submit a passport or a transcript, be told it
     *  was received, and have nothing exist — while a counsellor saw a review
     *  item with no file behind it. Admission and visa deadlines turn that
     *  into a missed intake.
     *
     *  If the student sent bytes and we could not store them, that is a
     *  failure and is reported as one: no row, no notification, no false queue
     *  entry. Metadata-only calls (no fileBase64) are a separate, legitimate
     *  bridge and still pass through. */
    const fileStored = Boolean(workDriveResult?.workDriveFileId);
    if (fileBuffer && !fileStored) {
      console.error('[documents] FILE NOT STORED — student upload dropped:', JSON.stringify({
        studentId,
        documentType,
        fileName,
        workDriveStatus: workDriveResult?.status || 'UNKNOWN',
        at: new Date().toISOString()
      }));
      return sendError(res, 'STORAGE_UNAVAILABLE',
        'We could not store your document right now, so it has not been submitted. Please try again shortly, or email it to support@richenquest.com.',
        503);
    }

    const newDoc = documentsTable.insert({
      documentId: newDocId,
      studentId,
      documentType,
      title,
      fileName,
      fileSize,
      mimeType,
      uploadedAt: new Date().toISOString(),
      reviewStatus: 'UNDER_REVIEW',
      reviewerNotes: 'Submitted by student. Awaiting counselor verification.',
      zohoWorkDriveFileId: workDriveResult?.workDriveFileId || null
    });

    // Notify student
    notificationsTable.insert({
      notificationId: `NTF_${Date.now()}`,
      studentId,
      type: 'DOCUMENT_UPLOADED',
      title: 'Document Uploaded',
      message: `"${title}" has been submitted for counselor review.`,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: '/documents'
    });

    // Log Flow Event
    await ZohoClient.emitFlowEvent('DOCUMENT_UPLOADED', {
      documentId: newDocId,
      studentId,
      documentType,
      title,
      fileName,
      workDriveFileId: workDriveResult?.workDriveFileId || null
    });

    return sendSuccess(res, {
      document: newDoc,
      workDriveStatus: workDriveResult
    }, 'Document uploaded successfully and queued for counselor review.', 201);
  }

  // DELETE /api/documents/:id
  if (method === 'DELETE') {
    const existing = documentsTable.findOne(d => d.documentId === documentId);
    if (!existing) {
      return sendError(res, 'NOT_FOUND', 'Document not found.', 404);
    }

    documentsTable.delete(d => d.documentId === documentId);

    return sendSuccess(res, { documentId, deleted: true }, 'Document removed successfully.');
  }

  return sendError(res, 'METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
}

module.exports = handleDocuments;
