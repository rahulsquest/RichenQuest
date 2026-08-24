/**
 * Zoho WorkDrive Service
 * Handles server-side document storage with Zoho WorkDrive API.
 * 
 * Rules:
 * 1. Manages student folder dossiers.
 * 2. Uploads and fetches files securely.
 * 3. Never returns fake file IDs if unconfigured.
 */

const zohoOAuth = require('./oauth');

class ZohoWorkDriveService {
  constructor() {
    this.apiDomain = process.env.ZOHO_WORKDRIVE_API_DOMAIN || 'https://workdrive.zoho.com/api/v1';
  }

  isConfigured() {
    return Boolean(
      process.env.ZOHO_WORKDRIVE_ROOT_FOLDER_ID &&
      zohoOAuth.isConfigured()
    );
  }

  getRootFolderId() {
    return process.env.ZOHO_WORKDRIVE_ROOT_FOLDER_ID;
  }

  /**
   * Upload file to Zoho WorkDrive folder
   * @param {string} studentFolderId - Target folder ID
   * @param {object} file - File buffer / metadata
   */
  async uploadFile(studentFolderId, file) {
    if (!this.isConfigured()) {
      return {
        status: 'UNCONFIGURED',
        message: 'WorkDrive root folder is not configured. Document metadata saved to Catalyst Data Store.'
      };
    }

    const parentId = studentFolderId || this.getRootFolderId();
    const url = `https://upload.zoho.com/workdrive-api/v1/stream/upload?parent_id=${parentId}`;

    try {
      // In production Node: Build FormData with file stream/buffer
      // If buffer is present, upload via stream
      const formData = new FormData();
      if (file.buffer) {
        const blob = new Blob([file.buffer], { type: file.mimetype || 'application/octet-stream' });
        formData.append('content', blob, file.originalname || 'document.pdf');
      }

      const res = await zohoOAuth.authenticatedFetch(url, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error(`WorkDrive upload returned status ${res.status}`);
      }

      const data = await res.json();
      const fileData = data?.data?.[0]?.attributes;

      return {
        status: 'UPLOADED',
        workDriveFileId: fileData?.resource_id,
        fileName: fileData?.name,
        permalink: fileData?.permalink
      };
    } catch (err) {
      console.error('[Zoho WorkDrive] uploadFile error:', err.message);
      return {
        status: 'UPLOAD_ERROR',
        error: 'Document upload is temporarily unavailable. Please try again.'
      };
    }
  }
}

const zohoWorkDrive = new ZohoWorkDriveService();
module.exports = zohoWorkDrive;
