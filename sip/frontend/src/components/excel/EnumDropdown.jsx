/**
 * Inline Select dropdown for enum fields.
 * Renders as a tag when read-only, Select when editing.
 */
import { Select } from 'antd';
import { toSelectOptions } from '../../utils/enum-labels.js';

export default function EnumDropdown({ value, options, editing, onChange, onBlur, style }) {
  if (!editing) {
    return <span style={style}>{value || <span style={{ color: '#A0A6AA' }}>—</span>}</span>;
  }

  return (
    <Select
      value={value || undefined}
      options={toSelectOptions(options)}
      onChange={onChange}
      onBlur={onBlur}
      autoFocus
      open
      size="small"
      showSearch
      filterOption={(input, opt) =>
        (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
      }
      style={{ width: '100%', minWidth: 180, ...style }}
      popupMatchSelectWidth={false}
    />
  );
}
