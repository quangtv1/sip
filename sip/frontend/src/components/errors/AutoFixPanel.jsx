/**
 * Auto-fix suggestion panel.
 * Shows before/after diff for each suggestion.
 * "Apply" applies a single fix; "Apply All" applies all.
 * Calls onApply(patches) where patches = [{sheet, row, field, suggested}].
 */
import { Button, Space, Tag, Typography, Empty, Divider } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

const { Text } = Typography;

const CONFIDENCE_COLOR = { HIGH: 'success', MEDIUM: 'processing', LOW: 'default' };

function SuggestionRow({ suggestion, onApply }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, background: '#f9fafb', border: '1px solid rgba(14,31,50,0.08)', marginBottom: 8 }}>
      <Space style={{ marginBottom: 6 }} wrap>
        <Tag color={CONFIDENCE_COLOR[suggestion.confidence] || 'default'} style={{ fontSize: 11 }}>
          {suggestion.confidence}
        </Tag>
        <Text style={{ fontSize: 12, fontWeight: 500 }}>{suggestion.label}</Text>
        {suggestion.row != null && (
          <Text type="secondary" style={{ fontSize: 11 }}>Dòng {suggestion.row}</Text>
        )}
      </Space>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text delete style={{ fontSize: 12, color: '#C0392B' }}>
          {suggestion.current || <em style={{ color: '#A0A6AA' }}>rỗng</em>}
        </Text>
        <Text type="secondary">→</Text>
        <Text style={{ fontSize: 12, color: '#1A7A5E', fontWeight: 500 }}>{suggestion.suggested}</Text>
        <Button size="small" type="primary" ghost onClick={() => onApply([suggestion])}>
          Áp dụng
        </Button>
      </div>
    </div>
  );
}

export default function AutoFixPanel({ suggestions = [], onApply }) {
  if (suggestions.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Không có gợi ý sửa lỗi"
        style={{ marginTop: 24 }}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Space>
          <ThunderboltOutlined style={{ color: '#0E9F8E' }} />
          <Text strong>{suggestions.length} gợi ý tự động</Text>
        </Space>
        <Button
          type="primary" size="small"
          onClick={() => onApply(suggestions)}
        >
          Áp dụng tất cả
        </Button>
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {suggestions.map((s, i) => (
          <SuggestionRow
            key={`${s.sheet}.${s.row}.${s.field}.${i}`}
            suggestion={s}
            onApply={onApply}
          />
        ))}
      </div>
    </div>
  );
}
