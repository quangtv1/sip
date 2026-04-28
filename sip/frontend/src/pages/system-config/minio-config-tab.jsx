/**
 * MinIO configuration form tab.
 * Loads current config on mount, lets Admin test + save a new config.
 */
import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Switch, Button, Alert, Space, Spin } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import apiClient from '../../config/api-client.js';

export default function MinioConfigTab() {
  const [form]    = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [result,  setResult]  = useState(null); // { type: 'success'|'error', message }

  useEffect(() => {
    setLoading(true);
    apiClient.get('/config/minio')
      .then(({ data }) => form.setFieldsValue(data.data))
      .catch(() => setResult({ type: 'error', message: 'Không thể tải cấu hình MinIO' }))
      .finally(() => setLoading(false));
  }, [form]);

  async function handleSave(values) {
    setSaving(true);
    setResult(null);
    try {
      await apiClient.post('/config/minio', values);
      setResult({ type: 'success', message: 'Kết nối thành công — cấu hình đã được lưu' });
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error?.message || 'Kết nối thất bại' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Spin spinning={loading}>
      <Form form={form} layout="vertical" onFinish={handleSave} style={{ maxWidth: 480 }}>
        <Form.Item name="endpoint" label="Endpoint" rules={[{ required: true }]}>
          <Input placeholder="play.min.io" />
        </Form.Item>
        <Form.Item name="port" label="Port" rules={[{ required: true }]}>
          <InputNumber min={1} max={65535} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="useSSL" label="Dùng SSL" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="accessKey" label="Access Key" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="secretKey" label="Secret Key" rules={[{ required: true }]}>
          <Input.Password placeholder="***" />
        </Form.Item>

        {result && (
          <Form.Item>
            <Alert type={result.type} message={result.message} showIcon />
          </Form.Item>
        )}

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
              Kiểm tra và lưu kết nối
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Spin>
  );
}
