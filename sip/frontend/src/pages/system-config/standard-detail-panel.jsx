/**
 * Detail panel rendered in the right column of the standards master-detail layout.
 * Header: colored banner with standard info + meta actions.
 * Body: tabs for Cấu trúc bảng and Danh mục.
 */
import { useState } from 'react';
import { Button, Tag, Space, Badge, Tabs, Typography, Popconfirm, Tooltip } from 'antd';
import {
  EditOutlined, DeleteOutlined, CheckCircleOutlined,
  TableOutlined, AuditOutlined,
} from '@ant-design/icons';
import SheetEditorModal from './sheet-editor-modal.jsx';
import EnumSection from './enum-section.jsx';

const { Text, Title } = Typography;

/** Sheet list inside "Cấu trúc bảng" tab */
function SheetListTab({ profile, accent: colorHex, onSaved }) {
  const [sheetModal, setSheetModal] = useState(false);
  const sheets = profile.sheets || [];
  return (
    <div style={{ padding: '16px 0' }}>
      <Space wrap style={{ marginBottom: 16 }} size={8}>
        {sheets.map(s => (
          <div key={s} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 8,
            background: colorHex + '0d', border: `1.5px solid ${colorHex}30`,
          }}>
            <TableOutlined style={{ color: colorHex, fontSize: 14 }} />
            <Text style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: colorHex }}>
              {s}
            </Text>
          </div>
        ))}
      </Space>
      <Button type="primary" icon={<TableOutlined />} onClick={() => setSheetModal(true)}>
        Mở trình sửa cấu trúc bảng
      </Button>
      <SheetEditorModal
        profileId={profile.id}
        open={sheetModal}
        onClose={() => setSheetModal(false)}
        onSaved={onSaved}
      />
    </div>
  );
}

export default function StandardDetailPanel({
  profile, isActive, profiles, accent,
  onEdit, onSetActive, onDelete, onSaved,
}) {
  const colorHex = accent;
  const TAB_ITEMS = [
    {
      key: 'schema',
      label: 'Cấu trúc bảng',
      icon: <TableOutlined />,
      children: <SheetListTab profile={profile} accent={accent} onSaved={onSaved} />,
    },
    {
      key: 'enums',
      label: 'Danh mục',
      icon: <AuditOutlined />,
      children: (
        <div style={{ paddingTop: 16 }}>
          <EnumSection profiles={profiles} defaultScopeId={profile.id} />
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Colored header banner ─────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${colorHex}18 0%, ${colorHex}08 100%)`,
        borderBottom: `3px solid ${colorHex}`,
        borderRadius: '0 8px 0 0',
        padding: '16px 20px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      }}>
        <Space align="start" size={14}>
          {/* icon badge */}
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: colorHex + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <AuditOutlined style={{ fontSize: 24, color: colorHex }} />
          </div>
          <div>
            <Space size={8} style={{ marginBottom: 4 }}>
              <Text style={{
                fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                color: colorHex, letterSpacing: 1,
                background: colorHex + '18', padding: '1px 8px', borderRadius: 4,
              }}>
                {profile.id}
              </Text>
              {isActive && (
                <Badge status="success" text={
                  <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>đang dùng</Text>
                } />
              )}
            </Space>
            <Title level={5} style={{ margin: 0, color: '#1e293b' }}>{profile.name}</Title>
            {profile.description && (
              <Text type="secondary" style={{ fontSize: 12 }}>{profile.description}</Text>
            )}
            <Space wrap size={4} style={{ marginTop: 6 }}>
              {(profile.sheets || []).map(s => (
                <Tag key={s} style={{
                  fontSize: 11, fontFamily: 'monospace', margin: 0, padding: '0 6px',
                  background: colorHex + '12', border: `1px solid ${colorHex}40`, color: colorHex,
                }}>
                  {s}
                </Tag>
              ))}
            </Space>
          </div>
        </Space>

        {/* actions */}
        <Space size={6} style={{ flexShrink: 0 }}>
          <Tooltip title="Sửa thông tin">
            <Button size="small" icon={<EditOutlined />} onClick={onEdit} />
          </Tooltip>
          {!isActive && (
            <Popconfirm title={`Dùng "${profile.id}" làm tiêu chuẩn hiện tại?`}
              onConfirm={onSetActive} okText="Dùng" cancelText="Hủy">
              <Tooltip title="Đặt làm tiêu chuẩn đang dùng">
                <Button size="small" icon={<CheckCircleOutlined />} type="dashed" />
              </Tooltip>
            </Popconfirm>
          )}
          {!isActive && (
            <Popconfirm title={`Xóa tiêu chuẩn "${profile.id}"?`}
              onConfirm={onDelete} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
              <Tooltip title="Xóa tiêu chuẩn">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* ── Tabbed content ────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto' }}>
        <Tabs items={TAB_ITEMS} style={{ marginTop: 4 }} />
      </div>
    </div>
  );
}
