/**
 * Profile management tab — list, create, edit, delete validation profiles.
 * Each profile defines a name, primarySheet, secondarySheet, and description.
 * One profile is active system-wide (shown with "Đang dùng" tag).
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Space, Tag, Modal, Form, Input, Popconfirm,
  Spin, Alert, Typography, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import apiClient from '../../config/api-client.js';

const { Text } = Typography;

export default function ProfileManagementTab() {
  const [profiles,   setProfiles]   = useState([]);
  const [activeId,   setActiveId]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [result,     setResult]     = useState(null); // { type, message }
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = create, string = profile id
  const [form]                      = Form.useForm();

  const load = useCallback(() => {
    setLoading(true); setResult(null);
    Promise.all([
      apiClient.get('/config/profiles'),
      apiClient.get('/config/active-profile'),
    ])
      .then(([pRes, aRes]) => {
        setProfiles(pRes.data.data);
        setActiveId(aRes.data.data.profileId);
      })
      .catch(() => setResult({ type: 'error', message: 'Không thể tải danh sách tiêu chuẩn' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    form.resetFields();
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEdit(profile) {
    form.setFieldsValue({
      id:            profile.id,
      name:          profile.name,
      primarySheet:  profile.primarySheet,
      secondarySheet: profile.secondarySheet,
      description:   profile.description || '',
    });
    setEditTarget(profile.id);
    setModalOpen(true);
  }

  async function handleSave() {
    let values;
    try { values = await form.validateFields(); }
    catch { return; }

    setSaving(true); setResult(null);
    try {
      if (editTarget) {
        await apiClient.put(`/config/profiles/${editTarget}`, values);
      } else {
        await apiClient.post('/config/profiles', values);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Lỗi lưu tiêu chuẩn' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setSaving(true); setResult(null);
    try {
      await apiClient.delete(`/config/profiles/${id}`);
      load();
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Lỗi xóa tiêu chuẩn' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSetActive(id) {
    setSaving(true); setResult(null);
    try {
      await apiClient.put('/config/active-profile', { profileId: id });
      setActiveId(id);
      setResult({ type: 'success', message: `Đã đặt "${id}" làm tiêu chuẩn mặc định` });
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Lỗi đổi tiêu chuẩn' });
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { title: 'ID',          dataIndex: 'id',            key: 'id', width: 200,
      render: (id) => (
        <Space>
          <Text code>{id}</Text>
          {id === activeId && <Tag color="green" icon={<CheckCircleOutlined />}>Đang dùng</Tag>}
        </Space>
      ),
    },
    { title: 'Tên',         dataIndex: 'name',          key: 'name',          width: 180 },
    { title: 'Sheet chính', dataIndex: 'primarySheet',  key: 'primarySheet',  width: 130 },
    { title: 'Sheet phụ',   dataIndex: 'secondarySheet', key: 'secondarySheet', width: 130 },
    { title: 'Mô tả',       dataIndex: 'description',   key: 'description',   ellipsis: true },
    {
      title: 'Thao tác', key: 'actions', width: 200, align: 'center',
      render: (_, record) => (
        <Space>
          <Tooltip title="Chỉnh sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Đặt làm mặc định">
            <Button
              size="small" type={record.id === activeId ? 'primary' : 'default'}
              disabled={record.id === activeId || saving}
              onClick={() => handleSetActive(record.id)}
            >
              {record.id === activeId ? 'Đang dùng' : 'Dùng'}
            </Button>
          </Tooltip>
          <Popconfirm
            title={`Xóa profile "${record.id}"?`}
            disabled={record.id === activeId}
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa" cancelText="Hủy"
          >
            <Tooltip title={record.id === activeId ? 'Không thể xóa profile đang dùng' : 'Xóa'}>
              <Button
                size="small" danger icon={<DeleteOutlined />}
                disabled={record.id === activeId || saving}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {result && (
        <Alert
          type={result.type} message={result.message} showIcon closable
          style={{ marginBottom: 12 }} onClose={() => setResult(null)}
        />
      )}
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={loading}>
          Thêm tiêu chuẩn
        </Button>
      </Space>
      <Spin spinning={loading}>
        <Table
          rowKey="id"
          dataSource={profiles}
          columns={columns}
          pagination={false}
          size="small"
          bordered
        />
      </Spin>

      <Modal
        title={editTarget ? `Chỉnh sửa: ${editTarget}` : 'Thêm tiêu chuẩn mới'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="Lưu" cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            label="ID tiêu chuẩn" name="id"
            rules={[
              { required: true, message: 'Bắt buộc' },
              { pattern: /^[A-Za-z0-9_-]{2,20}$/, message: '2-20 ký tự: A-Z, a-z, 0-9, _, -' },
            ]}
          >
            <Input placeholder="VD: TT05, TT04, CUSTOM1" disabled={!!editTarget} />
          </Form.Item>
          <Form.Item label="Tên hiển thị" name="name" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <Input placeholder="VD: Thông tư 05/2014/TT-BNV" />
          </Form.Item>
          <Form.Item label="Sheet chính (Ho_so)" name="primarySheet" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <Input placeholder="VD: Ho_so" />
          </Form.Item>
          <Form.Item label="Sheet phụ (Van_ban)" name="secondarySheet" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <Input placeholder="VD: Van_ban" />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={2} placeholder="Mô tả ngắn về tiêu chuẩn..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
