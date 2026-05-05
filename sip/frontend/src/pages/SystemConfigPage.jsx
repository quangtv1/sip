/**
 * System configuration page — Admin only.
 * Tabs: Tiêu chuẩn (unified standards hub) | MinIO
 */
import { Typography, Tabs } from 'antd';
import MinioConfigTab   from './system-config/minio-config-tab.jsx';
import StandardsHubTab  from './system-config/standards-hub-tab.jsx';

const { Title } = Typography;

const TAB_ITEMS = [
  { key: 'standards', label: 'Tiêu chuẩn', children: <StandardsHubTab /> },
  { key: 'minio',     label: 'MinIO',       children: <MinioConfigTab /> },
];

export default function SystemConfigPage() {
  return (
    <div style={{ padding: '0 4px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>Cấu hình hệ thống</Title>
      <Tabs items={TAB_ITEMS} destroyInactiveTabPane={false} />
    </div>
  );
}
