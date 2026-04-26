# Form & Validation Patterns

## Basic Form Layout

```tsx
import { Form, Input, DatePicker, Select, Button, Space, Card } from 'antd';

export function DossierForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await api.saveDossier(values);
      message.success('Lưu thành công');
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Thông tin hồ sơ">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          code: '',
          title: '',
          startDate: null,
          endDate: null,
          trustLevel: 'MEDIUM',
        }}
      >
        {/* Text Input */}
        <Form.Item
          name="code"
          label="Mã hồ sơ"
          rules={[
            { required: true, message: 'Mã hồ sơ là bắt buộc' },
            {
              pattern: /^[A-Z0-9]+$/,
              message: 'Chỉ dùng chữ in hoa và số',
            },
            {
              min: 4,
              message: 'Tối thiểu 4 ký tự',
            },
          ]}
        >
          <Input placeholder="VD: HS0001" />
        </Form.Item>

        {/* Text Area */}
        <Form.Item
          name="title"
          label="Tiêu đề"
          rules={[{ required: true, message: 'Tiêu đề là bắt buộc' }]}
        >
          <Input.TextArea placeholder="Tên hồ sơ" rows={3} />
        </Form.Item>

        {/* Date Range */}
        <Form.Item
          name="startDate"
          label="Ngày bắt đầu"
          rules={[{ required: true, message: 'Ngày bắt đầu là bắt buộc' }]}
        >
          <DatePicker format="DD/MM/YYYY" placeholder="Chọn ngày" />
        </Form.Item>

        <Form.Item
          name="endDate"
          label="Ngày kết thúc"
          rules={[
            { required: true, message: 'Ngày kết thúc là bắt buộc' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (
                  !value ||
                  getFieldValue('startDate') <= value
                ) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error('Ngày kết thúc phải >= ngày bắt đầu')
                );
              },
            }),
          ]}
        >
          <DatePicker format="DD/MM/YYYY" />
        </Form.Item>

        {/* Select Dropdown */}
        <Form.Item
          name="trustLevel"
          label="Mức độ tin cậy"
          rules={[{ required: true, message: 'Bắt buộc' }]}
        >
          <Select
            options={[
              { value: 'HIGH', label: 'Cao' },
              { value: 'MEDIUM', label: 'Trung bình' },
              { value: 'LOW', label: 'Thấp' },
            ]}
          />
        </Form.Item>

        {/* Buttons */}
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Lưu
            </Button>
            <Button onClick={() => form.resetFields()}>
              Reset
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
```

## Validation Rules

### Built-in Rules

```tsx
// Required field
rules={[
  { required: true, message: 'Bắt buộc' },
]}

// Pattern (regex)
rules={[
  { pattern: /^[A-Z0-9]+$/, message: 'Chỉ in hoa & số' },
]}

// Min/Max length
rules={[
  { min: 4, message: 'Tối thiểu 4 ký tự' },
  { max: 50, message: 'Tối đa 50 ký tự' },
]}

// Email
rules={[
  { type: 'email', message: 'Email không hợp lệ' },
]}

// Number
rules={[
  { type: 'number', message: 'Phải là số' },
  { type: 'number', min: 0, max: 1000, message: 'Từ 0 đến 1000' },
]}

// Enum
rules={[
  { enum: ['UPLOAD', 'VALIDATED', 'APPROVED'], message: 'Giá trị không hợp lệ' },
]}

// Custom validator
rules={[
  {
    validator: async (_, value) => {
      if (!value || isValidCode(value)) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('Mã không hợp lệ'));
    },
  },
]}

// Cross-field validation
rules={[
  ({ getFieldValue }) => ({
    validator(_, value) {
      if (!value || getFieldValue('password') === value) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('Mật khẩu không khớp'));
    },
  }),
]}
```

## Conditional Validation

Show/hide fields based on other field values.

```tsx
import { Form, Input, Checkbox } from 'antd';

<Form>
  <Form.Item
    name="isSpecial"
    valuePropName="checked"
  >
    <Checkbox>Hồ sơ đặc biệt</Checkbox>
  </Form.Item>

  {/* Show only if isSpecial is checked */}
  <Form.Item noStyle shouldUpdate={(prevValues, currentValues) =>
    prevValues.isSpecial !== currentValues.isSpecial
  }>
    {({ getFieldValue }) =>
      getFieldValue('isSpecial') ? (
        <Form.Item
          name="specialReason"
          label="Lý do đặc biệt"
          rules={[{ required: true, message: 'Bắt buộc' }]}
        >
          <Input.TextArea />
        </Form.Item>
      ) : null
    }
  </Form.Item>
</Form>
```

## Dynamic Fields (Add/Remove)

```tsx
import { Form, Input, Button, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

<Form.List name="documents">
  {(fields, { add, remove }) => (
    <>
      {fields.map(({ key, name, ...restField }) => (
        <Space
          key={key}
          style={{ display: 'flex', marginBottom: 8 }}
          align="baseline"
        >
          <Form.Item
            {...restField}
            name={[name, 'docName']}
            rules={[{ required: true, message: 'Bắt buộc' }]}
          >
            <Input placeholder="Tên văn bản" />
          </Form.Item>

          <Form.Item
            {...restField}
            name={[name, 'pages']}
            rules={[
              { required: true, message: 'Bắt buộc' },
              { type: 'number', message: 'Phải là số' },
            ]}
          >
            <Input type="number" placeholder="Số trang" />
          </Form.Item>

          <MinusCircleOutlined onClick={() => remove(name)} />
        </Space>
      ))}

      <Form.Item>
        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
          Thêm văn bản
        </Button>
      </Form.Item>
    </>
  )}
</Form.List>
```

## File Upload Validation

```tsx
import { Form, Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

<Form.Item
  name="file"
  rules={[
    { required: true, message: 'Tải lên file' },
    {
      validator: (_, fileList) => {
        if (!fileList || fileList.length === 0) {
          return Promise.reject('Chọn file');
        }
        const file = fileList[0];
        // Check file type
        const isZip = file.type === 'application/zip' ||
                      file.type === 'application/x-zip-compressed' ||
                      file.name.endsWith('.zip');
        if (!isZip) {
          return Promise.reject('Chỉ chấp nhận file .zip');
        }
        // Check file size (50MB)
        const isSmall = file.size / 1024 / 1024 < 50;
        if (!isSmall) {
          return Promise.reject('File quá lớn (max 50MB)');
        }
        return Promise.resolve();
      },
    },
  ]}
  valuePropName="fileList"
  getValueFromEvent={(e) => e.fileList}
>
  <Upload.Dragger
    accept=".zip"
    maxCount={1}
  >
    <p className="ant-upload-drag-icon">
      <InboxOutlined />
    </p>
    <p>Kéo & thả file .zip vào đây</p>
    <p>(tối đa 50MB)</p>
  </Upload.Dragger>
</Form.Item>
```

## Form Layout Variants

### Vertical Layout (Default)

```tsx
<Form layout="vertical">
  {/* Label above input */}
  <Form.Item label="Mã hồ sơ" name="code">
    <Input />
  </Form.Item>
</Form>
```

### Horizontal Layout

```tsx
<Form layout="horizontal" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
  {/* Label left, input right */}
  <Form.Item label="Mã hồ sơ" name="code">
    <Input />
  </Form.Item>
</Form>
```

### Inline Layout

```tsx
<Form layout="inline">
  {/* Label & input inline */}
  <Form.Item label="Mã hồ sơ" name="code">
    <Input style={{ width: 200 }} />
  </Form.Item>
</Form>
```

## Real-time Validation

```tsx
<Form
  onValuesChange={(changedValues, allValues) => {
    // Validate in real-time as user types
    console.log('Changed:', changedValues);
    console.log('All values:', allValues);
  }}
>
  <Form.Item
    name="email"
    rules={[
      { type: 'email', message: 'Email không hợp lệ' },
    ]}
  >
    <Input placeholder="Email" />
  </Form.Item>
</Form>
```

## Form Error Display

### Show All Errors at Once

```tsx
const [form] = Form.useForm();

const onFinishFailed = (errorInfo) => {
  console.log('Failed:', errorInfo);
  // errorInfo.errorFields contains all field errors
  // Automatically shown by Form
};

<Form
  onFinish={onFinish}
  onFinishFailed={onFinishFailed}
>
  {/* Errors display inline under each field */}
</Form>
```

### Custom Error Styling

```tsx
const [form] = Form.useForm();

<Form
  form={form}
  onFinish={onFinish}
>
  <Form.Item
    name="code"
    label="Mã hồ sơ"
    validateStatus={codeError ? 'error' : ''}
    help={codeError}
  >
    <Input />
  </Form.Item>
</Form>
```

### Scroll to First Error

```tsx
const onFinishFailed = (errorInfo) => {
  // Scroll to first error field
  const firstErrorField = errorInfo.errorFields[0];
  if (firstErrorField) {
    form.scrollToField(firstErrorField.name);
  }
};

<Form
  scrollToFirstError
  onFinishFailed={onFinishFailed}
>
  {/* Automatically scrolls to first error */}
</Form>
```

## Form Reset & Clear

```tsx
const [form] = Form.useForm();

// Clear single field
<Button onClick={() => form.setFieldValue('code', '')}>
  Clear Code
</Button>

// Reset to initial values
<Button onClick={() => form.resetFields()}>
  Reset
</Button>

// Clear all fields
<Button onClick={() => form.resetFields(['code', 'title', 'startDate'])}>
  Clear Selected
</Button>

// Set form values programmatically
<Button onClick={() => {
  form.setFieldsValue({
    code: 'HS0001',
    title: 'Auto-filled',
  });
}}>
  Auto-fill
</Button>
```

## Advanced: Async Validation

```tsx
// Check if code already exists (async API call)
rules={[
  {
    validator: async (_, value) => {
      if (!value) return Promise.resolve();
      try {
        const exists = await api.checkCodeExists(value);
        if (exists) {
          return Promise.reject(new Error('Mã hồ sơ đã tồn tại'));
        }
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    },
  },
]}
```

## Integration with Error Panel

```tsx
// Combine form validation with error panel
const [formErrors, setFormErrors] = useState([]);

const onFinishFailed = (errorInfo) => {
  const errors = errorInfo.errorFields.map(field => ({
    field: field.name.join('.'),
    message: field.errors[0],
    severity: 'ERROR',
  }));
  setFormErrors(errors);
};

<>
  {/* Error Panel */}
  {formErrors.length > 0 && (
    <Alert
      type="error"
      message={`${formErrors.length} lỗi`}
      style={{ marginBottom: '1rem' }}
    />
  )}

  {/* Form */}
  <Form onFinishFailed={onFinishFailed}>
    {/* Fields */}
  </Form>
</>
```

---

## Validation Checklist

- [ ] All required fields have `required: true` rule
- [ ] Format validation (email, phone, date, enum)
- [ ] Length/range validation (min, max)
- [ ] Pattern validation (regex)
- [ ] Cross-field validation (date range, password match)
- [ ] Async validation (API calls)
- [ ] File upload validation (type, size)
- [ ] Errors show near field (Form.Item)
- [ ] Submit disabled while validating
- [ ] Success/error notification on submit
- [ ] Form reset option available
