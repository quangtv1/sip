/**
 * StandardsHubTab — list/grid of profiles. Click → StandardDetailPage.
 * Toggle: table view vs card view.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Tag, Space, Badge, Typography,
  Modal, Form, Input, Alert, Spin, Tooltip, Popconfirm,
} from 'antd';
import {
  PlusOutlined, AppstoreOutlined, BarsOutlined,
  AuditOutlined, CheckCircleOutlined, DeleteOutlined,
} from '@ant-design/icons';
import apiClient from '../../config/api-client.js';
import StandardCard from './standard-card.jsx';
import StandardDetailPage from './standard-detail-page.jsx';

const { Text } = Typography;

const ACCENT = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6'];
function accentOf(idx) { return ACCENT[idx % ACCENT.length]; }

// ── ProfileFormModal ─────────────────────────────────────────────────────────
function ProfileFormModal({ open, onClose, onSaved }) {
  const [form]   = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  useEffect(() => {
    if (open) { form.resetFields(); setError(null); }
  }, [open, form]);

  async function handleOk() {
    let vals; try { vals = await form.validateFields(); } catch { return; }
    const sheets = vals.sheets.split(',').map(s => s.trim()).filter(Boolean);
    if (!sheets.length) { setError('Cần ít nhất 1 sheet'); return; }
    setSaving(true); setError(null);
    try {
      await apiClient.post('/config/profiles', {
        id: vals.id, name: vals.name, description: vals.description, sheets,
      });
      onSaved?.(); onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Tạo thất bại');
    } finally { setSaving(false); }
  }

  return (
    <Modal title="Thêm tiêu chuẩn mới" open={open} onOk={handleOk} onCancel={onClose}
      confirmLoading={saving} okText="Tạo" cancelText="Hủy" destroyOnClose>
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item label="Mã tiêu chuẩn (ID)" name="id"
          rules={[{ required: true }, { pattern: /^[A-Z0-9_]{2,20}$/, message: '2-20 ký tự IN_HOA, số, _' }]}>
          <Input placeholder="VD: TT05" onChange={e => form.setFieldValue('id', e.target.value.toUpperCase())} />
        </Form.Item>
        <Form.Item label="Tên tiêu chuẩn" name="name" rules={[{ required: true }]}>
          <Input placeholder="VD: Thông tư 05/2023" />
        </Form.Item>
        <Form.Item label="Mô tả" name="description">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="Danh sách sheets (phân cách bởi dấu phẩy)" name="sheets"
          rules={[{ required: true }]} extra="VD: Ho_so, Van_ban, Phu_luc"
          initialValue="Ho_so, Van_ban">
          <Input />
        </Form.Item>
      </Form>
      {error && <Alert type="error" message={error} showIcon style={{ marginTop: 8 }} />}
    </Modal>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function StandardsHubTab() {
  const [profiles,  setProfiles]  = useState([]);
  const [activeId,  setActiveId]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [view,      setView]      = useState('card');   // 'table' | 'card'
  const [selected,  setSelected]  = useState(null);     // profile obj | null
  const [formOpen,  setFormOpen]  = useState(false);

  const fetchProfiles = useCallback(() => {
    setLoading(true); setError(null);
    Promise.all([
      apiClient.get('/config/profiles'),
      apiClient.get('/config/active-profile'),
    ])
      .then(([pRes, aRes]) => {
        const list = pRes.data.data || [];
        setProfiles(list);
        setActiveId(aRes.data.data?.id || null);
        setSelected(prev => prev ? (list.find(p => p.id === prev.id) || null) : null);
      })
      .catch(() => setError('Không tải được danh sách tiêu chuẩn'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  async function handleSetActive(profileId) {
    try {
      await apiClient.post('/config/active-profile', { profileId });
      setActiveId(profileId);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Không thể kích hoạt');
    }
  }

  async function handleDelete(profileId) {
    try {
      await apiClient.delete(`/config/profiles/${profileId}`);
      setSelected(null);
      fetchProfiles();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Xóa thất bại');
    }
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selected) {
    const idx = profiles.findIndex(p => p.id === selected.id);
    return (
      <StandardDetailPage
        profile={selected}
        isActive={selected.id === activeId}
        profiles={profiles}
        accent={accentOf(idx)}
        onBack={() => setSelected(null)}
        onSetActive={() => handleSetActive(selected.id)}
        onDelete={() => { handleDelete(selected.id); }}
        onSaved={fetchProfiles}
      />
    );
  }

  // ── Table columns ──────────────────────────────────────────────────────────
  const tableColumns = [
    {
      title: 'Mã', dataIndex: 'id', width: 120,
      render: (id, _, idx) => (
        <Space size={6}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentOf(idx), flexShrink: 0 }} />
          <Text style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{id}</Text>
          {id === activeId && <Badge status="success" />}
        </Space>
      ),
    },
    { title: 'Tên tiêu chuẩn', dataIndex: 'name' },
    {
      title: 'Sheets', dataIndex: 'sheets', width: 240,
      render: (sheets, _, idx) => (
        <Space wrap size={4}>
          {(sheets || []).map(s => (
            <Tag key={s} style={{ fontFamily: 'monospace', fontSize: 11, margin: 0,
              background: accentOf(idx) + '10', border: `1px solid ${accentOf(idx)}35`,
              color: accentOf(idx) }}>
              {s}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Trạng thái', width: 110,
      render: (_, r) => r.id === activeId
        ? <Badge status="success" text={<Text style={{ fontSize: 12, color: '#16a34a' }}>đang dùng</Text>} />
        : null,
    },
    {
      title: '', width: 90,
      render: (_, record) => (
        <Space size={4} onClick={e => e.stopPropagation()}>
          {record.id !== activeId && (
            <Popconfirm title={`Dùng "${record.id}"?`} onConfirm={() => handleSetActive(record.id)}
              okText="Dùng" cancelText="Hủy">
              <Tooltip title="Đặt làm tiêu chuẩn đang dùng">
                <Button size="small" icon={<CheckCircleOutlined />} type="dashed" />
              </Tooltip>
            </Popconfirm>
          )}
          {record.id !== activeId && (
            <Popconfirm title={`Xóa "${record.id}"?`} onConfirm={() => handleDelete(record.id)}
              okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <Spin spinning={loading}>
      {error && (
        <Alert type="error" message={error} showIcon closable
          style={{ marginBottom: 12 }} onClose={() => setError(null)} />
      )}

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <AuditOutlined style={{ color: '#6b7280' }} />
          <Text strong style={{ fontSize: 14 }}>Tiêu chuẩn</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>({profiles.length})</Text>
        </Space>
        <Space size={8}>
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
            Thêm tiêu chuẩn
          </Button>
          <Space.Compact size="small">
            <Tooltip title="Dạng bảng">
              <Button icon={<BarsOutlined />} type={view === 'table' ? 'primary' : 'default'} onClick={() => setView('table')} />
            </Tooltip>
            <Tooltip title="Dạng card">
              <Button icon={<AppstoreOutlined />} type={view === 'card' ? 'primary' : 'default'} onClick={() => setView('card')} />
            </Tooltip>
          </Space.Compact>
        </Space>
      </div>

      {/* ── Table view ──────────────────────────────────────────── */}
      {view === 'table' && (
        <Table
          dataSource={profiles} columns={tableColumns} rowKey="id"
          pagination={false} size="small" bordered rowHoverable
          onRow={record => ({ onClick: () => setSelected(record), style: { cursor: 'pointer' } })}
        />
      )}

      {/* ── Card view ───────────────────────────────────────────── */}
      {view === 'card' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {profiles.map((p, idx) => (
            <StandardCard key={p.id} profile={p} isActive={p.id === activeId}
              accent={accentOf(idx)} onClick={() => setSelected(p)}
              onSetActive={() => handleSetActive(p.id)}
              onDelete={() => handleDelete(p.id)} />
          ))}
        </div>
      )}

      <ProfileFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={fetchProfiles} />
    </Spin>
  );
}
