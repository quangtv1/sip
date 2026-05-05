/**
 * Sheet editor modal — manage N sheets and their field definitions for one profile.
 * Each sheet is a tab. Sheets can be added/renamed/removed.
 * Field table is inline-editable per sheet.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Modal, Tabs, Input, Button, Space, Table, Select, Spin, Alert,
  Popconfirm, Typography, Badge,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, RollbackOutlined } from '@ant-design/icons';
import apiClient from '../../config/api-client.js';

const { Text } = Typography;

const TYPE_OPTIONS = [
  'string','date','positiveInt','enum',
  'float','boolean','regex','email','url','range','dependent-enum',
].map(v => ({ value: v, label: v }));
const REQUIRED_OPTIONS = [{ value: true, label: 'true' }, { value: false, label: 'false' }, { value: 'conditional', label: 'conditional' }];
const SEVERITY_OPTIONS = ['ERROR','WARNING'].map(v => ({ value: v, label: v }));

/** Load all enum keys (global + per-standard overrides) for Tham số dropdown */
function useEnumKeys(profileId) {
  const [enumKeys, setEnumKeys] = useState([]);
  useEffect(() => {
    if (!profileId) return;
    apiClient.get(`/config/profiles/${profileId}/enums`)
      .then(({ data }) => {
        const obj = data.data || {};
        setEnumKeys([
          { value: null, label: '—' },
          ...Object.entries(obj).map(([name, info]) => ({
            value: name,
            label: info.displayName ? `${info.displayName} (${name})${info.overridden ? ' ★' : ''}` : name,
          })),
        ]);
      })
      .catch(() => {});
  }, [profileId]);
  return enumKeys;
}

function cellInput(val, setter, type, enumKeys = []) {
  if (type === 'type')     return <Select size="small" value={val} onChange={setter} options={TYPE_OPTIONS} style={{ width: 140 }} />;
  if (type === 'required') return <Select size="small" value={val} onChange={setter} options={REQUIRED_OPTIONS} style={{ width: 115 }} />;
  if (type === 'severity') return <Select size="small" value={val} onChange={setter} options={SEVERITY_OPTIONS} style={{ width: 85 }} />;
  if (type === 'enum')     return <Select size="small" value={val} onChange={setter} options={enumKeys} style={{ width: 220 }} showSearch optionFilterProp="label" />;
  return <Input size="small" value={val} onChange={e => setter(e.target.value)} style={{ width: type === 'wide' ? 190 : 120 }} />;
}

/** Inline param inputs based on field type */
function TypeParams({ row, onChange, enumKeys }) {
  if (row.type === 'enum') return cellInput(row.enumKey, v => onChange('enumKey', v), 'enum', enumKeys);
  if (row.type === 'regex') return <Input size="small" placeholder="pattern" value={row.pattern || ''} onChange={e => onChange('pattern', e.target.value)} style={{ width: 180 }} />;
  if (row.type === 'float' || row.type === 'range') return (
    <Space size={2}>
      <Input size="small" placeholder="min" value={row.min ?? ''} onChange={e => onChange('min', e.target.value === '' ? null : Number(e.target.value))} style={{ width: 60 }} />
      <Input size="small" placeholder="max" value={row.max ?? ''} onChange={e => onChange('max', e.target.value === '' ? null : Number(e.target.value))} style={{ width: 60 }} />
    </Space>
  );
  if (row.type === 'dependent-enum') return (
    <Input size="small" placeholder="fieldIndex" value={row.dependsOn?.fieldIndex ?? ''} style={{ width: 80 }}
      onChange={e => onChange('dependsOn', { ...row.dependsOn, fieldIndex: e.target.value === '' ? null : Number(e.target.value) })} />
  );
  return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
}

/** Editable field table for one sheet */
function SheetFieldEditor({ profileId, sheetName, fields, onChange, enumKeys, onSave, onReset, saving }) {
  function update(idx, key, val) {
    onChange(fields.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  }
  function addRow() {
    onChange([...fields, { index: fields.length, name: '', label: '', type: 'string', required: true, severity: 'ERROR', _key: Date.now() }]);
  }
  function removeRow(idx) {
    onChange(fields.filter((_, i) => i !== idx).map((r, i) => ({ ...r, index: i })));
  }

  const columns = [
    { title: '#',        width: 36,  render: (_, __, i) => i },
    { title: 'name',     width: 130, render: (_, r, i) => cellInput(r.name,     v => update(i,'name',v)) },
    { title: 'label',    width: 190, render: (_, r, i) => cellInput(r.label,    v => update(i,'label',v), 'wide') },
    { title: 'type',     width: 150, render: (_, r, i) => cellInput(r.type,     v => update(i,'type',v), 'type') },
    { title: 'required', width: 120, render: (_, r, i) => cellInput(r.required, v => update(i,'required',v), 'required') },
    { title: 'Tham số',  width: 240, render: (_, r, i) => <TypeParams row={r} onChange={(k,v) => update(i,k,v)} enumKeys={enumKeys} /> },
    { title: 'severity', width: 95,  render: (_, r, i) => cellInput(r.severity, v => update(i,'severity',v), 'severity') },
    { width: 44, render: (_, __, i) => (
      <Popconfirm title="Xoá trường này?" onConfirm={() => removeRow(i)} okText="Xoá" cancelText="Huỷ">
        <Button danger size="small" icon={<DeleteOutlined />} />
      </Popconfirm>
    )},
  ];

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={addRow}>Thêm trường</Button>
        <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave}>Lưu sheet</Button>
        <Popconfirm title="Khôi phục cấu trúc mặc định?" onConfirm={onReset} okText="Khôi phục" cancelText="Huỷ">
          <Button size="small" icon={<RollbackOutlined />} danger>Khôi phục mặc định</Button>
        </Popconfirm>
      </Space>
      <Table dataSource={fields} columns={columns} rowKey={r => r._key ?? r.index}
        pagination={false} size="small" scroll={{ x: 1000, y: 420 }} bordered style={{ fontSize: 12 }} />
    </div>
  );
}

export default function SheetEditorModal({ profileId, open, onClose, onSaved }) {
  const [sheets,      setSheets]      = useState([]);   // string[] from profile
  const [schemaMap,   setSchemaMap]   = useState({});   // { sheetName: fields[] }
  const [dirtySheets, setDirtySheets] = useState(new Set());
  const [activeSheet, setActiveSheet] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [alert,       setAlert]       = useState(null);
  const [addingSheet, setAddingSheet] = useState(false);
  const [newSheetName,setNewSheetName]= useState('');
  const enumKeys = useEnumKeys(profileId);

  const loadProfile = useCallback(() => {
    if (!profileId) return;
    setLoading(true); setAlert(null);
    apiClient.get(`/config/profiles/${profileId}`)
      .then(({ data }) => {
        const sheetList = data.data.sheets || [];
        setSheets(sheetList);
        setActiveSheet(prev => sheetList.includes(prev) ? prev : sheetList[0] || null);
      })
      .catch(() => setAlert({ type: 'error', message: 'Không tải được thông tin tiêu chuẩn' }))
      .finally(() => setLoading(false));
  }, [profileId]);

  useEffect(() => { if (open) { loadProfile(); setDirtySheets(new Set()); setSchemaMap({}); } }, [open, loadProfile]);

  const loadSheet = useCallback((sheetName) => {
    if (!profileId || !sheetName || schemaMap[sheetName]) return;
    apiClient.get(`/config/profiles/${profileId}/schema/${sheetName}`)
      .then(({ data }) => {
        const fields = data.data.fields.map(f => ({ ...f, _key: f.index }));
        setSchemaMap(prev => ({ ...prev, [sheetName]: fields }));
      })
      .catch(() => setAlert({ type: 'error', message: `Không tải được schema ${sheetName}` }));
  }, [profileId, schemaMap]);

  useEffect(() => { if (activeSheet) loadSheet(activeSheet); }, [activeSheet, loadSheet]);

  function markDirty(sheetName, fields) {
    setSchemaMap(prev => ({ ...prev, [sheetName]: fields }));
    setDirtySheets(prev => new Set([...prev, sheetName]));
  }

  async function saveSheet(sheetName) {
    const fields = (schemaMap[sheetName] || []).map((r, i) => ({ ...r, index: i }));
    setSaving(true); setAlert(null);
    try {
      await apiClient.put(`/config/profiles/${profileId}/schema/${sheetName}`, { fields });
      setDirtySheets(prev => { const n = new Set(prev); n.delete(sheetName); return n; });
      setAlert({ type: 'success', message: `Đã lưu sheet "${sheetName}"` });
      onSaved?.();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Lưu thất bại' });
    } finally { setSaving(false); }
  }

  async function resetSheet(sheetName) {
    setSaving(true); setAlert(null);
    try {
      await apiClient.post(`/config/profiles/${profileId}/schema/${sheetName}/reset`);
      setSchemaMap(prev => { const n = { ...prev }; delete n[sheetName]; return n; });
      setDirtySheets(prev => { const n = new Set(prev); n.delete(sheetName); return n; });
      loadSheet(sheetName);
      setAlert({ type: 'success', message: 'Đã khôi phục mặc định' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Khôi phục thất bại' });
    } finally { setSaving(false); }
  }

  async function addSheet() {
    const name = newSheetName.trim();
    if (!name) return;
    try {
      const newSheets = [...sheets, name];
      await apiClient.put(`/config/profiles/${profileId}`, { sheets: newSheets, name: profileId });
      setSheets(newSheets); setActiveSheet(name);
      setSchemaMap(prev => ({ ...prev, [name]: [] }));
      setAddingSheet(false); setNewSheetName('');
      onSaved?.();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Thêm sheet thất bại' });
    }
  }

  async function removeSheet(sheetName) {
    try {
      const newSheets = sheets.filter(s => s !== sheetName);
      // Fetch profile name first
      const prof = (await apiClient.get(`/config/profiles/${profileId}`)).data.data;
      await apiClient.put(`/config/profiles/${profileId}`, { sheets: newSheets, name: prof.name, description: prof.description });
      setSheets(newSheets);
      setSchemaMap(prev => { const n = { ...prev }; delete n[sheetName]; return n; });
      setDirtySheets(prev => { const n = new Set(prev); n.delete(sheetName); return n; });
      setActiveSheet(newSheets[0] || null);
      onSaved?.();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Xóa sheet thất bại' });
    }
  }

  const tabItems = sheets.map(name => ({
    key: name,
    label: (
      <Space size={4}>
        {name}
        {dirtySheets.has(name) && <Badge dot />}
      </Space>
    ),
    closable: sheets.length > 1,
    children: (
      <SheetFieldEditor
        profileId={profileId} sheetName={name}
        fields={schemaMap[name] || []}
        onChange={fields => markDirty(name, fields)}
        enumKeys={enumKeys}
        onSave={() => saveSheet(name)}
        onReset={() => resetSheet(name)}
        saving={saving}
      />
    ),
  }));

  return (
    <Modal
      title={`Cấu trúc bảng — ${profileId}`}
      open={open} onCancel={onClose} footer={null}
      width="90vw" style={{ maxWidth: 1200, top: 40 }}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {alert && <Alert type={alert.type} message={alert.message} showIcon closable
          style={{ marginBottom: 10 }} onClose={() => setAlert(null)} />}

        <Tabs
          type="editable-card"
          activeKey={activeSheet}
          onChange={setActiveSheet}
          onEdit={(key, action) => {
            if (action === 'add') { setAddingSheet(true); setNewSheetName(''); }
            if (action === 'remove') {
              Modal.confirm({
                title: `Xóa sheet "${key}"?`,
                content: 'Dữ liệu cấu trúc trong DB vẫn được giữ lại.',
                okText: 'Xóa', cancelText: 'Hủy', okButtonProps: { danger: true },
                onOk: () => removeSheet(key),
              });
            }
          }}
          items={tabItems}
        />

        {addingSheet && (
          <Space style={{ marginTop: 8 }}>
            <Input
              size="small" placeholder="Tên sheet mới (VD: Phu_luc)" autoFocus
              value={newSheetName} onChange={e => setNewSheetName(e.target.value)}
              onPressEnter={addSheet} style={{ width: 220 }}
            />
            <Button size="small" type="primary" onClick={addSheet}>Thêm</Button>
            <Button size="small" onClick={() => setAddingSheet(false)}>Hủy</Button>
          </Space>
        )}
      </Spin>
    </Modal>
  );
}
