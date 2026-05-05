/**
 * ProfileDescTab  — "Danh mục" tab: renders EnumSection full-width.
 * AddSheetModal   — popup triggered by "+" tab only.
 */
import { useState } from 'react';
import { Button, Space, Alert, Modal, Form, Input, Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import apiClient from '../../config/api-client.js';
import EnumSection from './enum-section.jsx';

/* ── ProfileDescTab ───────────────────────────────────────────────────────── */
export function ProfileDescTab({ profile, profiles = [] }) {
  return <EnumSection profiles={profiles} defaultScopeId={profile.id} />;
}

/* ── AddSheetModal ────────────────────────────────────────────────────────── */
export function AddSheetModal({ open, profileId, existingSheets, onClose, onSaved }) {
  const [form]   = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  function afterClose() { form.resetFields(); setError(null); }

  async function handleOk() {
    let vals; try { vals = await form.validateFields(); } catch { return; }
    const name = vals.sheetName.trim();
    if (existingSheets.includes(name)) { setError(`Sheet "${name}" đã tồn tại`); return; }
    setSaving(true); setError(null);
    try {
      const { data } = await apiClient.get(`/config/profiles/${profileId}`);
      const cur = data.data;
      await apiClient.put(`/config/profiles/${profileId}`, {
        name: cur.name, description: cur.description,
        sheets: [...(cur.sheets || []), name],
      });
      onSaved?.(); onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Thêm sheet thất bại');
    } finally { setSaving(false); }
  }

  return (
    <Modal
      title={<Space size={8}><PlusOutlined style={{ color: '#6366f1' }} />Thêm sheet mới</Space>}
      open={open} onOk={handleOk} onCancel={onClose} afterClose={afterClose}
      confirmLoading={saving} okText="Thêm" cancelText="Hủy" width={380} destroyOnClose>
      <Divider style={{ margin: '12px 0' }} />
      <Form form={form} layout="vertical">
        <Form.Item label="Tên sheet" name="sheetName"
          rules={[
            { required: true, message: 'Nhập tên sheet' },
            { pattern: /^[A-Za-z0-9_]{1,40}$/, message: 'Chỉ dùng chữ, số, _ (tối đa 40 ký tự)' },
          ]}
          extra="VD: Ho_so, Van_ban, Phu_luc">
          <Input size="large" placeholder="Ten_Sheet" autoFocus onPressEnter={handleOk} />
        </Form.Item>
      </Form>
      {error && <Alert type="error" message={error} showIcon />}
    </Modal>
  );
}
