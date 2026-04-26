/**
 * Error panel — filterable list of validation errors.
 * Click on an error → calls onNavigate(sheet, row, field) to scroll ExcelGrid.
 */
import { useState, useMemo } from 'react';
import { Space, Badge, Button, Empty, Typography, Segmented } from 'antd';
import ErrorItem from './ErrorItem.jsx';

const { Text } = Typography;

export default function ErrorPanel({ errors = [], onNavigate }) {
  const [filter, setFilter] = useState('ALL');
  const [activeKey, setActiveKey] = useState(null);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return errors;
    return errors.filter((e) => e.severity === filter);
  }, [errors, filter]);

  const errorCount = errors.filter((e) => e.severity === 'ERROR').length;
  const warnCount = errors.filter((e) => e.severity === 'WARNING').length;

  function handleClick(error) {
    const key = `${error.sheet}.${error.row}.${error.field}`;
    setActiveKey(key);
    if (error.sheet && error.row != null && error.field) {
      onNavigate?.(error.sheet, error.row, error.field);
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0 0 12px' }}>
        <Space style={{ marginBottom: 10 }}>
          <Badge count={errorCount} color="#C0392B">
            <Text strong style={{ fontSize: 14 }}>Lỗi & Cảnh báo</Text>
          </Badge>
        </Space>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Segmented
            size="small"
            options={[
              { label: `Tất cả (${errors.length})`, value: 'ALL' },
              { label: `Lỗi (${errorCount})`, value: 'ERROR' },
              { label: `Cảnh báo (${warnCount})`, value: 'WARNING' },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {filtered.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={errors.length === 0 ? 'Không có lỗi' : 'Không có lỗi theo bộ lọc này'}
            style={{ marginTop: 40 }}
          />
        ) : (
          filtered.map((e, i) => {
            const key = `${e.sheet}.${e.row}.${e.field}.${i}`;
            return (
              <ErrorItem
                key={key}
                error={e}
                onClick={handleClick}
                active={activeKey === `${e.sheet}.${e.row}.${e.field}`}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
