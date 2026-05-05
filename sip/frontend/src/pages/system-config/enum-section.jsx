/**
 * EnumSection — "Danh mục" tab inside StandardDetailPage.
 * Supports Global view and per-standard view with clone/revert.
 * "Xem theo" dropdown selects scope: 'global' or a profileId.
 * Create modal works in both scopes:
 *   global  → POST /config/enums
 *   profile → POST /config/enums + POST /config/profiles/:id/enums/:name/clone
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Collapse, Button, Space, Spin, Alert, Typography,
  Tag, Popconfirm, Modal, Form, Input, Select, Divider, Tooltip,
} from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import apiClient from '../../config/api-client.js';
import EnumPanel from './enum-panel.jsx';

const { Text } = Typography;

export default function EnumSection({ profiles = [], defaultScopeId = 'global' }) {
  const [scopeId,   setScopeId]   = useState(defaultScopeId);
  const [enums,     setEnums]     = useState({});
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating,  setCreating]  = useState(false);
  const [form]                    = Form.useForm();

  const fetchEnums = useCallback(() => {
    setLoading(true); setError(null);
    const url = scopeId === 'global' ? '/config/enums' : `/config/profiles/${scopeId}/enums`;
    apiClient.get(url)
      .then(({ data }) => setEnums(data.data))
      .catch(() => setError('Không thể tải danh mục'))
      .finally(() => setLoading(false));
  }, [scopeId]);

  useEffect(() => { fetchEnums(); }, [fetchEnums]);

  async function handleCreate() {
    let vals; try { vals = await form.validateFields(); } catch { return; }
    setCreating(true);
    try {
      // Always create globally first
      await apiClient.post('/config/enums', {
        name: vals.name, displayName: vals.displayName,
        values: vals.firstValue ? [vals.firstValue] : [],
      });
      // If viewing a profile scope, auto-clone so it's immediately available here
      if (scopeId !== 'global') {
        await apiClient.post(`/config/profiles/${scopeId}/enums/${vals.name}/clone`);
      }
      setModalOpen(false); form.resetFields(); fetchEnums();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Tạo thất bại');
    } finally { setCreating(false); }
  }

  async function handleDeleteGlobal(name) {
    try { await apiClient.delete(`/config/enums/${name}`); fetchEnums(); }
    catch (err) { setError(err.response?.data?.error?.message || 'Xóa thất bại'); }
  }

  async function handleClone(name) {
    try { await apiClient.post(`/config/profiles/${scopeId}/enums/${name}/clone`); fetchEnums(); }
    catch (err) { setError(err.response?.data?.error?.message || 'Clone thất bại'); }
  }

  async function handleRevert(name) {
    try { await apiClient.delete(`/config/profiles/${scopeId}/enums/${name}`); fetchEnums(); }
    catch (err) { setError(err.response?.data?.error?.message || 'Lỗi'); }
  }

  const scopeOptions = [
    { value: 'global', label: 'Global (dùng chung)' },
    ...profiles.map(p => ({ value: p.id, label: `${p.id} — ${p.name}` })),
  ];

  const items = Object.entries(enums).map(([name, info]) => ({
    key: name,
    label: (
      <Space>
        <Text strong>{info.displayName}</Text>
        <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 11 }}>{name}</Tag>
        {info.overridden && <Tag color="orange">riêng</Tag>}
        {info.builtin && <Tag style={{ fontSize: 10 }}>hệ thống</Tag>}
        <Text type="secondary" style={{ fontSize: 12 }}>({info.values?.length || 0} giá trị)</Text>
      </Space>
    ),
    extra: (
      <Space onClick={e => e.stopPropagation()}>
        {scopeId !== 'global' && (
          info.overridden
            ? <Popconfirm title="Bỏ bản riêng, dùng lại global?" onConfirm={() => handleRevert(name)} okText="Xác nhận" cancelText="Hủy">
                <Button size="small">Dùng global</Button>
              </Popconfirm>
            : <Tooltip title="Tạo bản riêng cho tiêu chuẩn này">
                <Button size="small" onClick={() => handleClone(name)}>Clone</Button>
              </Tooltip>
        )}
        {scopeId === 'global' && !info.builtin && (
          <Popconfirm title={`Xóa danh mục "${name}"?`} onConfirm={() => handleDeleteGlobal(name)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        )}
      </Space>
    ),
    children: (
      <EnumPanel
        name={name} displayName={info.displayName} builtin={info.builtin}
        overridden={info.overridden} scopeId={scopeId}
        initialValues={info.values || []} onSaved={fetchEnums}
      />
    ),
  }));

  return (
    <Spin spinning={loading}>
      <Space style={{ marginBottom: 12 }} wrap>
        <Text strong>Danh mục:</Text>
        <Select value={scopeId} onChange={setScopeId} options={scopeOptions} style={{ width: 220 }} size="small" />
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Thêm danh mục
        </Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={fetchEnums}>Tải lại</Button>
      </Space>

      {error && <Alert type="error" message={error} showIcon closable
        style={{ marginBottom: 10 }} onClose={() => setError(null)} />}

      {scopeId !== 'global' && (
        <Alert
          type="info" showIcon style={{ marginBottom: 10 }}
          message={
            <Text style={{ fontSize: 12 }}>
              Bấm <Text strong>Clone</Text> để tạo bản riêng cho tiêu chuẩn này.
              Danh mục chưa clone sẽ dùng giá trị global.
              Mã <Text code style={{ fontSize: 12 }}>màu xanh</Text> là mã dùng trong cột <Text code style={{ fontSize: 12 }}>Tham số</Text> của tab Cấu trúc bảng.
            </Text>
          }
        />
      )}

      <Collapse items={items} style={{ background: '#fff' }} />

      {/* ── Create modal ─────────────────────────────────────────────── */}
      <Modal
        title="Thêm danh mục mới"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={creating}
        okText="Tạo" cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            label={<Space size={4}><span>Mã tham chiếu</span><Tag color="blue" style={{ fontSize: 11 }}>dùng trong cột Tham số</Tag></Space>}
            name="name"
            rules={[{ required: true }, { pattern: /^[A-Z][A-Z0-9_]{1,29}$/, message: '2-30 ký tự IN_HOA, số, _' }]}
          >
            <Input
              placeholder="VD: LOAI_TAI_LIEU"
              onChange={e => form.setFieldValue('name', e.target.value.toUpperCase())}
              style={{ fontFamily: 'monospace', fontWeight: 700 }}
            />
          </Form.Item>
          <Form.Item label="Tên hiển thị" name="displayName" rules={[{ required: true }]}>
            <Input placeholder="VD: Loại tài liệu" />
          </Form.Item>
          <Divider style={{ margin: '8px 0' }} />
          <Form.Item label="Giá trị đầu tiên (tuỳ chọn)" name="firstValue">
            <Input placeholder="VD: 01: Giá trị mẫu" />
          </Form.Item>
        </Form>
        {scopeId !== 'global' && (
          <Alert type="info" showIcon style={{ marginTop: 8 }}
            message={`Danh mục sẽ được tạo global và tự động clone vào tiêu chuẩn "${scopeId}".`} />
        )}
      </Modal>
    </Spin>
  );
}
