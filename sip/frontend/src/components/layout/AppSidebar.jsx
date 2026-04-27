import { Layout, Menu } from 'antd';
import { FolderOutlined, BarChartOutlined, SettingOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth.js';
import { SIDEBAR_BG } from '../../config/theme-config.js';

const { Sider } = Layout;

const ALL_ITEMS = [
  { key: '/dashboard', icon: <BarChartOutlined />,      label: 'Tổng quan',           roles: ['Admin', 'Operator', 'Approver', 'Signer', 'Auditor'] },
  { key: '/dossier',   icon: <FolderOutlined />,        label: 'Đóng gói SIP',         roles: ['Admin', 'Operator', 'Approver', 'Signer', 'Auditor'] },
  { key: '/users',     icon: <TeamOutlined />,          label: 'Người dùng',   roles: ['Admin'] },
  { key: '/config',    icon: <SettingOutlined />,       label: 'Cấu hình',    roles: ['Admin'] },
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
