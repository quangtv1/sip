/**
 * UserManagementPage — Admin-only user CRUD with lock/unlock.
 */
import { useState, useEffect, useCallback } from 'react';
import { Typography, Button, Space, Alert, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import apiClient from '../config/api-client.js';
import UserTable from '../components/admin/UserTable.jsx';
import UserFormModal from '../components/admin/UserFormModal.jsx';

const { Title } = Typography;

export default function UserManagementPage() {
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

  function handleEdit(user) {
    setEditUser(user);
    setModalOpen(true);
  }

  function handleCreate() {
    setEditUser(null);
    setModalOpen(true);
  }

  async function handleToggleLock(user, lock) {
    try {
      await apiClient.put(`/users/${user._id}/lock`, { lock });
      message.success(lock ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Thao tác thất bại');
    }
  }

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý người dùng</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
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
        onEdit={handleEdit}
        onToggleLock={handleToggleLock}
      />

      <UserFormModal
        open={modalOpen}
        user={editUser}
        onClose={() => setModalOpen(false)}
        onSaved={() => fetchUsers()}
      />
    </div>
  );
}
