import { Tag, Typography, Space } from 'antd';
import { WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function ErrorItem({ error, onClick, active }) {
  const isError = error.severity === 'ERROR';

  const borderColor = active
    ? (isError ? '#C0392B' : '#B7770D')
    : (isError ? '#F0B8B2' : '#E8C97A');

  const bg = active
    ? (isError ? 'rgba(192,57,43,0.07)' : 'rgba(183,119,13,0.07)')
    : '#fff';

  return (
    <div
      onClick={() => onClick?.(error)}
      style={{
        padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
        background: bg,
        border: `1px solid ${borderColor}`,
        marginBottom: 6, transition: 'all 0.15s',
      }}
    >
      <Space align="start">
        {isError
          ? <CloseCircleOutlined style={{ color: '#C0392B', marginTop: 3, fontSize: 14 }} />
          : <WarningOutlined    style={{ color: '#B7770D', marginTop: 3, fontSize: 14 }} />}
        <div>
          <Space size={6} wrap>
            <Tag
              color={isError ? 'error' : 'warning'}
              style={{ fontSize: 11, margin: 0, fontWeight: 600 }}
            >
              {isError ? 'LỖI' : 'CẢNH BÁO'}
            </Tag>
            <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>{error.sheet}</Tag>
            {error.row != null && (
              <Text style={{ fontSize: 12, color: '#1A3550', fontWeight: 500 }}>Dòng {error.row}</Text>
            )}
            {error.label && (
              <Text style={{ fontSize: 12, fontWeight: 600, color: '#0D1B2A' }}>{error.label}</Text>
            )}
          </Space>
          <div style={{ marginTop: 5 }}>
            <Text style={{ fontSize: 13, color: '#0D1B2A', fontWeight: 500 }}>{error.message}</Text>
          </div>
          {error.value != null && error.value !== '' && (
            <div style={{ marginTop: 3 }}>
              <Text style={{ fontSize: 12, color: '#4A5568' }}>Giá trị: </Text>
              <Text code style={{ fontSize: 12, color: '#1A3550' }}>{String(error.value)}</Text>
            </div>
          )}
        </div>
      </Space>
    </div>
  );
}
