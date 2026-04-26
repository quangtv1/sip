# Screen Patterns

## Upload & Validation Flow

### Step 1: Upload Dragger

```tsx
import { Upload, Card, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

<Card>
  <Upload.Dragger
    name="file"
    accept=".zip,.xlsx,.pdf"
    beforeUpload={(file) => {
      const isValid = file.size <= 50 * 1024 * 1024; // 50MB limit
      if (!isValid) {
        message.error('File quá lớn (max 50MB)');
      }
      return isValid;
    }}
    showUploadList={true}
    maxCount={1}
    onChange={(info) => {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} tải lên thành công`);
      }
    }}
  >
    <p className="ant-upload-drag-icon">
      <InboxOutlined style={{ color: '#0E9F8E', fontSize: 48 }} />
    </p>
    <p className="ant-upload-text">Kéo & thả hồ sơ vào đây</p>
    <p className="ant-upload-hint">hoặc bấm để chọn file (.zip)</p>
  </Upload.Dragger>
</Card>
```

### Step 2: Steps Progress Indicator

```tsx
import { Steps, Card } from 'antd';

<Card style={{ marginBottom: '1rem' }}>
  <Steps
    current={currentStep}
    items={[
      {
        title: 'Tải lên PDF',
        description: 'Attachment/',
        status: currentStep > 0 ? 'finish' : 'process',
      },
      {
        title: 'Tải lên XLSX',
        description: 'Metadata/',
        status: currentStep > 1 ? 'finish' : currentStep === 1 ? 'process' : 'wait',
      },
      {
        title: 'Tùy chọn',
        description: 'Type, Hash',
        status: currentStep > 2 ? 'finish' : currentStep === 2 ? 'process' : 'wait',
      },
      {
        title: 'Đóng gói',
        description: 'Package',
        status: currentStep > 3 ? 'finish' : currentStep === 3 ? 'process' : 'wait',
      },
    ]}
  />
</Card>
```

### Step 3: Excel Data Grid (Editable Table)

```tsx
import { Table, Button, Space, Form } from 'antd';
import { EditOutlined, SaveOutlined } from '@ant-design/icons';

export function ExcelGrid({ data, columns }) {
  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState('');

  const isEditing = (record) => record.key === editingKey;

  const edit = (record) => {
    form.setFieldsValue(record);
    setEditingKey(record.key);
  };

  const cancel = () => {
    setEditingKey('');
  };

  const save = async (key) => {
    try {
      const row = await form.validateFields();
      // Update data source
      setEditingKey('');
    } catch (errInfo) {
      console.log('Validate Failed:', errInfo);
    }
  };

  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record) => ({
        record,
        inputType: col.inputType || 'text',
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  return (
    <Form form={form} component={false}>
      <Table
        components={{
          body: {
            cell: EditableCell,
          },
        }}
        bordered
        columns={mergedColumns}
        dataSource={data}
        rowClassName="editable-row"
        pagination={false}
        scroll={{ x: 800 }}
      />
    </Form>
  );
}
```

### Step 4: Tabs with Error Counts

```tsx
import { Tabs, Badge, Table, Tag } from 'antd';

<Tabs
  items={[
    {
      label: (
        <span>
          Hồ_sơ{' '}
          <Badge
            count={hoSoErrors}
            style={{
              backgroundColor: hoSoErrors > 0 ? '#D4860A' : '#1A7A5E',
            }}
          />
        </span>
      ),
      key: '1',
      children: <Table columns={hoSoColumns} dataSource={hoSoData} />,
    },
    {
      label: (
        <span>
          Văn_bản{' '}
          <Badge
            count={vanBanErrors}
            style={{
              backgroundColor: vanBanErrors > 0 ? '#C0392B' : '#1A7A5E',
            }}
          />
        </span>
      ),
      key: '2',
      children: <Table columns={vanBanColumns} dataSource={vanBanData} />,
    },
  ]}
/>
```

### Step 5: Error Panel

```tsx
import { Table, Tag, Space, Button } from 'antd';
import { ExclamationOutlined, CheckCircleOutlined } from '@ant-design/icons';

<Table
  columns={[
    {
      title: 'Trường',
      dataIndex: 'field',
      key: 'field',
      render: (text) => (
        <code style={{ fontFamily: "'IBM Plex Mono'" }}>{text}</code>
      ),
      width: 120,
    },
    {
      title: 'Dòng',
      dataIndex: 'row',
      key: 'row',
      width: 60,
      render: (row) => <code>{row}</code>,
    },
    {
      title: 'Lỗi',
      dataIndex: 'message',
      key: 'message',
    },
    {
      title: 'Mức độ',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (sev) => {
        const colors = { ERROR: 'red', WARNING: 'orange', INFO: 'blue' };
        return <Tag color={colors[sev]}>{sev}</Tag>;
      },
    },
    {
      title: 'Giá trị',
      dataIndex: 'value',
      key: 'value',
      render: (val) => <code style={{ fontSize: 11 }}>{val || '(trống)'}</code>,
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => highlightCell(record)}
        >
          Xem
        </Button>
      ),
    },
  ]}
  dataSource={errors}
  rowKey="id"
  pagination={{ pageSize: 10 }}
  scroll={{ x: 1000 }}
/>
```

## Queue/List Screen

```tsx
import { Table, Tag, Select, Button, Space, Badge, Tooltip } from 'antd';
import { EyeOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';

const statusColors = {
  UPLOAD: 'blue',
  VALIDATING: 'processing',
  VALIDATED: 'cyan',
  APPROVED: 'green',
  PACKAGING: 'processing',
  SIGNED: 'purple',
  DONE: 'success',
  REJECTED: 'error',
};

<Table
  columns={[
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      key: 'code',
      render: (text) => <code style={{ fontFamily: "'IBM Plex Mono'" }}>{text}</code>,
      width: 120,
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={statusColors[status]}>{status}</Tag>,
      width: 100,
    },
    {
      title: 'Người upload',
      dataIndex: 'uploadedBy',
      key: 'uploadedBy',
    },
    {
      title: 'Ngày upload',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      render: (date) => date && date.split(' ')[0],
    },
    {
      title: 'Lỗi',
      dataIndex: 'errorCount',
      key: 'errorCount',
      width: 60,
      render: (count) =>
        count > 0 ? (
          <Badge
            count={count}
            style={{ backgroundColor: '#C0392B' }}
          />
        ) : (
          <span style={{ color: '#1A7A5E' }}>✓</span>
        ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              disabled={!['VALIDATED', 'APPROVED'].includes(record.status)}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              size="small"
              disabled={['SIGNED', 'DONE'].includes(record.status)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]}
  dataSource={dossiers}
  rowKey="id"
  pagination={{ pageSize: 20 }}
/>
```

## Detail Screen

```tsx
import { Tabs, Descriptions, Table, Drawer, Timeline, Empty, Card } from 'antd';

<Tabs
  items={[
    {
      label: 'Thông tin',
      key: 'info',
      children: (
        <Descriptions
          column={2}
          bordered
          items={[
            { label: 'Mã hồ sơ', children: dossier.code },
            { label: 'Tiêu đề', children: dossier.title },
            { label: 'Ngày bắt đầu', children: dossier.startDate },
            { label: 'Ngày kết thúc', children: dossier.endDate },
            { label: 'Tổng số văn bản', children: dossier.documentCount },
            { label: 'Mức độ tin cậy', children: dossier.trustLevel },
          ]}
        />
      ),
    },
    {
      label: 'Excel Grid',
      key: 'excel',
      children: <ExcelGrid data={excelData} />,
    },
    {
      label: 'Lỗi',
      key: 'errors',
      children: <ErrorPanel errors={dossier.errors} />,
    },
    {
      label: 'PDF Preview',
      key: 'pdf',
      children: (
        <Drawer
          title="PDF Viewer"
          placement="right"
          width={800}
        >
          <iframe
            src={dossier.pdfPresignedUrl}
            style={{ width: '100%', height: 600, border: 'none' }}
          />
        </Drawer>
      ),
    },
    {
      label: 'Lịch sử',
      key: 'history',
      children: (
        <Timeline
          items={dossier.history.map((h) => ({
            label: h.timestamp,
            children: `${h.action} by ${h.user}`,
            color:
              h.action === 'ERROR'
                ? 'red'
                : h.action === 'SUCCESS'
                  ? 'green'
                  : 'blue',
          }))}
        />
      ),
    },
  ]}
/>
```

## Approval Modal

```tsx
import { Modal, Button, Space, Descriptions, Input, message, Form } from 'antd';

const handleApproval = () => {
  Modal.confirm({
    title: 'Phê duyệt hồ sơ',
    width: 600,
    okText: 'Phê duyệt',
    cancelText: 'Từ chối',
    okType: 'primary',
    content: (
      <Form layout="vertical">
        <Descriptions
          column={1}
          bordered
          style={{ marginBottom: '1rem' }}
          items={[
            { label: 'Mã hồ sơ', children: dossier.code },
            { label: 'Tiêu đề', children: dossier.title },
            { label: 'Tổng lỗi', children: dossier.errorCount },
          ]}
        />
        <Form.Item label="Ghi chú phê duyệt">
          <Input.TextArea
            rows={4}
            placeholder="Nhập lý do phê duyệt (tùy chọn)"
            value={approvalNote}
            onChange={(e) => setApprovalNote(e.target.value)}
          />
        </Form.Item>
      </Form>
    ),
    onOk() {
      approveHandler();
      message.success('Hồ sơ đã được phê duyệt');
    },
    onCancel() {
      rejectHandler();
      message.warning('Hồ sơ đã bị từ chối');
    },
  });
};
```

## Dashboard

```tsx
import { Row, Col, Statistic, Card, Empty } from 'antd';
import {
  FileTextOutlined,
  ExclamationOutlined,
  CheckCircleOutlined,
  HourglassOutlined,
} from '@ant-design/icons';

<Row gutter={[24, 24]}>
  {/* Stat Cards */}
  <Col xs={24} sm={12} md={6}>
    <Card>
      <Statistic
        title="Tổng hồ sơ"
        value={1234}
        prefix={<FileTextOutlined />}
        valueStyle={{ color: '#0E9F8E' }}
      />
    </Card>
  </Col>
  <Col xs={24} sm={12} md={6}>
    <Card>
      <Statistic
        title="Lỗi"
        value={56}
        prefix={<ExclamationOutlined />}
        valueStyle={{ color: '#D4860A' }}
      />
    </Card>
  </Col>
  <Col xs={24} sm={12} md={6}>
    <Card>
      <Statistic
        title="Tỷ lệ thành công"
        value={95.4}
        suffix="%"
        prefix={<CheckCircleOutlined />}
        valueStyle={{ color: '#1A7A5E' }}
      />
    </Card>
  </Col>
  <Col xs={24} sm={12} md={6}>
    <Card>
      <Statistic
        title="Chờ xử lý"
        value={42}
        prefix={<HourglassOutlined />}
        valueStyle={{ color: '#0A5A8C' }}
      />
    </Card>
  </Col>

  {/* Charts - would use Ant Design Charts or Chart.js */}
  <Col xs={24} md={12}>
    <Card title="Lỗi theo trường">
      {/* BarChart component */}
    </Card>
  </Col>
  <Col xs={24} md={12}>
    <Card title="Trạng thái hồ sơ">
      {/* PieChart component */}
    </Card>
  </Col>
</Row>
```

## Progress/Loading States

```tsx
import { Progress, Spin, Alert, Space } from 'antd';
import { CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';

{/* Linear progress */}
<Progress
  percent={60}
  status="active"
  strokeColor={{ '0%': '#0E9F8E', '100%': '#0A7266' }}
/>

{/* Circular progress with spinner */}
<Spin
  spinning={isLoading}
  tip="Đang xác thực..."
  indicator={<SyncOutlined spin style={{ color: '#0E9F8E' }} />}
>
  <Card>Content</Card>
</Spin>

{/* Step progress list */}
<Space direction="vertical" style={{ width: '100%' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <CheckCircleOutlined style={{ color: '#1A7A5E' }} />
    <span>Kiểm tra cấu trúc: HOÀN THÀNH</span>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <SyncOutlined spin style={{ color: '#0E9F8E' }} />
    <span>Xác thực dữ liệu: ĐANG XỬ LÝ</span>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ width: 18, height: 18, border: '1px solid #A0A6AA' }} />
    <span>Đóng gói: CHỜ</span>
  </div>
</Space>
```
