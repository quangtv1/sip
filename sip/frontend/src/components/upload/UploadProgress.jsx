/**
 * UploadProgress — displays SSE pipeline progress steps.
 * Steps: upload → parse → validate → pdf-check → complete
 *
 * Props:
 *   step     {string}  - current step name
 *   progress {number}  - 0–100
 *   detail   {string}  - optional detail message
 *   error    {string}  - error message (if step === 'error')
 *   done     {boolean}
 *   summary  {object}  - completion summary
 */
import { Progress, Steps, Typography, Alert, Space } from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  FilePdfOutlined,
  CheckOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const STEPS = [
  { key: 'upload',    label: 'Tải lên',       icon: <UploadOutlined /> },
  { key: 'parse',     label: 'Phân tích',      icon: <FileTextOutlined /> },
  { key: 'validate',  label: 'Kiểm tra',       icon: <CheckCircleOutlined /> },
  { key: 'pdf-check', label: 'Kiểm tra PDF',   icon: <FilePdfOutlined /> },
  { key: 'complete',  label: 'Hoàn thành',     icon: <CheckOutlined /> },
];

function stepIndex(step) {
  const idx = STEPS.findIndex((s) => s.key === step);
  return idx === -1 ? 0 : idx;
}

export default function UploadProgress({ step, progress, detail, error, done, summary }) {
  if (!step) return null;

  const current = stepIndex(step);
  const isError = step === 'error';

  const antSteps = STEPS.map((s, i) => ({
    title: s.label,
    icon: s.icon,
    status: isError && i === current
      ? 'error'
      : i < current || done
        ? 'finish'
        : i === current
          ? 'process'
          : 'wait',
  }));

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={12}>
      <Steps items={antSteps} size="small" current={isError ? current : done ? STEPS.length : current} />

      <Progress
        percent={progress}
        status={isError ? 'exception' : done ? 'success' : 'active'}
        strokeColor={isError ? undefined : '#0E9F8E'}
      />

      {detail && !done && !isError && (
        <Text type="secondary" style={{ fontSize: 12 }}>{detail}</Text>
      )}

      {isError && error && (
        <Alert type="error" message={error} showIcon />
      )}

      {done && !isError && summary && (
        <Alert
          type="success"
          showIcon
          message="Tải lên hoàn tất"
          description={
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
              {summary.totalRows != null && <li>Tổng số dòng: {summary.totalRows}</li>}
              {summary.errorCount != null && <li>Lỗi phát hiện: {summary.errorCount}</li>}
              {summary.pdfCount   != null && <li>File PDF: {summary.pdfCount}</li>}
            </ul>
          }
        />
      )}
    </Space>
  );
}
