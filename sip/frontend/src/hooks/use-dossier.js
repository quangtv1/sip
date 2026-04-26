/**
 * Dossier state management — upload, validate, save, fetch.
 * Uses local state; React Query cache layer can be added later.
 */
import { useState, useCallback } from 'react';
import apiClient from '../config/api-client.js';

export function useDossier() {
  const [dossier, setDossier] = useState(null);   // full dossier response
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const uploadZip = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('dossierZip', file);
      const { data } = await apiClient.post('/upload/zip', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDossier(data.data);
      return data.data;
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadFolder = useCallback(async (files, paths) => {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      paths.forEach((p) => form.append('paths', p));
      const { data } = await apiClient.post('/upload/folder', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDossier(data.data);
      return data.data;
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
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

  return { dossier, setDossier, loading, error, uploadZip, uploadFolder, validate, save, reset };
}
