import { Layout, Menu } from 'antd';
import { UnorderedListOutlined, FolderOutlined, AuditOutlined, BarChartOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth.js';
import { SIDEBAR_BG } from '../../config/theme-config.js';

const { Sider } = Layout;

const ALL_ITEMS = [
  { key: '/queue',     icon: <UnorderedListOutlined />, label: 'Hàng đợi hồ sơ', roles: ['Admin', 'Operator', 'Approver', 'Signer', 'Auditor'] },
  { key: '/dossier',   icon: <FolderOutlined />,        label: 'Tải lên hồ sơ',  roles: ['Admin', 'Operator'] },
  { key: '/audit',     icon: <AuditOutlined />,         label: 'Nhật ký kiểm toán', roles: ['Admin', 'Auditor'] },
  { key: '/dashboard', icon: <BarChartOutlined />,      label: 'Thống kê',        roles: ['Admin', 'Auditor'] },
  { key: '/users',     icon: <SettingOutlined />,       label: 'Quản lý người dùng', roles: ['Admin'] },
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
