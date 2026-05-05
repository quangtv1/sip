/**
 * Enum management tab — CRUD for enum value lists.
 * System enums (builtin): edit values only.
 * Custom enums: create, rename displayName, edit values, delete.
 * The `name` code (e.g. THOI_HAN_BAO_QUAN) is shown as a Tag for reference
 * in Cấu trúc bảng → Tham số column.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Collapse, Button, Input, Space, Spin, Alert, Typography,
  Tag, Popconfirm, Modal, Form, Tooltip,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import apiClient from '../../config/api-client.js';

const { Text } = Typography;

/** Editor for one enum's values; allows editing displayName for custom enums */
function EnumPanel({ name, displayName: initDisplayName, builtin, initialValues, onSaved }) {
  const [values,      setValues]      = useState(initialValues);
  const [displayName, setDisplayName] = useState(initDisplayName);
  const [saving,      setSaving]      = useState(false);
  const [result,      setResult]      = useState(null);

  useEffect(() => {
    setValues(initialValues);
    setDisplayName(initDisplayName);
  }, [initialValues, initDisplayName]);

  async function handleSave() {
    const trimmed = values.map(v => v.trim()).filter(Boolean);
    if (trimmed.length === 0) {
      setResult({ type: 'error', message: 'Danh sách không được rỗng' });
      return;
    }
    setSaving(true); setResult(null);
    try {
      await apiClient.put(`/config/enums/${name}`, { values: trimmed, displayName });
      setValues(trimmed);
      setResult({ type: 'success', message: 'Đã lưu' });
      onSaved?.();
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error?.message || 'Lưu thất bại' });
    } finally { setSaving(false); }
  }

  return (
    <div>
      {/* Custom enums: allow renaming displayName */}
      {!builtin && (
        <Space style={{ marginBottom: 10 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Tên hiển thị:</Text>
          <Input
            size="small" value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            style={{ width: 260 }}
          />
        </Space>
      )}

      <Space direction="vertical" style={{ width: '100%' }} size={4}>
        {values.map((v, idx) => (
          <Space key={idx}>
            <Input
              size="small" value={v} style={{ width: 340 }}
              onChange={e => setValues(prev => prev.map((x, i) => i === idx ? e.target.value : x))}
            />
            <Tooltip title="Xoá">
              <Button
                danger size="small" icon={<DeleteOutlined />}
                disabled={values.length <= 1}
                onClick={() => setValues(prev => prev.filter((_, i) => i !== idx))}
              />
            </Tooltip>
          </Space>
        ))}
      </Space>

      {result && (
        <Alert type={result.type} message={result.message} showIcon closable
          style={{ marginTop: 8 }} onClose={() => setResult(null)} />
      )}

      <Space style={{ marginTop: 10 }}>
        <Button size="small" icon={<PlusOutlined />}
          onClick={() => setValues(prev => [...prev, ''])}>
          Thêm giá trị
        </Button>
        <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
          Lưu
        </Button>
      </Space>
    </div>
  );
}

export default function EnumManagementTab() {
  const [enums,     setEnums]     = useState({});
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating,  setCreating]  = useState(false);
  const [form]                    = Form.useForm();

  const fetchEnums = useCallback(() => {
    setLoading(true); setError(null);
    apiClient.get('/config/enums')
      .then(({ data }) => setEnums(data.data))
      .catch(() => setError('Không thể tải danh mục'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchEnums(); }, [fetchEnums]);

  async function handleCreate() {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setCreating(true);
    try {
      await apiClient.post('/config/enums', {
        name:        values.name,
        displayName: values.displayName,
        values:      values.firstValue ? [values.firstValue] : [],
      });
      setModalOpen(false);
      form.resetFields();
      fetchEnums();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Tạo danh mục thất bại');
    } finally { setCreating(false); }
  }

  async function handleDelete(name) {
    try {
      await apiClient.delete(`/config/enums/${name}`);
      fetchEnums();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Xóa thất bại');
    }
  }

  const items = Object.entries(enums).map(([name, info]) => ({
    key: name,
    label: (
      <Space>
        <Text strong>{info.displayName}</Text>
        {/* Code tag — copy this value into Cấu trúc bảng → Tham số */}
        <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 11, cursor: 'default' }}>
          {name}
        </Tag>
        <Text type="secondary" style={{ fontSize: 12 }}>({info.values?.length || 0} giá trị)</Text>
        {info.builtin && <Tag style={{ fontSize: 10 }}>hệ thống</Tag>}
      </Space>
    ),
    extra: !info.builtin ? (
      <Popconfirm
        title={`Xóa danh mục "${name}"?`}
        onConfirm={() => handleDelete(name)}
        okText="Xóa" cancelText="Hủy"
      >
        <Button danger size="small" icon={<DeleteOutlined />} onClick={e => e.stopPropagation()} />
      </Popconfirm>
    ) : null,
    children: (
      <EnumPanel
        name={name}
        displayName={info.displayName}
        builtin={info.builtin}
        initialValues={info.values || []}
        onSaved={fetchEnums}
      />
    ),
  }));

  return (
    <Spin spinning={loading}>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Thêm danh mục
        </Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={fetchEnums}>Tải lại</Button>
      </Space>

      {error && (
        <Alert type="error" message={error} showIcon closable
          style={{ marginBottom: 12 }} onClose={() => setError(null)} />
      )}

      <Collapse items={items} style={{ background: '#fff' }} />

      <Modal
        title="Thêm danh mục mới"
        open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)}
        confirmLoading={creating} okText="Tạo" cancelText="Hủy" destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            label="Mã tham chiếu (dùng trong Cấu trúc bảng → Tham số)"
            name="name"
            rules={[
              { required: true, message: 'Bắt buộc' },
              { pattern: /^[A-Z][A-Z0-9_]{1,29}$/, message: '2–30 ký tự IN_HOA, số, dấu _. VD: LOAI_TAI_LIEU' },
            ]}
          >
            <Input
              placeholder="VD: LOAI_TAI_LIEU"
              onChange={e => form.setFieldValue('name', e.target.value.toUpperCase())}
            />
          </Form.Item>
          <Form.Item
            label="Tên hiển thị"
            name="displayName"
            rules={[{ required: true, message: 'Bắt buộc' }]}
          >
            <Input placeholder="VD: Loại tài liệu" />
          </Form.Item>
          <Form.Item label="Giá trị đầu tiên (tuỳ chọn)" name="firstValue">
            <Input placeholder="VD: 01: Giá trị mẫu" />
          </Form.Item>
        </Form>
      </Modal>
    </Spin>
  );
}
