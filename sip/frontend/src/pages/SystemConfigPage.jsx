/**
 * System configuration page — Admin only.
 * Tabs: MinIO | Danh mục (enums) | Cấu trúc bảng (schemas) | Tiêu chuẩn (profiles)
 */
import { Typography, Tabs } from 'antd';
import MinioConfigTab        from './system-config/minio-config-tab.jsx';
import EnumManagementTab     from './system-config/enum-management-tab.jsx';
import SchemaManagementTab   from './system-config/schema-management-tab.jsx';
import ProfileManagementTab  from './system-config/profile-management-tab.jsx';

const { Title } = Typography;

const TAB_ITEMS = [
  { key: 'minio',   label: 'MinIO',          children: <MinioConfigTab /> },
  { key: 'enums',   label: 'Danh mục',        children: <EnumManagementTab /> },
  { key: 'schema',  label: 'Cấu trúc bảng',  children: <SchemaManagementTab /> },
  { key: 'profile', label: 'Tiêu chuẩn',     children: <ProfileManagementTab /> },
];

export default function SystemConfigPage() {
  return (
    <div style={{ padding: '0 4px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>Cấu hình hệ thống</Title>
      <Tabs items={TAB_ITEMS} destroyInactiveTabPane={false} />
    </div>
  );
}
