/**
 * Error panel — filterable list of validation errors.
 * Click on an error → calls onNavigate(sheet, row, field) to scroll ExcelGrid.
 */
import { useState, useMemo } from 'react';
import { Empty } from 'antd';
import ErrorItem from './ErrorItem.jsx';

// ── Filter tag colours (match ErrorItem severity palette) ────────────────────
const FILTER_STYLES = {
  ALL:     { active: { background: '#1A3550', color: '#fff', borderColor: '#1A3550' },
             idle:   { background: '#EEF2F6', color: '#4A5568', borderColor: '#C8D0DA' } },
  ERROR:   { active: { background: '#C0392B', color: '#fff', borderColor: '#C0392B' },
             idle:   { background: '#FDF0EE', color: '#C0392B', borderColor: '#F0B8B2' } },
  WARNING: { active: { background: '#B7770D', color: '#fff', borderColor: '#B7770D' },
             idle:   { background: '#FDF6E8', color: '#8A5A00', borderColor: '#E8C97A' } },
};

function FilterTag({ label, count, value, active, onClick }) {
  const s = active ? FILTER_STYLES[value].active : FILTER_STYLES[value].idle;
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
        cursor: 'pointer', userSelect: 'none',
        border: `1px solid ${s.borderColor}`,
        background: s.background, color: s.color,
        transition: 'all 0.15s',
      }}
    >
      {label}
      <span style={{
        background: active ? 'rgba(255,255,255,0.25)' : s.borderColor,
        color: s.color,
        borderRadius: 10, fontSize: 11, fontWeight: 600,
        padding: '0 5px', lineHeight: '16px',
      }}>
        {count}
      </span>
    </span>
  );
}

export default function ErrorPanel({ errors = [], onNavigate }) {
  const [filter, setFilter] = useState('ALL');
  const [activeKey, setActiveKey] = useState(null);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return errors;
    return errors.filter((e) => e.severity === filter);
  }, [errors, filter]);

  const errorCount = errors.filter((e) => e.severity === 'ERROR').length;
  const warnCount  = errors.filter((e) => e.severity === 'WARNING').length;

  function handleClick(error) {
    const key = `${error.sheet}.${error.row}.${error.field}`;
    setActiveKey(key);
    if (error.sheet && error.row != null && error.field) {
      onNavigate?.(error.sheet, error.row, error.field);
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Filter tags only — no header title */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <FilterTag label="Tất cả" count={errors.length} value="ALL"     active={filter === 'ALL'}     onClick={() => setFilter('ALL')} />
        <FilterTag label="Lỗi"    count={errorCount}     value="ERROR"   active={filter === 'ERROR'}   onClick={() => setFilter('ERROR')} />
        <FilterTag label="Cảnh báo" count={warnCount}    value="WARNING" active={filter === 'WARNING'} onClick={() => setFilter('WARNING')} />
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
