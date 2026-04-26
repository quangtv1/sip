import { Layout, Space, Dropdown, Avatar, Typography } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth.js';
import { HEADER_BG } from '../../config/theme-config.js';
import NotificationBell from '../notifications/NotificationBell.jsx';

const { Header } = Layout;
const { Text } = Typography;

const ROLE_LABELS = {
  Admin: 'Quản trị viên',
  Operator: 'Cán bộ xử lý',
  Approver: 'Người phê duyệt',
  Signer: 'Người ký số',
  Auditor: 'Kiểm toán viên',
};

export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const menuItems = [
    {
      key: 'info',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div><Text strong>{user?.fullName || user?.email}</Text></div>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{ROLE_LABELS[user?.role] || user?.role}</Text></div>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    { key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined />, danger: true },
  ];

  return (
    <Header style={{ background: HEADER_BG, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
      <Space>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0E9F8E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>SIP</Text>
        </div>
        <Text style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Hệ thống SIP</Text>
      </Space>

      <Space size={8}>
        <NotificationBell />
        <Dropdown menu={{ items: menuItems, onClick: ({ key }) => key === 'logout' && handleLogout() }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar size={28} icon={<UserOutlined />} style={{ background: '#0E9F8E' }} />
            <Text style={{ color: '#ddd', fontSize: 13 }}>{user?.fullName || user?.email}</Text>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  );
}
