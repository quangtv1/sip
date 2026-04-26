/**
 * UserTable — paginated user list with lock/unlock and edit actions.
 * Props:
 *   users     {Array}
 *   loading   {boolean}
 *   total     {number}
 *   page      {number}
 *   onPageChange {Function(page)}
 *   onEdit    {Function(user)}
 *   onToggleLock {Function(user, lock: boolean)}
 */
import { Table, Tag, Button, Space, Tooltip, Typography } from 'antd';
import { EditOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';

const { Text } = Typography;

const ROLE_COLORS = { Admin: 'red', Operator: 'blue', Approver: 'green', Signer: 'purple', Auditor: 'orange' };

export default function UserTable({ users = [], loading, total, page, onPageChange, onEdit, onToggleLock }) {
  const columns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (v) => <Text style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (v) => <Tag color={ROLE_COLORS[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v) => v ? <Tag color="success">Hoạt động</Tag> : <Tag color="error">Đã khóa</Tag>,
    },
    {
      title: 'Lần đăng nhập cuối',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      render: (v) => v ? new Date(v).toLocaleString('vi-VN') : '—',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Chỉnh sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          </Tooltip>
          <Tooltip title={record.isActive ? 'Khóa tài khoản' : 'Mở khóa'}>
            <Button
              size="small"
              danger={record.isActive}
              icon={record.isActive ? <LockOutlined /> : <UnlockOutlined />}
              onClick={() => onToggleLock(record, !record.isActive)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="_id"
      dataSource={users}
      columns={columns}
      loading={loading}
      size="small"
      pagination={{
        current: page,
        total,
        pageSize: 20,
        onChange: onPageChange,
        showTotal: (t) => `Tổng ${t} người dùng`,
      }}
    />
  );
}
