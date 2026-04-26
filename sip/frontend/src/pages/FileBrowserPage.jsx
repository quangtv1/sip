/**
 * File browser page — browse MinIO buckets (PDF and SIP ZIPs).
 * Accessible to Admin and Auditor roles.
 */
import { Typography } from 'antd';
import FileBrowser from '../components/files/FileBrowser.jsx';

const { Title } = Typography;

export default function FileBrowserPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Kho lưu trữ file</Title>
      <FileBrowser />
    </div>
  );
}
