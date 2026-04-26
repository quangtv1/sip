/**
 * FileRow — single row in the FileBrowser table.
 * Shows file name, size, last-modified date, and preview/download actions.
 *
 * Props:
 *   file     { name, size, lastModified } — from MinIO list API
 *   bucket   {string}
 *   onPreview  {Function(file)}
 *   onDownload {Function(file)}
 */
import { Button, Space, Typography, Tooltip } from 'antd';
import { EyeOutlined, DownloadOutlined, FileZipOutlined, FilePdfOutlined, FolderViewOutlined } from '@ant-design/icons';

const { Text } = Typography;

function formatSize(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fileIcon(name = '') {
  if (name.endsWith('.zip')) return <FileZipOutlined style={{ color: '#fa8c16' }} />;
  if (name.endsWith('.pdf')) return <FilePdfOutlined style={{ color: '#cf1322' }} />;
  return null;
}

export default function FileRow({ file, onPreview, onDownload, onViewSip }) {
  const name = file.name?.split('/').pop() || file.name;

  return (
    <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
      <Space>
        {fileIcon(name)}
        <Tooltip title={file.name}>
          <Text style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
            {name}
          </Text>
        </Tooltip>
        <Text type="secondary" style={{ fontSize: 12 }}>{formatSize(file.size)}</Text>
        {file.lastModified && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(file.lastModified).toLocaleDateString('vi-VN')}
          </Text>
        )}
      </Space>
      <Space size={4}>
        {onViewSip && (
          <Tooltip title="Xem nội dung SIP">
            <Button size="small" icon={<FolderViewOutlined />} onClick={onViewSip} />
          </Tooltip>
        )}
        <Tooltip title="Xem trước">
          <Button size="small" icon={<EyeOutlined />} onClick={() => onPreview(file)} />
        </Tooltip>
        <Tooltip title="Tải xuống">
          <Button size="small" icon={<DownloadOutlined />} onClick={() => onDownload(file)} />
        </Tooltip>
      </Space>
    </Space>
  );
}
