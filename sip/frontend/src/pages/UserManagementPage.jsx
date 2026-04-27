/**
 * UserManagementPage — Admin user CRUD + Audit log in tabs.
 */
import { useState, useEffect, useCallback } from 'react';
import { Typography, Button, Space, Alert, Tabs, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import apiClient from '../config/api-client.js';
import UserTable from '../components/admin/UserTable.jsx';
import UserFormModal from '../components/admin/UserFormModal.jsx';
import AuditLogTable from '../components/admin/AuditLogTable.jsx';

const { Title } = Typography;

// ─── Users tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const fetchUsers = useCallback(async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/users', { params: { page: p, limit: 20 } });
      setUsers(data.data);
      setTotal(data.meta.total);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditUser(null); setModalOpen(true); }}>
          Tạo người dùng
        </Button>
      </Space>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
      <UserTable
        users={users}
        loading={loading}
        total={total}
        page={page}
        onPageChange={(p) => { setPage(p); fetchUsers(p); }}
        onEdit={(u) => { setEditUser(u); setModalOpen(true); }}
        onToggleLock={async (user, lock) => {
          try {
            await apiClient.put(`/users/${user._id}/lock`, { lock });
            message.success(lock ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
            fetchUsers();
          } catch (err) {
            message.error(err.response?.data?.error?.message || 'Thao tác thất bại');
          }
        }}
      />
      <UserFormModal
        open={modalOpen}
        user={editUser}
        onClose={() => setModalOpen(false)}
        onSaved={() => fetchUsers()}
      />
    </>
  );
}

// ─── Audit log tab ────────────────────────────────────────────────────────────
function AuditTab() {
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
    <>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
      <AuditLogTable
        items={items}
        loading={loading}
        total={total}
        page={page}
        filters={filters}
        onFilter={(f) => { setFilters(f); setPage(1); }}
        onPageChange={(p) => setPage(p)}
        onExport={handleExport}
      />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UserManagementPage() {
  const tabItems = [
    { key: 'users', label: 'Người dùng', children: <UsersTab /> },
    { key: 'audit', label: 'Nhật ký', children: <AuditTab /> },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Người dùng</Title>
      <Tabs items={tabItems} destroyInactiveTabPane={false} />
    </div>
  );
}
