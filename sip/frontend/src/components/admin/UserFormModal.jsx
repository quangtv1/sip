/**
 * UserFormModal — create or edit a user (Admin only).
 * Props:
 *   open     {boolean}
 *   user     {object|null}   — null = create mode, object = edit mode
 *   onClose  {Function}
 *   onSaved  {Function(user)}
 */
import { useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import apiClient from '../../config/api-client.js';

const ROLES = ['Admin', 'Operator', 'Approver', 'Signer', 'Auditor'];

export default function UserFormModal({ open, user, onClose, onSaved }) {
  const [form] = Form.useForm();
  const isEdit = !!user;

  useEffect(() => {
    if (open) {
      form.setFieldsValue(isEdit
        ? { fullName: user.fullName, role: user.role }
        : { fullName: '', email: '', role: 'Operator', password: '' }
      );
    }
  }, [open, user, isEdit, form]);

  async function handleOk() {
    try {
      const values = await form.validateFields();
      let saved;
      if (isEdit) {
        const { data } = await apiClient.put(`/users/${user._id}`, { fullName: values.fullName, role: values.role });
        saved = data.data;
      } else {
        const { data } = await apiClient.post('/users', values);
        saved = data.data;
      }
      message.success(isEdit ? 'Đã cập nhật người dùng' : 'Đã tạo người dùng');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      if (err?.errorFields) return; // validation error — Form handles display
      message.error(err.response?.data?.error?.message || 'Thao tác thất bại');
    }
  }

  return (
    <Modal
      title={isEdit ? 'Cập nhật người dùng' : 'Tạo người dùng mới'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={isEdit ? 'Lưu' : 'Tạo'}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        {!isEdit && (
          <>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email hợp lệ là bắt buộc' }]}>
              <Input autoComplete="off" />
            </Form.Item>
            <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 8, message: 'Tối thiểu 8 ký tự' }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </>
        )}
        <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Bắt buộc' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
          <Select options={ROLES.map((r) => ({ value: r, label: r }))} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
