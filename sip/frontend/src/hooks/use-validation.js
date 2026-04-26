/**
 * Inline field validation hook — calls POST /api/validate/inline.
 * Used by ExcelCell for real-time validation on blur.
 */
import { useState, useCallback } from 'react';
import apiClient from '../config/api-client.js';

export function useInlineValidation() {
  const [fieldErrors, setFieldErrors] = useState({}); // key: `${sheet}.${row}.${field}`

  const validateField = useCallback(async ({ sheet, field, value, rowContext, rowNum }) => {
    try {
      const { data } = await apiClient.post('/validate/inline', {
        sheet, field, value, rowContext, rowNum,
      });
      const key = `${sheet}.${rowNum}.${field}`;
      setFieldErrors((prev) => ({ ...prev, [key]: data.data.errors }));
      return data.data;
    } catch {
      return { errors: [], suggestions: [] };
    }
  }, []);

  const clearField = useCallback((sheet, rowNum, field) => {
    const key = `${sheet}.${rowNum}.${field}`;
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const getFieldErrors = useCallback(
    (sheet, rowNum, field) => fieldErrors[`${sheet}.${rowNum}.${field}`] || [],
    [fieldErrors]
  );

  return { validateField, clearField, getFieldErrors };
}
