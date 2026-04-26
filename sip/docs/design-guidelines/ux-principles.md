# UX Principles

## 1. No Action Without Confirmation

All destructive or significant actions require explicit user confirmation via Modal.confirm().

### When to Use Confirmation
- Phê duyệt hồ sơ (state transition)
- Từ chối hồ sơ (return to previous state)
- Ký số (irreversible action)
- Xóa hồ sơ (data loss)
- Ghi đè dữ liệu (overwrite)

### Implementation

```tsx
import { Modal, Button, message } from 'antd';

const handleApprove = () => {
  Modal.confirm({
    title: 'Phê duyệt hồ sơ?',
    content: (
      <div>
        <p>Mã hồ sơ: <code>{dossier.code}</code></p>
        <p>Tiêu đề: {dossier.title}</p>
        <p>Hành động này không thể hoàn tác.</p>
      </div>
    ),
    okText: 'Phê duyệt',
    cancelText: 'Hủy',
    okButtonProps: { danger: false },
    onOk() {
      return api.approveDossier(dossier.id)
        .then(() => {
          message.success('Hồ sơ đã được phê duyệt');
          navigate('/queue');
        });
    },
    onCancel() {
      console.log('Phê duyệt bị hủy');
    },
  });
};

<Button type="primary" onClick={handleApprove}>
  Phê duyệt
</Button>
```

### Anatomy of Confirmation Modal
- **Title:** Action name (phủ định nếu cần) — "Xóa hồ sơ?"
- **Content:** Specific details (mã, tiêu đề), warning if needed
- **okText:** Positive action ("Phê duyệt", "Xóa")
- **cancelText:** Safe option ("Hủy", "Đóng")
- **okButtonProps:** `{ danger: true }` nếu destructive
- **Icon:** Optional, highlight risk level

---

## 2. Block on Error

Disable primary action buttons when blocking errors exist. Allow WARNINGs but prevent ERRORs.

### Implementation

```tsx
const hasErrors = dossier.errors.some(e => e.severity === 'ERROR');
const errorCount = dossier.errors.filter(e => e.severity === 'ERROR').length;

<Button
  type="primary"
  disabled={hasErrors}
  title={hasErrors ? `${errorCount} lỗi cần sửa` : undefined}
>
  Đóng gói
</Button>

// Alternative: Show error banner + disabled button
{hasErrors && (
  <Alert
    type="error"
    message={`${errorCount} lỗi ERROR cần sửa trước khi đóng gói`}
    showIcon
  />
)}

<Button type="primary" disabled={hasErrors}>
  Đóng gói
</Button>
```

### States to Block
| Action | Block If | Allow If |
|--------|----------|----------|
| Đóng gói | ERROR exists | Only WARNINGs |
| Phê duyệt | ERROR exists | Only WARNINGs |
| Ký số | Unsigned before | Already approved |
| Ghi đè | No confirmation | With modal confirm |

---

## 3. Visual Feedback

Provide immediate, clear feedback for all user actions.

### Loading State

```tsx
const [loading, setLoading] = useState(false);

const handlePackage = async () => {
  setLoading(true);
  try {
    const result = await packageDossier(dossier.id);
    message.success('Đóng gói thành công!');
    navigate(`/dossier/${dossier.id}`);
  } catch (err) {
    message.error(`Lỗi: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

<Button
  loading={loading}
  onClick={handlePackage}
  type="primary"
>
  {loading ? 'Đang đóng gói...' : 'Đóng gói'}
</Button>
```

### Success Notification

```tsx
import { message, notification } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

// Short message (auto-close after 3 seconds)
message.success('Hồ sơ HS0001 đã được phê duyệt');

// Long notification (user can dismiss)
notification.success({
  message: 'Đóng gói thành công',
  description: 'Hồ sơ HS0001 đã được đóng gói và sẵn sàng tải xuống',
  icon: <CheckCircleOutlined style={{ color: '#1A7A5E' }} />,
  duration: 5,
});
```

### Error Notification

```tsx
import { message, notification } from 'antd';
import { ExclamationOutlined } from '@ant-design/icons';

// Short error
message.error('Lỗi xác thực: 3 trường bắt buộc còn trống');

// Detailed error
notification.error({
  message: 'Xác thực thất bại',
  description: 'Kiểm tra lại các lỗi được liệt kê trong bảng.',
  icon: <ExclamationOutlined style={{ color: '#C0392B' }} />,
  duration: 0, // Don't auto-close
});
```

### Progress Indicator

```tsx
import { Progress, Spin } from 'antd';

{/* Linear progress */}
<Progress
  percent={60}
  status="active"
  strokeColor={{ '0%': '#0E9F8E', '100%': '#0A7266' }}
  format={percent => `${percent}% hoàn thành`}
/>

{/* Spinner with tip */}
<Spin
  spinning={true}
  tip="Đang xác thực..."
  indicator={<LoadingOutlined style={{ color: '#0E9F8E' }} />}
>
  <Card>Content will be covered while loading</Card>
</Spin>
```

---

## 4. Error Proximity

Show validation errors close to the input field, not just in a central error panel.

### Good: Form-level Errors

```tsx
import { Form, Input, Button, Alert } from 'antd';

<Form
  layout="vertical"
  onFinish={onFinish}
  onFinishFailed={onFinishFailed}
>
  <Form.Item
    name="code"
    label="Mã hồ sơ"
    rules={[
      { required: true, message: 'Mã hồ sơ là bắt buộc' },
      { pattern: /^[A-Z0-9]+$/, message: 'Chỉ dùng chữ in hoa và số' },
    ]}
  >
    <Input placeholder="VD: HS0001" />
  </Form.Item>

  {/* Error appears right below input ↑ */}

  <Form.Item
    name="title"
    label="Tiêu đề"
    rules={[{ required: true, message: 'Tiêu đề là bắt buộc' }]}
  >
    <Input placeholder="Tên hồ sơ" />
  </Form.Item>

  <Button type="primary" htmlType="submit" block>
    Lưu
  </Button>
</Form>
```

### Also: Table Cell Errors

```tsx
{/* Highlight error row in red */}
<Table
  columns={columns}
  dataSource={data}
  rowClassName={(record) =>
    record.errors?.length > 0 ? 'error-row' : ''
  }
/>

<style>{`
  .error-row {
    background-color: #FEE8E8 !important;
  }
`}</style>

{/* Tooltip on cell showing error */}
<Tooltip title={cell.error}>
  <span style={{ color: '#C0392B', cursor: 'help' }}>
    {cell.value}
  </span>
</Tooltip>
```

---

## 5. Readonly by Default, Edit Unlocked

Excel grid is read-only by default. User must click "Chỉnh sửa" to enable editing.

### Implementation

```tsx
const [isEditing, setIsEditing] = useState(false);

return (
  <div>
    <div style={{ marginBottom: '1rem' }}>
      <Button
        onClick={() => {
          if (isEditing) {
            // Save logic
            saveExcelData();
          }
          setIsEditing(!isEditing);
        }}
        type={isEditing ? 'primary' : 'default'}
      >
        {isEditing ? 'Lưu' : 'Chỉnh sửa'}
      </Button>
      {isEditing && (
        <Button
          onClick={() => setIsEditing(false)}
          type="text"
          style={{ marginLeft: '8px' }}
        >
          Hủy
        </Button>
      )}
    </div>

    <Table
      columns={columns.map(col => ({
        ...col,
        onCell: () => ({
          onClick: isEditing ? handleCellClick : undefined,
          style: isEditing
            ? { cursor: 'cell' }
            : { cursor: 'default' },
        }),
      }))}
      dataSource={data}
      rowClassName={(record) =>
        isEditing ? 'editable-table' : 'readonly-table'
      }
    />
  </div>
);
```

### Visual Indicator

```tsx
{/* Read-only state */}
<div style={{ background: '#F7F8FA', padding: '1rem', opacity: 0.7 }}>
  Dữ liệu được bảo vệ. Bấm "Chỉnh sửa" để thay đổi.
</div>

{/* Editing state */}
<div style={{ background: '#E0F5F2', padding: '1rem', borderLeft: '4px solid #0E9F8E' }}>
  Bạn đang chỉnh sửa. Bấm "Lưu" để xác nhận.
</div>
```

---

## 6. Navy for Authority

Use Navy (#0D1B2A) in header, footer, and primary buttons to convey official, formal authority.

### Color Intent

| Component | Color | Reason |
|-----------|-------|--------|
| Header | Navy | Official, formal, authoritative |
| Footer | Navy | Grounds page, stability |
| Primary btn | Teal | Action, positive change |
| Cancel btn | Default | Neutral, safe exit |
| Danger btn | Red | Warning, destructive |
| Sidebar | White | Support, secondary |

### Implementation

```tsx
// Header — Navy for authority
<Header style={{ background: '#0D1B2A' }}>
  {/* Content */}
</Header>

// Primary action — Teal for engagement
<Button type="primary" style={{ background: '#0E9F8E' }}>
  Đóng gói
</Button>

// Cancel/secondary — Gray for neutral
<Button type="default">
  Hủy
</Button>

// Dangerous action — Red for warning
<Button danger>
  Xóa hồ sơ
</Button>
```

---

## 7. Accessibility & Inclusive Design

### Keyboard Navigation
- All interactive elements are focusable (Tab key)
- Logical Tab order (left-to-right, top-to-bottom)
- Escape key closes modals/dropdowns
- Enter key submits forms

### Color Contrast
- Text: 4.5:1 contrast ratio (WCAG AA)
- Icons: 3:1 minimum
- Never use color alone to convey information

### Screen Readers
- Semantic HTML (button, input, label)
- `aria-label` for icon-only buttons
- `aria-describedby` for complex form items
- `role="alert"` for error messages

### Motion & Animation
- Respect `prefers-reduced-motion` media query
- Animations < 300ms
- No flashing > 3 times per second

```tsx
// Respect reduced motion preference
const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const prefersReducedMotion = mediaQuery.matches;

const duration = prefersReducedMotion ? 0 : 300;

<Button
  onClick={handleClick}
  style={{
    transition: `all ${duration}ms ease`,
  }}
>
  Action
</Button>
```

---

## Summary: UX Checklist

- [ ] All destructive actions require confirmation modal
- [ ] Primary buttons disabled when errors exist
- [ ] Loading states show for async operations
- [ ] Errors display near the input field (form validation)
- [ ] Excel grid read-only by default, "Chỉnh sửa" to unlock
- [ ] Navy used for header, footer, formal authority
- [ ] Teal for primary actions (CTA)
- [ ] All buttons/links keyboard accessible
- [ ] Color contrast meets WCAG AA
- [ ] No flashing or distracting animations
