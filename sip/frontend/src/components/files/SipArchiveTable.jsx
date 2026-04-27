/**
 * SipArchiveTable — structured table view of the sip-files MinIO bucket.
 * Fetches enriched data from /api/files/sip-archive (joined with dossier metadata).
 * Exports SIP_ARCHIVE_COL_FIELDS + SIP_ARCHIVE_DEFAULT_WIDTHS for GridConfigDrawer.
 * Props: hidden, colWidths, onOpenConfig
 */
import { useState, useEffect, useCallback } from 'react';
import { Table, Space, Button, Tooltip, Popconfirm, Input, Card, Alert, Spin, message } from 'antd';
import {
  EyeOutlined, DownloadOutlined, FolderViewOutlined,
  DeleteOutlined, ReloadOutlined, SearchOutlined, SettingOutlined,
} from '@ant-design/icons';
import apiClient from '../../config/api-client.js';
import SipViewerModal from '../sip-viewer/SipViewerModal.jsx';

const FS = { fontSize: 13 };
const CELL = { style: { whiteSpace: 'normal', wordBreak: 'break-word' } };

function fmtSize(b) {
  if (b == null) return '—';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

const COL_DEFS = [
  { key: 'filename',    title: 'Tên file SIP',    defaultWidth: 200,
    render: (v) => <span style={FS}>{v || '—'}</span> },
  { key: 'tieuDeHoSo', title: 'Tiêu đề hồ sơ',  defaultWidth: 200,
    render: (v) => <span style={FS}>{v || '—'}</span> },
  { key: 'size',        title: 'Dung lượng',       defaultWidth: 90, align: 'right',
    render: (v) => <span style={FS}>{fmtSize(v)}</span> },
  { key: 'lastModified', title: 'Ngày tạo',        defaultWidth: 100,
    render: (v) => <span style={FS}>{v ? new Date(v).toLocaleDateString('vi-VN') : '—'}</span> },
  { key: 'name',        title: 'Đường dẫn',        defaultWidth: 180,
    render: (v) => <span style={{ ...FS, color: '#6B7C8D' }}>{v || '—'}</span> },
  { key: 'vanBanCount', title: 'Số văn bản',       defaultWidth: 90, align: 'center',
    render: (v) => <span style={FS}>{v ?? 0}</span> },
];

export const SIP_ARCHIVE_COL_FIELDS = COL_DEFS.map((c) => [c.key, c.title]);
export const SIP_ARCHIVE_DEFAULT_WIDTHS = Object.fromEntries(COL_DEFS.map((c) => [c.key, c.defaultWidth]));

export default function SipArchiveTable({ hidden, colWidths, onOpenConfig }) {
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [viewerPath, setViewerPath] = useState(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await apiClient.get('/files/sip-archive');
      setData(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Không thể tải kho lưu trữ');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  async function handlePreview(file) {
    try {
      const res = await apiClient.get('/files/preview', { params: { bucket: 'sip-files', path: file.name } });
      window.open(res.data.data.url, '_blank', 'noopener,noreferrer');
    } catch { message.error('Không thể tạo link xem trước'); }
  }

  function handleDownload(file) {
    const token = localStorage.getItem('sip_token');
    const qs = new URLSearchParams({ bucket: 'sip-files', path: file.name });
    fetch(`/api/files/download?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), {
          href: url, download: file.filename || file.name.split('/').pop(),
        });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => message.error('Không thể tải xuống file'));
  }

  async function handleDelete(file) {
    try {
      await apiClient.delete('/files/sip-archive', { params: { path: file.name } });
      message.success('Đã xoá file');
      setData((prev) => prev.filter((f) => f.name !== file.name));
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Xoá thất bại');
    }
  }

  const filtered = search.trim()
    ? data.filter((f) => f.filename?.toLowerCase().includes(search.toLowerCase())
        || f.tieuDeHoSo?.toLowerCase().includes(search.toLowerCase()))
    : data;

  const columns = COL_DEFS
    .filter(({ key }) => !hidden?.has(key))
    .map(({ key, title, defaultWidth, align, render }) => ({
      key, title, dataIndex: key, align, onCell: () => CELL,
      width: colWidths?.[key] ?? defaultWidth, render,
    }));

  columns.push({
    key: 'actions', title: 'Hành động', width: 132, align: 'center',
    render: (_, file) => (
      <Space size={2}>
        <Tooltip title="Xem nội dung SIP">
          <Button size="small" icon={<FolderViewOutlined />} onClick={() => setViewerPath(file.name)} />
        </Tooltip>
        <Tooltip title="Xem trước">
          <Button size="small" icon={<EyeOutlined />} onClick={() => handlePreview(file)} />
        </Tooltip>
        <Tooltip title="Tải xuống">
          <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(file)} />
        </Tooltip>
        <Popconfirm title="Xoá file này?" okText="Xoá" cancelText="Huỷ" okType="danger"
          onConfirm={() => handleDelete(file)}>
          <Tooltip title="Xoá">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      </Space>
    ),
  });

  return (
    <>
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Space wrap>
            <Input prefix={<SearchOutlined />} placeholder="Tìm theo tên file hoặc tiêu đề"
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }} allowClear />
            <Button icon={<ReloadOutlined />} onClick={fetchFiles}>Làm mới</Button>
          </Space>
          <Tooltip title="Cấu hình cột">
            <Button size="small" icon={<SettingOutlined />} onClick={onOpenConfig} />
          </Tooltip>
        </div>
      </Card>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Spin spinning={loading}>
          <Table columns={columns} dataSource={filtered} rowKey="name" size="small"
            pagination={{ pageSize: 20, showSizeChanger: false }} />
        </Spin>
      </Card>

      <SipViewerModal open={!!viewerPath} objectPath={viewerPath} onClose={() => setViewerPath(null)} />
    </>
  );
}
