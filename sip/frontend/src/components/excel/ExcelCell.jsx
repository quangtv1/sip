/**
 * Single editable table cell.
 * - Enum fields → EnumDropdown
 * - Date fields → text input (DD/MM/YYYY)
 * - Other → text input
 */
import { useState, useEffect } from 'react';
import { Input, Tooltip } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import EnumDropdown from './EnumDropdown.jsx';
import { FIELD_ENUM_MAP } from '../../utils/enum-labels.js';

export default function ExcelCell({
  sheet, rowNum, fieldName, value,
  cellErrors = [], // errors from full validation for this cell
  onCommit, // fn(fieldName, newValue)
  editable = true,
  wrap = false, // allow text wrapping in non-editing state
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  // Sync draft when external value changes (e.g. AutoFix applies a patch)
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const enumOptions = FIELD_ENUM_MAP[fieldName];
  const hasError = cellErrors.some((e) => e.severity === 'ERROR');
  const hasWarn = cellErrors.some((e) => e.severity === 'WARNING');

  const errorMsg = cellErrors.map((e) => e.message).join(' | ');

  const cellBg = hasError ? 'rgba(192,57,43,0.08)' : hasWarn ? 'rgba(212,134,10,0.08)' : undefined;
  const borderColor = hasError ? '#C0392B' : hasWarn ? '#D4860A' : undefined;

  function commitValue(newVal) {
    setEditing(false);
    if (newVal !== value) {
      onCommit?.(fieldName, newVal);
    }
  }

  const cellStyle = {
    background: cellBg,
    border: borderColor ? `1px solid ${borderColor}` : undefined,
    borderRadius: 4,
    padding: '2px 6px',
    cursor: editable ? 'pointer' : 'default',
    minHeight: 24,
    display: wrap ? 'block' : 'flex',
    alignItems: wrap ? undefined : 'center',
    whiteSpace: wrap ? 'pre-wrap' : undefined,
    wordBreak: wrap ? 'break-word' : undefined,
    gap: wrap ? undefined : 4,
  };

  if (!editing) {
    return (
      <Tooltip title={errorMsg || undefined} color={hasError ? 'red' : 'orange'}>
        <div style={cellStyle} onClick={() => editable && setEditing(true)}>
          {hasError && <WarningOutlined style={{ color: '#C0392B', fontSize: 12 }} />}
          {hasWarn && !hasError && <WarningOutlined style={{ color: '#D4860A', fontSize: 12 }} />}
          <span style={{ color: value ? undefined : '#A0A6AA', fontSize: 13 }}>{value || '—'}</span>
        </div>
      </Tooltip>
    );
  }

  if (enumOptions) {
    return (
      <EnumDropdown
        value={draft}
        options={enumOptions}
        editing
        onChange={(v) => setDraft(v)}
        onBlur={() => commitValue(draft)}
      />
    );
  }

  return (
    <Input
      value={draft}
      size="small"
      autoFocus
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => commitValue(draft)}
      onPressEnter={() => commitValue(draft)}
    />
  );
}
