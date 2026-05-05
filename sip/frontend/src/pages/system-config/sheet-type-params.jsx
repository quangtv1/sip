/**
 * TypeParamsEdit / TypeParamsView — type-specific parameter cell renderers
 * used inside the sheet field table (sheet-section.jsx).
 */
import { Input, Select, Space, Tag, Typography } from 'antd';

const { Text } = Typography;

/** Edit cell for type-specific params (enum key, regex pattern, min/max, dependsOn) */
export function TypeParamsEdit({ row, onChange, enumKeys }) {
  if (row.type === 'enum') {
    return (
      <Select size="small" value={row.enumKey} onChange={v => onChange('enumKey', v)}
        options={enumKeys} style={{ width: 200 }} showSearch optionFilterProp="label" />
    );
  }
  if (row.type === 'regex') {
    return (
      <Input size="small" placeholder="pattern" value={row.pattern || ''}
        onChange={e => onChange('pattern', e.target.value)} style={{ width: 160 }} />
    );
  }
  if (row.type === 'float' || row.type === 'range') {
    return (
      <Space size={2}>
        <Input size="small" placeholder="min" value={row.min ?? ''}
          onChange={e => onChange('min', e.target.value === '' ? null : Number(e.target.value))}
          style={{ width: 58 }} />
        <Input size="small" placeholder="max" value={row.max ?? ''}
          onChange={e => onChange('max', e.target.value === '' ? null : Number(e.target.value))}
          style={{ width: 58 }} />
      </Space>
    );
  }
  if (row.type === 'dependent-enum') {
    return (
      <Input size="small" placeholder="fieldIndex" style={{ width: 78 }}
        value={row.dependsOn?.fieldIndex ?? ''}
        onChange={e => onChange('dependsOn', {
          ...row.dependsOn,
          fieldIndex: e.target.value === '' ? null : Number(e.target.value),
        })} />
    );
  }
  return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
}

/** Read-only display of type-specific params */
export function TypeParamsView({ row }) {
  if (row.type === 'enum' && row.enumKey)
    return <Tag style={{ fontSize: 13, fontFamily: 'monospace' }}>{row.enumKey}</Tag>;
  if (row.type === 'regex' && row.pattern)
    return <Text code style={{ fontSize: 13 }}>{row.pattern}</Text>;
  if ((row.type === 'float' || row.type === 'range') && (row.min != null || row.max != null))
    return <Text style={{ fontSize: 13 }}>{row.min ?? '—'} ~ {row.max ?? '—'}</Text>;
  if (row.type === 'dependent-enum' && row.dependsOn?.fieldIndex != null)
    return <Text style={{ fontSize: 13 }}>idx:{row.dependsOn.fieldIndex}</Text>;
  return <Text type="secondary" style={{ fontSize: 13 }}>—</Text>;
}
