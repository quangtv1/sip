/**
 * AuditLogPage — filterable audit log viewer with CSV export (Admin + Auditor).
 */
import { useState, useEffect, useCallback } from 'react';
import { Typography, Alert, message } from 'antd';
import apiClient from '../config/api-client.js';
import AuditLogTable from '../components/admin/AuditLogTable.jsx';

const { Title } = Typography;

export default function AuditLogPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...filters, page, limit: 20 };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const { data } = await apiClient.get('/logs', { params });
      setItems(data.data);
      setTotal(data.meta.total);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Không thể tải nhật ký');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  function handleFilter(newFilters) {
    setFilters(newFilters);
    setPage(1);
    // useEffect will fire automatically due to filters/page state change
  }

  function handlePageChange(p) {
    setPage(p);
    // useEffect will fire automatically due to page state change
  }

  async function handleExport() {
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data } = await apiClient.get('/logs/export', { params, responseType: 'blob' });
      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      message.error('Xuất CSV thất bại');
    }
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Nhật ký kiểm toán</Title>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
      <AuditLogTable
        items={items}
        loading={loading}
        total={total}
        page={page}
        filters={filters}
        onFilter={handleFilter}
        onPageChange={handlePageChange}
        onExport={handleExport}
      />
    </div>
  );
}
