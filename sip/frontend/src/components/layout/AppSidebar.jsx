import { Layout, Menu } from 'antd';
import { UnorderedListOutlined, FolderOutlined, AuditOutlined, BarChartOutlined, SettingOutlined, DatabaseOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth.js';
import { SIDEBAR_BG } from '../../config/theme-config.js';

const { Sider } = Layout;

const ALL_ITEMS = [
  { key: '/dashboard', icon: <BarChartOutlined />,      label: 'Tổng quan',           roles: ['Admin', 'Operator', 'Approver', 'Signer', 'Auditor'] },
  { key: '/queue',     icon: <UnorderedListOutlined />, label: 'Hàng đợi hồ sơ',      roles: ['Admin', 'Operator', 'Approver', 'Signer', 'Auditor'] },
  { key: '/dossier',   icon: <FolderOutlined />,        label: 'Tải lên hồ sơ',        roles: ['Admin', 'Operator'] },
  { key: '/files',     icon: <DatabaseOutlined />,      label: 'Kho lưu trữ file',     roles: ['Admin', 'Auditor'] },
  { key: '/audit',     icon: <AuditOutlined />,         label: 'Nhật ký kiểm toán',    roles: ['Admin', 'Auditor'] },
  { key: '/users',     icon: <TeamOutlined />,          label: 'Quản lý người dùng',   roles: ['Admin'] },
  { key: '/config',    icon: <SettingOutlined />,       label: 'Cấu hình hệ thống',    roles: ['Admin'] },
];

export default function AppSidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items = ALL_ITEMS
    .filter((item) => item.roles.includes(user?.role))
    .map(({ key, icon, label }) => ({ key, icon, label }));

  return (
    <Sider width={210} style={{ background: SIDEBAR_BG }} collapsed={false}>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        style={{ background: SIDEBAR_BG, border: 'none', marginTop: 8 }}
        theme="dark"
        items={items}
        onClick={({ key }) => navigate(key)}
      />
    </Sider>
  );
}
