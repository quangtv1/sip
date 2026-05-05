/**
 * Schema management tab — view and edit field definitions per validation profile.
 * Profile selector at top; each profile has primary/secondary sheets.
 * Save pushes to PUT /api/config/profiles/:id/schema/:sheetType.
 */
import { useState, useEffect, useCallback } from 'react';
import { Tabs, Table, Input, Select, Button, Space, Spin, Alert, Popconfirm, Typography, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, RollbackOutlined } from '@ant-design/icons';
import apiClient from '../../config/api-client.js';

const { Text } = Typography;

const TYPE_OPTIONS = [
  'string','date','positiveInt','enum',
  'float','boolean','regex','email','url','range','dependent-enum',
].map(v => ({ value: v, label: v }));
const REQUIRED_OPTIONS = [{ value: true, label: 'true' }, { value: false, label: 'false' }, { value: 'conditional', label: 'conditional' }];
const SEVERITY_OPTIONS = ['ERROR','WARNING'].map(v => ({ value: v, label: v }));

/** Load enum list from API so it includes custom enums and shows Vietnamese display names */
function useEnumKeys() {
  const [enumKeys, setEnumKeys] = useState([]);
  useEffect(() => {
    apiClient.get('/config/enums')
      .then(({ data }) => {
        // API returns an object keyed by enum name: { ENUM_NAME: { displayName, values }, ... }
        const obj = data.data || {};
        const list = Object.entries(obj).map(([name, info]) => ({
          name,
          displayName: info.displayName,
        }));
        setEnumKeys([
          { value: null, label: '—' },
          ...list.map(e => ({ value: e.name, label: e.displayName ? `${e.displayName} (${e.name})` : e.name })),
        ]);
      })
      .catch(() => {}); // fallback: empty — user can still type manually
  }, []);
  return enumKeys;
}

function cell(val, setter, type = 'text', enumKeys = []) {
  if (type === 'select-type') return <Select size="small" value={val} onChange={setter} options={TYPE_OPTIONS} style={{ width: 140 }} />;
  if (type === 'select-req')  return <Select size="small" value={val} onChange={setter} options={REQUIRED_OPTIONS} style={{ width: 120 }} />;
  if (type === 'select-sev')  return <Select size="small" value={val} onChange={setter} options={SEVERITY_OPTIONS} style={{ width: 90 }} />;
  if (type === 'select-enum') return <Select size="small" value={val} onChange={setter} options={enumKeys} style={{ width: 230 }} showSearch optionFilterProp="label" />;
  return <Input size="small" value={val} onChange={e => setter(e.target.value)} style={{ width: type === 'wide' ? 200 : 130 }} />;
}

/** Extra param inputs shown based on field type */
function TypeParamInputs({ row, onChange, enumKeys }) {
  const { type } = row;
  if (type === 'enum') {
    return cell(row.enumKey, v => onChange('enumKey', v), 'select-enum', enumKeys);
  }
  if (type === 'regex') {
    return <Input size="small" placeholder="pattern (regex)" value={row.pattern || ''} onChange={e => onChange('pattern', e.target.value)} style={{ width: 200 }} />;
  }
  if (type === 'float') {
    return (
      <Space size={2}>
        <Input size="small" placeholder="min" value={row.min ?? ''} onChange={e => onChange('min', e.target.value === '' ? null : Number(e.target.value))} style={{ width: 70 }} />
        <Input size="small" placeholder="max" value={row.max ?? ''} onChange={e => onChange('max', e.target.value === '' ? null : Number(e.target.value))} style={{ width: 70 }} />
      </Space>
    );
  }
  if (type === 'range') {
    return (
      <Space size={2}>
        <Input size="small" placeholder="min*" value={row.min ?? ''} onChange={e => onChange('min', e.target.value === '' ? null : Number(e.target.value))} style={{ width: 60 }} />
        <Input size="small" placeholder="max*" value={row.max ?? ''} onChange={e => onChange('max', e.target.value === '' ? null : Number(e.target.value))} style={{ width: 60 }} />
      </Space>
    );
  }
  if (type === 'dependent-enum') {
    const vm = row.dependsOn?.valueMap || {};
    return (
      <Space direction="vertical" size={2} style={{ width: 220 }}>
        <Input
          size="small" placeholder="fieldIndex (số)"
          value={row.dependsOn?.fieldIndex ?? ''}
          onChange={e => {
            const fi = e.target.value === '' ? null : Number(e.target.value);
            onChange('dependsOn', { ...row.dependsOn, fieldIndex: fi });
          }}
          style={{ width: 140 }}
        />
        <Input.TextArea
          size="small" rows={2} placeholder={'{\n  "VAN_BAN": "LOAI_VB"\n}'}
          value={typeof vm === 'object' ? JSON.stringify(vm, null, 0) : vm}
          onChange={e => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange('dependsOn', { ...row.dependsOn, valueMap: parsed });
            } catch { /* ignore invalid JSON while typing */ }
          }}
          style={{ width: 220, fontSize: 11 }}
        />
      </Space>
    );
  }
  return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
}

/** Editor for one sheet (primary or secondary) scoped to a profile */
function SchemaSheetEditor({ profileId, sheetType }) {
  const [rows,      setRows]      = useState([]);
  const [sheetName, setSheetName] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [result,    setResult]    = useState(null);
  const enumKeys = useEnumKeys();

  const load = useCallback(() => {
    if (!profileId) return;
    setLoading(true); setResult(null);
    apiClient.get(`/config/profiles/${profileId}/schema/${sheetType}`)
      .then(({ data }) => {
        setSheetName(data.data.sheet || sheetType);
        setRows(data.data.fields.map(f => ({ ...f, _key: f.index })));
      })
      .catch(() => setResult({ type: 'error', message: 'Không thể tải cấu trúc bảng' }))
      .finally(() => setLoading(false));
  }, [profileId, sheetType]);

  useEffect(() => { load(); }, [load]);

  function update(idx, field, value) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function addRow() {
    setRows(prev => [...prev, { index: prev.length, name: '', label: '', type: 'string', required: true, severity: 'ERROR', _key: Date.now() }]);
  }

  function removeRow(idx) {
    setRows(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, index: i })));
  }

  async function handleSave() {
    const fields = rows.map((r, i) => ({ ...r, index: i }));
    setSaving(true); setResult(null);
    try {
      await apiClient.put(`/config/profiles/${profileId}/schema/${sheetType}`, { fields });
      setResult({ type: 'success', message: 'Đã lưu cấu trúc bảng' });
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error?.message || 'Lưu thất bại' });
    } finally { setSaving(false); }
  }

  async function handleReset() {
    setSaving(true); setResult(null);
    try {
      await apiClient.post(`/config/profiles/${profileId}/schema/${sheetType}/reset`);
      setResult({ type: 'success', message: 'Đã khôi phục cấu trúc mặc định' });
      load();
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error?.message || 'Khôi phục thất bại' });
    } finally { setSaving(false); }
  }

  const columns = [
    { title: '#',        dataIndex: 'index',    width: 40,  render: (_, __, i) => i },
    { title: 'name',     dataIndex: 'name',     width: 140, render: (v, _, i) => cell(v, val => update(i, 'name', val)) },
    { title: 'label',    dataIndex: 'label',    width: 200, render: (v, _, i) => cell(v, val => update(i, 'label', val), 'wide') },
    { title: 'type',     dataIndex: 'type',     width: 150, render: (v, _, i) => cell(v, val => update(i, 'type', val), 'select-type') },
    { title: 'required', dataIndex: 'required', width: 130, render: (v, _, i) => cell(v, val => update(i, 'required', val), 'select-req') },
    {
      title: 'Tham số', key: 'params', width: 260,
      render: (_, row, i) => (
        <TypeParamInputs
          row={row}
          onChange={(key, val) => update(i, key, val)}
          enumKeys={enumKeys}
        />
      ),
    },
    { title: 'severity', dataIndex: 'severity', width: 100, render: (v, _, i) => cell(v, val => update(i, 'severity', val), 'select-sev') },
    {
      title: '', width: 50,
      render: (_, __, i) => (
        <Popconfirm title="Xoá trường này?" onConfirm={() => removeRow(i)} okText="Xoá" cancelText="Huỷ">
          <Button danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <Space style={{ marginBottom: 10 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={addRow}>Thêm trường</Button>
        <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>Lưu</Button>
        <Popconfirm title="Khôi phục cấu trúc mặc định?" onConfirm={handleReset} okText="Khôi phục" cancelText="Huỷ">
          <Button size="small" icon={<RollbackOutlined />} danger>Khôi phục mặc định</Button>
        </Popconfirm>
      </Space>
      {result && <Alert type={result.type} message={result.message} showIcon closable style={{ marginBottom: 8 }} onClose={() => setResult(null)} />}
      <Table
        dataSource={rows} columns={columns} rowKey="_key"
        pagination={false} size="small" scroll={{ x: 900 }}
        bordered style={{ fontSize: 12 }}
      />
    </Spin>
  );
}

export default function SchemaManagementTab() {
  const [profiles,         setProfiles]         = useState([]);
  const [activeProfileId,  setActiveProfileId]  = useState('TT05');
  const [selectedProfile,  setSelectedProfile]  = useState('TT05');
  const [loadingProfiles,  setLoadingProfiles]  = useState(false);

  useEffect(() => {
    setLoadingProfiles(true);
    Promise.all([
      apiClient.get('/config/profiles'),
      apiClient.get('/config/active-profile'),
    ])
      .then(([pRes, aRes]) => {
        setProfiles(pRes.data.data);
        const id = aRes.data.data.profileId;
        setActiveProfileId(id);
        setSelectedProfile(id);
      })
      .finally(() => setLoadingProfiles(false));
  }, []);

  const profileOptions = profiles.map(p => ({
    value: p.id,
    label: (
      <Space>
        {p.id}
        {p.id === activeProfileId && <Tag color="green" style={{ fontSize: 11 }}>active</Tag>}
      </Space>
    ),
  }));

  const tabs = [
    {
      key: 'primary',
      label: 'Sheet chính',
      children: <SchemaSheetEditor profileId={selectedProfile} sheetType="primary" />,
    },
    {
      key: 'secondary',
      label: 'Sheet phụ',
      children: <SchemaSheetEditor profileId={selectedProfile} sheetType="secondary" />,
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <span style={{ fontWeight: 500 }}>Tiêu chuẩn:</span>
        <Select
          loading={loadingProfiles}
          value={selectedProfile}
          onChange={setSelectedProfile}
          options={profileOptions}
          style={{ width: 200 }}
          size="small"
        />
      </Space>
      <Tabs items={tabs} type="card" size="small" destroyInactiveTabPane />
    </div>
  );
}
