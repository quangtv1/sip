/**
 * Enum management tab — view and edit the 8 dynamic enum value lists.
 * Each enum is shown as a collapsible panel with an editable ordered list.
 */
import { useState, useEffect, useCallback } from 'react';
import { Collapse, Button, Input, Space, Spin, Alert, Typography, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import apiClient from '../../config/api-client.js';

const { Text } = Typography;

function EnumPanel({ name, displayName, initialValues, onSaved }) {
  const [values,  setValues]  = useState(initialValues);
  const [saving,  setSaving]  = useState(false);
  const [result,  setResult]  = useState(null);

  // sync if parent reloads
  useEffect(() => { setValues(initialValues); }, [initialValues]);

  function handleChange(idx, val) {
    setValues(prev => prev.map((v, i) => (i === idx ? val : v)));
  }

  function handleAdd() {
    setValues(prev => [...prev, '']);
  }

  function handleRemove(idx) {
    setValues(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    const trimmed = values.map(v => v.trim()).filter(Boolean);
    if (trimmed.length === 0) {
      setResult({ type: 'error', message: 'Danh sách không được rỗng' });
      return;
    }
    setSaving(true);
    setResult(null);
    try {
      await apiClient.put(`/config/enums/${name}`, { values: trimmed });
      setValues(trimmed);
      setResult({ type: 'success', message: 'Đã lưu' });
      onSaved?.();
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error?.message || 'Lưu thất bại' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size={4}>
        {values.map((v, idx) => (
          <Space key={idx} style={{ width: '100%' }}>
            <Input
              value={v}
              onChange={e => handleChange(idx, e.target.value)}
              style={{ width: 340 }}
              size="small"
            />
            <Tooltip title="Xoá">
              <Button
                danger size="small" icon={<DeleteOutlined />}
                onClick={() => handleRemove(idx)}
                disabled={values.length <= 1}
              />
            </Tooltip>
          </Space>
        ))}
      </Space>

      {result && (
        <Alert type={result.type} message={result.message} showIcon
          style={{ marginTop: 8 }} closable onClose={() => setResult(null)} />
      )}

      <Space style={{ marginTop: 10 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={handleAdd}>
          Thêm giá trị
        </Button>
        <Button size="small" type="primary" icon={<SaveOutlined />}
          loading={saving} onClick={handleSave}>
          Lưu
        </Button>
      </Space>
    </div>
  );
}

export default function EnumManagementTab() {
  const [enums,   setEnums]   = useState({});
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchEnums = useCallback(() => {
    setLoading(true);
    setError(null);
    apiClient.get('/config/enums')
      .then(({ data }) => setEnums(data.data))
      .catch(() => setError('Không thể tải danh mục'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchEnums(); }, [fetchEnums]);

  const items = Object.entries(enums).map(([name, info]) => ({
    key: name,
    label: (
      <Space>
        <Text strong>{info.displayName}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>({info.values?.length || 0} giá trị)</Text>
      </Space>
    ),
    children: (
      <EnumPanel
        name={name}
        displayName={info.displayName}
        initialValues={info.values || []}
        onSaved={fetchEnums}
      />
    ),
  }));

  return (
    <Spin spinning={loading}>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchEnums} size="small">
          Tải lại
        </Button>
      </Space>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
      <Collapse accordion items={items} style={{ background: '#fff' }} />
    </Spin>
  );
}
