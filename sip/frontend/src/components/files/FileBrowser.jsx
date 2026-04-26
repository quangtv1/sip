/**
 * FileBrowser — browse MinIO buckets, preview and download files.
 * Lists objects under a selected bucket/prefix via GET /api/files.
 * Preview opens a presigned URL in a new tab.
 * Download streams the file via GET /api/files/download.
 *
 * Props:
 *   bucket  {string}  - e.g. 'pdf-files' or 'sip-files'
 *   prefix  {string}  - optional path prefix filter
 */
import { useEffect, useState, useCallback } from 'react';
import { List, Select, Input, Spin, Alert, Typography, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import apiClient from '../../config/api-client.js';
import FileRow from './FileRow.jsx';

const { Text } = Typography;
const { Option } = Select;

const BUCKETS = ['pdf-files', 'sip-files'];

export default function FileBrowser({ bucket: initialBucket = 'sip-files', prefix: initialPrefix = '' }) {
  const [bucket, setBucket] = useState(initialBucket);
  const [prefix, setPrefix] = useState(initialPrefix);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/files', { params: { bucket, prefix } });
      setFiles(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Không thể tải danh sách file');
    } finally {
      setLoading(false);
    }
  }, [bucket, prefix]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  async function handlePreview(file) {
    try {
      const res = await apiClient.get('/files/preview', { params: { bucket, path: file.name } });
      window.open(res.data.data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Không thể tạo link xem trước');
    }
  }

  function handleDownload(file) {
    const token = localStorage.getItem('sip_token');
    const params = new URLSearchParams({ bucket, path: file.name });
    const url = `/api/files/download?${params.toString()}`;
    let blobUrl = null;
    // Pass auth header via fetch + blob URL since anchor tags can't set headers
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error(`Tải xuống thất bại (${r.status})`);
        return r.blob();
      })
      .then((blob) => {
        blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.setAttribute('download', file.name.split('/').pop() || 'download');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      })
      .catch((err) => {
        alert(err.message || 'Không thể tải xuống file');
      })
      .finally(() => {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      });
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={12}>
      <Space wrap>
        <Select value={bucket} onChange={setBucket} style={{ width: 160 }}>
          {BUCKETS.map((b) => <Option key={b} value={b}>{b}</Option>)}
        </Select>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Lọc theo prefix..."
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          style={{ width: 240 }}
          allowClear
        />
      </Space>

      {error && <Alert type="error" message={error} showIcon />}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
      ) : files.length === 0 ? (
        <Text type="secondary">Không có file nào trong bucket này.</Text>
      ) : (
        <List
          bordered
          size="small"
          dataSource={files}
          renderItem={(file) => (
            <List.Item style={{ padding: '8px 12px' }}>
              <FileRow
                file={file}
                bucket={bucket}
                onPreview={handlePreview}
                onDownload={handleDownload}
              />
            </List.Item>
          )}
        />
      )}
    </Space>
  );
}
