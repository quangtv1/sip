# Reusable Components

## StatusTag

Colored tag component for workflow states.

```tsx
import { Tag } from 'antd';

const statusConfig = {
  UPLOAD: { color: 'blue', label: 'Đang tải lên' },
  VALIDATING: { color: 'processing', label: 'Đang xác thực' },
  VALIDATED: { color: 'cyan', label: 'Đã xác thực' },
  APPROVED: { color: 'green', label: 'Đã phê duyệt' },
  PACKAGING: { color: 'processing', label: 'Đang đóng gói' },
  SIGNED: { color: 'purple', label: 'Đã ký' },
  DONE: { color: 'success', label: 'Hoàn thành' },
  REJECTED: { color: 'red', label: 'Đã từ chối' },
};

export function StatusTag({ status }) {
  const config = statusConfig[status];
  if (!config) return null;
  return (
    <Tag color={config.color}>
      {config.label}
    </Tag>
  );
}

// Usage:
<StatusTag status="VALIDATED" />  // → Cyan "Đã xác thực"
<StatusTag status="REJECTED" />   // → Red "Đã từ chối"
```

## SeverityBadge

Tag component for error/warning severity.

```tsx
import { Tag } from 'antd';
import { ExclamationOutlined, CheckCircleOutlined } from '@ant-design/icons';

export function SeverityBadge({ severity }) {
  const config = {
    ERROR: {
      color: 'red',
      icon: <ExclamationOutlined />,
      label: 'LỖI',
    },
    WARNING: {
      color: 'orange',
      icon: <ExclamationOutlined />,
      label: 'CẢNH BÁO',
    },
    SUCCESS: {
      color: 'green',
      icon: <CheckCircleOutlined />,
      label: 'THÀNH CÔNG',
    },
  };

  const c = config[severity];
  return (
    <Tag color={c.color} icon={c.icon}>
      {c.label}
    </Tag>
  );
}

// Usage:
<SeverityBadge severity="ERROR" />      // → Red with icon
<SeverityBadge severity="WARNING" />    // → Orange with icon
<SeverityBadge severity="SUCCESS" />    // → Green with icon
```

## MonoText

Typography component for code/monospace text.

```tsx
import { Typography } from 'antd';

export function MonoText({
  children,
  code = true,
  size = 'sm',
}: {
  children: React.ReactNode;
  code?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeMap = { sm: 11, md: 12, lg: 13 };

  return (
    <Typography.Text
      code={code}
      style={{
        fontFamily: "'IBM Plex Mono'",
        fontSize: sizeMap[size],
        color: '#0D1B2A',
      }}
    >
      {children}
    </Typography.Text>
  );
}

// Usage:
<MonoText>{dossier.checksum}</MonoText>          // → "a1b2c3d4..."
<MonoText size="lg">{dossier.code}</MonoText>    // → "HS0001"
<MonoText code={false}>Plain mono text</MonoText>
```

## EditableCell (Table)

Table cell with inline editing capability.

```tsx
import { Input, InputNumber, Select, Form, DatePicker } from 'antd';

export function EditableCell({
  editing,
  dataIndex,
  title,
  inputType,
  record,
  index,
  children,
  ...restProps
}) {
  let inputNode;

  if (inputType === 'number') {
    inputNode = <InputNumber />;
  } else if (inputType === 'select') {
    inputNode = (
      <Select
        options={[
          { value: 'A', label: 'Mục A' },
          { value: 'B', label: 'Mục B' },
        ]}
      />
    );
  } else if (inputType === 'date') {
    inputNode = <DatePicker format="DD/MM/YYYY" />;
  } else {
    inputNode = <Input />;
  }

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[
            {
              required: true,
              message: `${title} là bắt buộc`,
            },
          ]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
}

// Usage in Table:
const columns = [
  {
    title: 'Tên',
    dataIndex: 'name',
    key: 'name',
    editable: true,
    inputType: 'text',
  },
  {
    title: 'Số trang',
    dataIndex: 'pages',
    key: 'pages',
    editable: true,
    inputType: 'number',
  },
];
```

## ConfirmAction

Modal confirmation wrapper for destructive actions.

```tsx
import { Modal, Button, message } from 'antd';

export function ConfirmAction({
  title,
  description,
  okText = 'Xác nhận',
  cancelText = 'Hủy',
  okButtonType = 'primary',
  danger = false,
  onOk,
  children,
}: {
  title: string;
  description: string;
  okText?: string;
  cancelText?: string;
  okButtonType?: 'primary' | 'default' | 'dashed' | 'text' | 'link';
  danger?: boolean;
  onOk: () => Promise<void> | void;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onOk();
      message.success('Hành động thành công');
    } catch (err) {
      message.error(`Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={() => {
        Modal.confirm({
          title,
          content: description,
          okText,
          cancelText,
          okButtonType: danger ? 'primary' : okButtonType,
          okButtonProps: { danger },
          onOk: handleConfirm,
        });
      }}
      loading={loading}
      {...(danger && { danger: true })}
    >
      {children}
    </Button>
  );
}

// Usage:
<ConfirmAction
  title="Xóa hồ sơ?"
  description="Hành động này không thể hoàn tác. Bạn chắc chắn muốn xóa?"
  okText="Xóa"
  danger={true}
  onOk={async () => {
    await api.deleteDossier(dossier.id);
  }}
>
  Xóa hồ sơ
</ConfirmAction>
```

## LoadingOverlay

Full-screen loading indicator.

```tsx
import { Spin, Modal } from 'antd';

export function LoadingOverlay({
  visible,
  message = 'Đang xử lý...',
  tip,
}) {
  return (
    <Modal
      open={visible}
      footer={null}
      closable={false}
      centered
      bodyStyle={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: 24,
      }}
    >
      <Spin
        size="large"
        tip={tip || message}
        indicator={
          <div
            style={{
              width: 50,
              height: 50,
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #0E9F8E',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        }
      />
    </Modal>
  );
}

// Usage:
const [loading, setLoading] = useState(false);

<LoadingOverlay visible={loading} message="Đang đóng gói..." />
```

## ErrorAlert

Styled error message with action.

```tsx
import { Alert, Space, Button } from 'antd';

export function ErrorAlert({
  error,
  onRetry,
  onDismiss,
}: {
  error: Error | string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <Alert
      type="error"
      showIcon
      message={typeof error === 'string' ? error : error.message}
      action={
        <Space>
          {onRetry && <Button size="small" onClick={onRetry}>Thử lại</Button>}
          {onDismiss && <Button size="small" onClick={onDismiss}>Đóng</Button>}
        </Space>
      }
    />
  );
}

// Usage:
const [error, setError] = useState(null);

<ErrorAlert
  error={error}
  onRetry={() => retryOperation()}
  onDismiss={() => setError(null)}
/>
```

## SuccessAlert

Styled success message.

```tsx
import { Alert, Space, Button } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

export function SuccessAlert({
  message,
  description,
  onClose,
}: {
  message: string;
  description?: string;
  onClose?: () => void;
}) {
  return (
    <Alert
      type="success"
      icon={<CheckCircleOutlined />}
      message={message}
      description={description}
      showIcon
      closable={!!onClose}
      onClose={onClose}
    />
  );
}

// Usage:
<SuccessAlert
  message="Hồ sơ đã được phê duyệt"
  description="Mã hồ sơ: HS0001"
  onClose={() => setShowSuccess(false)}
/>
```

## StepBadge

Circular numbered badge for steps.

```tsx
export function StepBadge({
  step,
  done = false,
}: {
  step: number;
  done?: boolean;
}) {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: done ? '#1A7A5E' : '#0E9F8E',
        color: 'white',
        fontSize: 11,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'IBM Plex Mono'",
        flexShrink: 0,
      }}
    >
      {done ? '✓' : step}
    </div>
  );
}

// Usage:
<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
  <StepBadge step={1} />
  <span>Tải lên PDF</span>
</div>

<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
  <StepBadge step={2} done />
  <span>Xác thực (hoàn thành)</span>
</div>
```

## FormSection

Card wrapper for form sections.

```tsx
import { Card, Form } from 'antd';

export function FormSection({
  title,
  children,
  required = false,
}: {
  title: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <Card
      style={{ marginBottom: '1rem' }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {required && <span style={{ color: '#C0392B' }}>*</span>}
          <span>{title}</span>
        </div>
      }
    >
      <Form layout="vertical">
        {children}
      </Form>
    </Card>
  );
}

// Usage:
<FormSection title="Thông tin cơ bản" required>
  <Form.Item name="code" label="Mã hồ sơ">
    <Input />
  </Form.Item>
</FormSection>
```

## EmptyState

Customized empty state.

```tsx
import { Empty, Button } from 'antd';

export function EmptyState({
  message = 'Không có dữ liệu',
  description,
  action,
}: {
  message?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <Empty
      description={
        <div>
          <p style={{ fontSize: 14, fontWeight: 500 }}>{message}</p>
          {description && (
            <p style={{ fontSize: 12, color: '#6B7C8D', marginTop: 4 }}>
              {description}
            </p>
          )}
        </div>
      }
    >
      {action && (
        <Button type="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Empty>
  );
}

// Usage:
<EmptyState
  message="Chưa có hồ sơ nào"
  description="Bắt đầu bằng cách tải lên hồ sơ mới"
  action={{ label: 'Tải lên', onClick: handleUpload }}
/>
```

---

**Bộ component tái sử dụng giúp:**
- Nhất quán giao diện trên toàn ứng dụng
- Giảm lặp code
- Dễ bảo trì và cập nhật design
- Tăng tốc độ phát triển feature mới
