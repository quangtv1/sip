/**
 * PDF viewer modal.
 * Pre-APPROVED: fetches from /api/pdf/temp/:dossierId/:filename
 * Post-APPROVED: uses presigned URL from /api/pdf/signed/:dossierId/:filename
 */
import { Modal, Alert, Spin } from 'antd';
import { useState, useEffect } from 'react';
import apiClient from '../../config/api-client.js';

export default function PdfViewer({ open, dossierId, filename, dossierState, onClose }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !dossierId || !filename) return;

    setLoading(true);
    setError('');
    setPdfUrl(null);

    const approved = ['APPROVED', 'PACKAGING', 'PACKAGED', 'DONE'].includes(dossierState);
    const endpoint = approved
      ? `/pdf/signed/${dossierId}/${encodeURIComponent(filename)}`
      : `/pdf/temp/${dossierId}/${encodeURIComponent(filename)}`;

    apiClient.get(endpoint)
      .then(({ data }) => setPdfUrl(data.data.url))
      .catch(() => setError(`Không thể tải file "${filename}"`))
      .finally(() => setLoading(false));
  }, [open, dossierId, filename, dossierState]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={filename || 'Xem PDF'}
      width="80vw"
      footer={null}
      styles={{ body: { padding: 0, height: '75vh' } }}
      destroyOnClose
    >
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Spin tip="Đang tải PDF..." />
        </div>
      )}
      {error && <Alert message={error} type="error" showIcon style={{ margin: 16 }} />}
      {pdfUrl && !loading && (
        <iframe
          src={pdfUrl}
          title={filename}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      )}
    </Modal>
  );
}
