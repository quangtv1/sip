/**
 * EnumPanel — edit panel for one enum (values list + optional displayName rename).
 * Shows the enum key prominently as a reference code for use in SheetSection Tham số column.
 */
import { useState, useEffect } from 'react';
import {
  Button, Input, Space, Alert, Typography, Tooltip, message,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SaveOutlined, CopyOutlined,
} from '@ant-design/icons';
import apiClient from '../../config/api-client.js';

const { Text } = Typography;

export default function EnumPanel({ name, displayName: initDisplayName, builtin, overridden, scopeId, initialValues, onSaved }) {
  const [values,      setValues]      = useState(initialValues);
  const [displayName, setDisplayName] = useState(initDisplayName);
  const [saving,      setSaving]      = useState(false);
  const [result,      setResult]      = useState(null);

  useEffect(() => { setValues(initialValues); setDisplayName(initDisplayName); }, [initialValues, initDisplayName]);

  async function handleSave() {
    const trimmed = values.map(v => v.trim()).filter(Boolean);
    if (!trimmed.length) { setResult({ type: 'error', message: 'Danh sách không được rỗng' }); return; }
    setSaving(true); setResult(null);
    try {
      if (scopeId === 'global') {
        await apiClient.put(`/config/enums/${name}`, { values: trimmed, displayName });
      } else {
        await apiClient.put(`/config/profiles/${scopeId}/enums/${name}`, { values: trimmed });
      }
      setValues(trimmed);
      setResult({ type: 'success', message: 'Đã lưu' });
      onSaved?.();
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error?.message || 'Lưu thất bại' });
    } finally { setSaving(false); }
  }

  function copyKey() {
    navigator.clipboard.writeText(name).then(() => message.success(`Đã sao chép mã "${name}"`));
  }

  return (
    <div>
      {/* ── Reference code banner ──────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', marginBottom: 12,
        background: '#f0f9ff', border: '1px solid #bae0ff', borderRadius: 6,
      }}>
        <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
          Mã dùng trong cột <Text code style={{ fontSize: 12 }}>Tham số</Text>:
        </Text>
        <Text code style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#0369a1' }}>
          {name}
        </Text>
        <Tooltip title="Sao chép mã">
          <Button size="small" type="text" icon={<CopyOutlined />} onClick={copyKey}
            style={{ color: '#0369a1', padding: '0 4px' }} />
        </Tooltip>
      </div>

      {/* ── DisplayName rename (global custom only) ────────────────── */}
      {scopeId === 'global' && !builtin && (
        <Space style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Tên hiển thị:</Text>
          <Input size="small" value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ width: 240 }} />
        </Space>
      )}

      {/* ── Values list ────────────────────────────────────────────── */}
      <Space direction="vertical" style={{ width: '100%' }} size={4}>
        {values.map((v, idx) => (
          <Space key={idx}>
            <Input size="small" value={v} style={{ width: 320 }}
              onChange={e => setValues(prev => prev.map((x, i) => i === idx ? e.target.value : x))} />
            <Tooltip title="Xoá">
              <Button danger size="small" icon={<DeleteOutlined />} disabled={values.length <= 1}
                onClick={() => setValues(prev => prev.filter((_, i) => i !== idx))} />
            </Tooltip>
          </Space>
        ))}
      </Space>

      {result && <Alert type={result.type} message={result.message} showIcon closable
        style={{ marginTop: 8 }} onClose={() => setResult(null)} />}

      <Space style={{ marginTop: 10 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={() => setValues(prev => [...prev, ''])}>
          Thêm giá trị
        </Button>
        <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>Lưu</Button>
      </Space>
    </div>
  );
}
