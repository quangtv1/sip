import { Tag, Typography, Space } from 'antd';
import { WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function ErrorItem({ error, onClick, active }) {
  const isError = error.severity === 'ERROR';

  return (
    <div
      onClick={() => onClick?.(error)}
      style={{
        padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
        background: active ? (isError ? 'rgba(192,57,43,0.08)' : 'rgba(212,134,10,0.08)') : '#fff',
        border: `1px solid ${active ? (isError ? '#C0392B' : '#D4860A') : 'rgba(14,31,50,0.08)'}`,
        marginBottom: 6, transition: 'all 0.15s',
      }}
    >
      <Space align="start">
        {isError
          ? <CloseCircleOutlined style={{ color: '#C0392B', marginTop: 2 }} />
          : <WarningOutlined style={{ color: '#D4860A', marginTop: 2 }} />}
        <div>
          <Space size={6} wrap>
            <Tag color={isError ? 'error' : 'warning'} style={{ fontSize: 11, margin: 0 }}>
              {error.severity}
            </Tag>
            <Tag color="default" style={{ fontSize: 11, margin: 0 }}>{error.sheet}</Tag>
            {error.row != null && (
              <Text type="secondary" style={{ fontSize: 11 }}>Dòng {error.row}</Text>
            )}
            {error.label && (
              <Text style={{ fontSize: 12, fontWeight: 500 }}>{error.label}</Text>
            )}
          </Space>
          <div style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 12, color: '#3A4B5C' }}>{error.message}</Text>
          </div>
          {error.value != null && error.value !== '' && (
            <div style={{ marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Giá trị: </Text>
              <Text code style={{ fontSize: 11 }}>{String(error.value)}</Text>
            </div>
          )}
        </div>
      </Space>
    </div>
  );
}
