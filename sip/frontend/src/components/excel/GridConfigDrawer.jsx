/**
 * Column configuration drawer for ExcelGrid sheets.
 * Allows: toggling column visibility, adjusting column widths, setting page size (Van_ban only).
 */
import { Drawer, Checkbox, Button, Space, Typography, Divider, Tooltip, InputNumber } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

const MIN_W = 60;
const MAX_W = 500;
const STEP = 20;
const PAGE_SIZES = [50, 100, 150, 200];

export default function GridConfigDrawer({
  open, onClose,
  sheet,                           // 'Ho_so' | 'Van_ban'
  fields,                          // [[fieldName, label], ...]
  hidden, onToggle,                // Set<string>, fn(fieldName)
  widths, defaultWidths,           // { fieldName: number }, { fieldName: number }
  onWidthChange,                   // fn(fieldName, delta)
  pageSize, onPageSizeChange,      // number | null, fn(size) | null
  onReset,
}) {
  return (
    <Drawer
      title={`Cấu hình — ${{ Ho_so: 'Hồ sơ', Van_ban: 'Văn bản' }[sheet] ?? sheet}`}
      open={open}
      onClose={onClose}
      width={340}
      styles={{ body: { padding: '12px 16px' } }}
      extra={
        <Tooltip title="Đặt lại mặc định">
          <Button size="small" icon={<ReloadOutlined />} onClick={onReset}>Reset</Button>
        </Tooltip>
      }
    >
      {/* Page size selector — Van_ban only */}
      {pageSize != null && (
        <>
          <Text strong style={{ fontSize: 13 }}>Số dòng mỗi trang</Text>
          <div style={{ marginTop: 8, marginBottom: 4 }}>
            <Space size={6} wrap>
              {PAGE_SIZES.map((n) => (
                <Button
                  key={n}
                  size="small"
                  type={pageSize === n ? 'primary' : 'default'}
                  onClick={() => onPageSizeChange(n)}
                  style={{ minWidth: 44 }}
                >
                  {n}
                </Button>
              ))}
              <InputNumber
                size="small"
                min={1}
                max={9999}
                value={PAGE_SIZES.includes(pageSize) ? null : pageSize}
                placeholder="Tùy chỉnh"
                onChange={(v) => v && v > 0 && onPageSizeChange(v)}
                style={{ width: 90 }}
              />
            </Space>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </>
      )}

      {/* Column list */}
      <Text strong style={{ fontSize: 13 }}>Hiển thị cột</Text>
      <div style={{ marginTop: 8 }}>
        {fields.map(([fieldName, label]) => {
          const w = widths[fieldName] ?? defaultWidths[fieldName];
          const visible = !hidden.has(fieldName);
          return (
            <div
              key={fieldName}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 0', borderBottom: '1px solid #f0f0f0',
              }}
            >
              <Checkbox checked={visible} onChange={() => onToggle(fieldName)} />
              <Text
                style={{
                  flex: 1, fontSize: 12,
                  color: visible ? '#0D1B2A' : '#A0A6AA',
                  transition: 'color 0.15s',
                }}
              >
                {label}
              </Text>
              {/* Width controls */}
              <Space size={0}>
                <Button
                  size="small" type="text"
                  disabled={!visible || w <= MIN_W}
                  onClick={() => onWidthChange(fieldName, -STEP)}
                  style={{ padding: '0 5px', minWidth: 24, color: '#4A5568' }}
                >−</Button>
                <Text
                  style={{
                    fontSize: 11, color: '#4A5568', minWidth: 32,
                    textAlign: 'center', display: 'inline-block',
                  }}
                >
                  {w}
                </Text>
                <Button
                  size="small" type="text"
                  disabled={!visible || w >= MAX_W}
                  onClick={() => onWidthChange(fieldName, +STEP)}
                  style={{ padding: '0 5px', minWidth: 24, color: '#4A5568' }}
                >+</Button>
              </Space>
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}
