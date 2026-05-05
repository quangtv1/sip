/**
 * SheetSection — inline per-row editing for one sheet's field definitions.
 * Read mode: table with edit + delete icons per row, "Thêm mới" at header.
 * Edit mode: only the active row shows inputs; save/cancel icons inline on that row.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Space, Select, Input, Popconfirm,
  Alert, Spin, Typography, Tag, Tooltip,
} from 'antd';
import {
  CheckOutlined, CloseOutlined, PlusOutlined,
  DeleteOutlined, RollbackOutlined, FormOutlined,
} from '@ant-design/icons';
import { ImportOutlined } from '@ant-design/icons';
import apiClient from '../../config/api-client.js';
import { TypeParamsEdit, TypeParamsView } from './sheet-type-params.jsx';
import SheetImportModal from './sheet-import-modal.jsx';

const { Text } = Typography;

const TYPE_OPTIONS = [
  'string','date','positiveInt','enum',
  'float','boolean','regex','email','url','range','dependent-enum',
].map(v => ({ value: v, label: v }));
const REQUIRED_OPTIONS = [
  { value: true,          label: 'true' },
  { value: false,         label: 'false' },
  { value: 'conditional', label: 'conditional' },
];
const SEVERITY_OPTIONS = ['ERROR','WARNING'].map(v => ({ value: v, label: v }));
const NEW_KEY = '__new__';

/** Load enum keys for the enum-type param dropdown */
function useEnumKeys(profileId) {
  const [enumKeys, setEnumKeys] = useState([{ value: null, label: '—' }]);
  useEffect(() => {
    if (!profileId) return;
    apiClient.get(`/config/profiles/${profileId}/enums`)
      .then(({ data }) => {
        const obj = data.data || {};
        setEnumKeys([
          { value: null, label: '—' },
          ...Object.entries(obj).map(([name, info]) => ({
            value: name,
            label: name,
          })),
        ]);
      })
      .catch(() => {});
  }, [profileId]);
  return enumKeys;
}

export default function SheetSection({ profileId, sheetName, accent }) {
  const [fields,   setFields]   = useState([]);
  const [editKey,  setEditKey]  = useState(null);   // row._key being edited, or NEW_KEY
  const [editVals, setEditVals] = useState(null);   // draft values for that row
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [alert,        setAlert]        = useState(null);
  const [importOpen,   setImportOpen]   = useState(false);
  const enumKeys = useEnumKeys(profileId);

  const loadFields = useCallback(() => {
    if (!profileId || !sheetName) return;
    setLoading(true);
    apiClient.get(`/config/profiles/${profileId}/schema/${sheetName}`)
      .then(({ data }) => {
        setFields((data.data?.fields || []).map((f, i) => ({ ...f, _key: String(i) })));
        setEditKey(null); setEditVals(null);
      })
      .catch(() => setAlert({ type: 'error', message: `Không tải được schema ${sheetName}` }))
      .finally(() => setLoading(false));
  }, [profileId, sheetName]);

  useEffect(() => { loadFields(); }, [loadFields]);

  function startEditRow(row) {
    setEditKey(row._key);
    setEditVals({ ...row });
    setAlert(null);
  }

  function cancelEdit() { setEditKey(null); setEditVals(null); }

  function addNewRow() {
    if (editKey) return;
    setEditKey(NEW_KEY);
    setEditVals({ _key: NEW_KEY, index: fields.length, name: '', label: '', type: 'string', required: true, severity: 'ERROR' });
    setAlert(null);
  }

  function updateVal(key, val) { setEditVals(prev => ({ ...prev, [key]: val })); }

  async function saveRow() {
    if (!editVals) return;
    const isNew = editKey === NEW_KEY;
    const updated = isNew
      ? [...fields, { ...editVals, index: fields.length }]
      : fields.map(f => f._key === editKey ? { ...editVals } : f);
    const payload = updated.map((r, i) => ({ ...r, index: i }));
    setSaving(true); setAlert(null);
    try {
      await apiClient.put(`/config/profiles/${profileId}/schema/${sheetName}`, { fields: payload });
      setFields(payload.map((f, i) => ({ ...f, _key: String(i) })));
      setEditKey(null); setEditVals(null);
      setAlert({ type: 'success', message: `Đã lưu` });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Lưu thất bại' });
    } finally { setSaving(false); }
  }

  async function deleteRow(key) {
    const updated = fields.filter(f => f._key !== key).map((r, i) => ({ ...r, index: i }));
    setSaving(true); setAlert(null);
    try {
      await apiClient.put(`/config/profiles/${profileId}/schema/${sheetName}`, { fields: updated });
      setFields(updated.map((f, i) => ({ ...f, _key: String(i) })));
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Xóa thất bại' });
    } finally { setSaving(false); }
  }

  async function handleReset() {
    setSaving(true); setAlert(null);
    try {
      await apiClient.post(`/config/profiles/${profileId}/schema/${sheetName}/reset`);
      loadFields();
      setAlert({ type: 'success', message: 'Đã khôi phục mặc định' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Khôi phục thất bại' });
    } finally { setSaving(false); }
  }

  /** Receive fields from import modal → save immediately */
  async function handleImport(importedFields) {
    setSaving(true); setAlert(null); setImportOpen(false);
    try {
      await apiClient.put(`/config/profiles/${profileId}/schema/${sheetName}`, { fields: importedFields });
      setFields(importedFields.map((f, i) => ({ ...f, _key: String(i) })));
      setEditKey(null); setEditVals(null);
      setAlert({ type: 'success', message: `Đã import ${importedFields.length} fields` });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Import thất bại' });
    } finally { setSaving(false); }
  }

  const isEditing = !!editKey;

  /** Rows: saved fields + the new-row draft appended when adding */
  const displayRows = editKey === NEW_KEY ? [...fields, editVals] : fields;

  // ── Column set — each render checks r._key === editKey before touching editVals
  // NOTE: do NOT use a cell(rKey, readEl, editEl) helper — JS evaluates both args
  //       eagerly, causing editVals.xxx to throw when editVals is null.
  const columns = [
    { title: '#',       width: 44,
      render: (_, __, i) => <Text type="secondary" style={{ fontSize: 14 }}>{i}</Text> },

    { title: 'name',    width: 160,
      render: (_, r) => r._key === editKey
        ? <Input size="small" value={editVals.name} autoFocus
            onChange={e => updateVal('name', e.target.value)} style={{ width: 140 }} />
        : <Text code style={{ fontSize: 14 }}>{r.name}</Text> },

    { title: 'label',   width: 200,
      render: (_, r) => r._key === editKey
        ? <Input size="small" value={editVals.label}
            onChange={e => updateVal('label', e.target.value)} style={{ width: 180 }} />
        : <Text style={{ fontSize: 14 }}>{r.label}</Text> },

    { title: 'type',    width: 150,
      render: (_, r) => r._key === editKey
        ? <Select size="small" value={editVals.type} onChange={v => updateVal('type', v)}
            options={TYPE_OPTIONS} style={{ width: 138 }} />
        : <Tag style={{ fontSize: 13 }}>{r.type}</Tag> },

    { title: 'required', width: 120,
      render: (_, r) => r._key === editKey
        ? <Select size="small" value={editVals.required} onChange={v => updateVal('required', v)}
            options={REQUIRED_OPTIONS} style={{ width: 108 }} />
        : <Text style={{ fontSize: 14 }}>{String(r.required)}</Text> },

    { title: 'Tham số', width: 230,
      render: (_, r) => r._key === editKey
        ? <TypeParamsEdit row={editVals} onChange={(k, v) => updateVal(k, v)} enumKeys={enumKeys} />
        : <TypeParamsView row={r} /> },

    { title: 'severity', width: 90,
      render: (_, r) => r._key === editKey
        ? <Select size="small" value={editVals.severity} onChange={v => updateVal('severity', v)}
            options={SEVERITY_OPTIONS} style={{ width: 78 }} />
        : <Tag color={r.severity === 'ERROR' ? 'red' : 'orange'} style={{ fontSize: 12 }}>{r.severity}</Tag> },

    { width: 72,
      render: (_, r) => r._key === editKey
        ? (
          <Space size={2}>
            <Tooltip title="Lưu"><Button type="text" size="small" icon={<CheckOutlined />}
              loading={saving} onClick={saveRow} style={{ color: '#22c55e' }} /></Tooltip>
            <Tooltip title="Hủy"><Button type="text" size="small" icon={<CloseOutlined />}
              onClick={cancelEdit} style={{ color: '#9ca3af' }} /></Tooltip>
          </Space>
        ) : (
          <Space size={2}>
            <Tooltip title="Chỉnh sửa"><Button type="text" size="small" icon={<FormOutlined />}
              onClick={() => startEditRow(r)} disabled={isEditing}
              style={{ color: isEditing ? '#d1d5db' : '#9ca3af' }} /></Tooltip>
            <Popconfirm title="Xóa trường này?" onConfirm={() => deleteRow(r._key)}
              okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} disabled={isEditing} />
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <div style={{
      marginBottom: 24, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      {/* ── Sheet header ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        background: isEditing ? `linear-gradient(90deg, ${accent}18, ${accent}08)` : '#f8fafc',
        borderBottom: `2px solid ${isEditing ? accent : '#e5e7eb'}`,
      }}>
        <Space size={8}>
          <Text style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: accent }}>
            {sheetName}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{fields.length} trường</Text>
          {isEditing && <Tag color="blue" style={{ fontSize: 11 }}>Đang chỉnh sửa</Tag>}
        </Space>
        <Space size={6}>
          <Button size="small" type="primary" icon={<PlusOutlined />}
            onClick={addNewRow} disabled={isEditing}>
            Thêm mới
          </Button>
          <Button size="small" icon={<ImportOutlined />}
            onClick={() => setImportOpen(true)} disabled={isEditing}>
            Import Excel
          </Button>
          <Popconfirm title="Khôi phục cấu trúc mặc định?" onConfirm={handleReset}
            okText="Khôi phục" cancelText="Hủy" disabled={isEditing}>
            <Button size="small" icon={<RollbackOutlined />} disabled={isEditing}>Mặc định</Button>
          </Popconfirm>
        </Space>
      </div>

      {/* ── Alert ───────────────────────────────────────────────────── */}
      {alert && (
        <Alert type={alert.type} message={alert.message} showIcon closable
          style={{ margin: '8px 16px 0' }} onClose={() => setAlert(null)} />
      )}

      {/* ── Table ───────────────────────────────────────────────────── */}
      <Spin spinning={loading}>
        <Table
          dataSource={displayRows}
          columns={columns}
          rowKey={r => r._key}
          pagination={false}
          size="middle"
          scroll={{ x: 1100 }}
          style={{ fontSize: 14 }}
          rowClassName={r => r._key === editKey ? 'ant-table-row-selected' : ''}
        />
      </Spin>

      <SheetImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}
