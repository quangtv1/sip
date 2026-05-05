/**
 * StandardCard — card view item for the standards list.
 * Shows accent icon, ID, name, sheet tags, active badge.
 * Hover: 3-dot (⋯) action menu appears in top-right corner.
 * Actions: "Dùng tiêu chuẩn này" (if not active), "Xóa tiêu chuẩn" (if not active).
 */
import { useState } from 'react';
import { Tag, Typography, Space, Dropdown, Button, Popconfirm } from 'antd';
import { AuditOutlined, MoreOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function StandardCard({ profile, isActive, accent, selected = false, onClick, onSetActive, onDelete }) {
  const [hovered, setHovered] = useState(false);

  const menuItems = [
    ...(!isActive ? [{
      key: 'activate',
      label: 'Dùng tiêu chuẩn này',
      icon: <CheckCircleOutlined />,
      onClick: ({ domEvent }) => { domEvent.stopPropagation(); onSetActive?.(); },
    }] : []),
    {
      key: 'delete',
      label: (
        <Popconfirm
          title={`Xóa tiêu chuẩn "${profile.id}"?`}
          onConfirm={e => { e?.stopPropagation(); onDelete?.(); }}
          onCancel={e => e?.stopPropagation()}
          okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
          onClick={e => e.stopPropagation()}
        >
          <span style={{ color: '#ef4444' }}>Xóa tiêu chuẩn</span>
        </Popconfirm>
      ),
      icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
      disabled: isActive,
    },
  ];

  return (
    <div
      role="button" tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: 190, minHeight: 160, borderRadius: 12, padding: '18px 16px 14px',
        cursor: 'pointer', background: selected ? accent + '06' : '#fff',
        border: `2px solid ${isActive || selected ? accent : hovered ? accent + '80' : '#e5e7eb'}`,
        boxShadow: hovered ? '0 6px 20px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 150ms ease',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        userSelect: 'none',
      }}
    >
      {/* 3-dot menu — visible on hover */}
      {hovered && (
        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
          <Button
            type="text" size="small"
            icon={<MoreOutlined style={{ fontSize: 16, color: '#6b7280' }} />}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 6, right: 6,
              padding: '0 4px', height: 24, minWidth: 24,
            }}
          />
        </Dropdown>
      )}

      {/* accent icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: accent + '16',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AuditOutlined style={{ fontSize: 26, color: accent }} />
      </div>

      {/* ID chip */}
      <Text style={{
        fontFamily: 'monospace', fontSize: 12, fontWeight: 700, letterSpacing: 1,
        color: accent, background: accent + '14', padding: '1px 8px', borderRadius: 4,
      }}>
        {profile.id}
      </Text>

      {/* name */}
      <Text style={{ fontSize: 12, textAlign: 'center', color: '#374151', lineHeight: 1.4 }}>
        {profile.name}
      </Text>

      {/* sheet tags */}
      <Space size={3} wrap style={{ justifyContent: 'center' }}>
        {(profile.sheets || []).map(s => (
          <Tag key={s} style={{
            fontSize: 10, fontFamily: 'monospace', margin: 0, padding: '0 5px',
            background: accent + '10', border: `1px solid ${accent}35`, color: accent,
          }}>
            {s}
          </Tag>
        ))}
      </Space>

      {/* active badge */}
      {isActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e',
            boxShadow: '0 0 6px #22c55e90' }} />
          <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>đang dùng</Text>
        </div>
      )}
    </div>
  );
}
