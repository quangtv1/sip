/**
 * Dossier state management — upload, validate, save, fetch.
 * Uses local state; React Query cache layer can be added later.
 */
import { useState, useCallback } from 'react';
import apiClient from '../config/api-client.js';

// Initial upload progress state
const PROGRESS_IDLE = { step: null, progress: 0, detail: null, summary: null, error: null, done: false };

export function useDossier() {
  const [dossier, setDossier] = useState(null);   // full dossier response
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(PROGRESS_IDLE);

  function resetUploadProgress() { setUploadProgress(PROGRESS_IDLE); }

  async function _runUpload(postFn) {
    setLoading(true);
    setError(null);
    setUploadProgress({ step: 'upload', progress: 0, detail: null, summary: null, error: null, done: false });
    try {
      const { data } = await postFn((percent) => {
        if (percent < 100) {
          setUploadProgress({ step: 'upload', progress: Math.round(percent * 0.6), detail: `Đang tải lên... ${Math.round(percent)}%`, summary: null, error: null, done: false });
        } else {
          // Network transfer done — server is now parsing/validating
          setUploadProgress({ step: 'parse', progress: 70, detail: 'Đang phân tích và kiểm tra...', summary: null, error: null, done: false });
        }
      });
      setDossier(data.data);
      setUploadProgress({
        step: 'complete', progress: 100, detail: null,
        summary: {
          totalRows: (data.data.vanBanRows || []).length,
          errorCount: data.data.validation?.errorCount ?? 0,
          pdfCount: (data.data.pdfFiles || []).length,
        },
        error: null, done: true,
      });
      return data.data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      setError(msg);
      setUploadProgress({ step: 'error', progress: 0, detail: null, summary: null, error: msg, done: true });
      throw err;
    } finally {
      setLoading(false);
    }
  }

  const uploadZip = useCallback(async (file) => {
    return _runUpload((onProgress) => {
      const form = new FormData();
      form.append('dossierZip', file);
      return apiClient.post('/upload/zip', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => onProgress(e.total ? (e.loaded / e.total) * 100 : 50),
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadFolder = useCallback(async (files, paths) => {
    return _runUpload((onProgress) => {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      paths.forEach((p) => form.append('paths', p));
      return apiClient.post('/upload/folder', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => onProgress(e.total ? (e.loaded / e.total) * 100 : 50),
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = useCallback(async (dossierId) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post(`/validate/${dossierId}`);
      setDossier((prev) => ({ ...prev, ...data.data }));
      return data.data;
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (dossierId, hoSoRow, vanBanRows) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post(`/save/${dossierId}`, { hoSoRow, vanBanRows });
      setDossier((prev) => ({ ...prev, ...data.data }));
      return data.data;
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setDossier(null);
    setError(null);
  }, []);

  return { dossier, setDossier, loading, error, uploadZip, uploadFolder, validate, save, reset, uploadProgress, resetUploadProgress };
}
