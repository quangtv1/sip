/**
 * StandardDetailPage — breadcrumb header + Excel-style inner tabs.
 * Tab order: [Mô tả (merged with Danh mục)] [sheet1] [sheet2] ... [+]
 * Sheet tabs: plain monospace label, double-click to rename inline.
 */
import { useState, useRef } from 'react';
import {
  Button, Space, Typography, Popconfirm, Tabs, Input, Tooltip, Dropdown, Modal,
} from 'antd';
import {
  ArrowLeftOutlined, DeleteOutlined, CheckCircleOutlined, PlusOutlined,
  EditOutlined,
} from '@ant-design/icons';
import apiClient from '../../config/api-client.js';
import SheetSection from './sheet-section.jsx';
import { ProfileDescTab, AddSheetModal } from './profile-config-tab.jsx';

const { Text } = Typography;

/** Inline rename input — appears on double-click like Google Sheets */
function RenameInput({ value, onChange, onCommit, onCancel }) {
  const ref = useRef(null);
  return (
    <Input
      ref={ref}
      size="small"
      value={value}
      autoFocus
      style={{
        width: Math.max(70, value.length * 8 + 20),
        fontFamily: 'monospace', fontSize: 12,
        padding: '1px 6px', height: 22,
      }}
      onChange={e => onChange(e.target.value)}
      onPressEnter={onCommit}
      onBlur={onCommit}
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    />
  );
}

export default function StandardDetailPage({
  profile, isActive, profiles, accent,
  onBack, onSetActive, onDelete, onSaved,
}) {
  const [activeTab,    setActiveTab]    = useState('__desc');
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [renaming,     setRenaming]     = useState(null);
  const [renameVal,    setRenameVal]    = useState('');

  function startRename(sheet) { setRenaming(sheet); setRenameVal(sheet); }

  async function commitRename(oldName) {
    const newName = renameVal.trim();
    setRenaming(null);
    if (!newName || newName === oldName || !/^[A-Za-z0-9_]{1,40}$/.test(newName)) return;
    const newSheets = (profile.sheets || []).map(s => s === oldName ? newName : s);
    try {
      await apiClient.put(`/config/profiles/${profile.id}`, {
        name: profile.name, description: profile.description, sheets: newSheets,
      });
      onSaved?.();
      setActiveTab(newName);
    } catch { /* revert silently — onSaved re-renders with old name */ }
  }

  function handleTabChange(key) {
    if (key === '__add_sheet') { setAddSheetOpen(true); return; }
    setActiveTab(key);
  }

  /** Delete a sheet — guard: must have >1 sheet remaining */
  async function deleteSheet(sheetName) {
    const newSheets = (profile.sheets || []).filter(s => s !== sheetName);
    try {
      await apiClient.put(`/config/profiles/${profile.id}`, {
        name: profile.name, description: profile.description, sheets: newSheets,
      });
      onSaved?.();
      if (activeTab === sheetName) setActiveTab('__desc');
    } catch { /* silently ignore — onSaved will reload */ }
  }

  /** Context menu items for a sheet tab */
  function sheetContextMenu(sheet) {
    return {
      items: [
        { key: 'rename', label: 'Đổi tên', icon: <EditOutlined />,
          onClick: () => startRename(sheet) },
        { type: 'divider' },
        { key: 'delete', label: 'Xóa sheet', icon: <DeleteOutlined />, danger: true,
          onClick: () => Modal.confirm({
            title: `Xóa sheet "${sheet}"?`,
            content: 'Toàn bộ cấu trúc fields sẽ bị xóa vĩnh viễn.',
            okText: 'Xóa', cancelText: 'Hủy', okButtonProps: { danger: true },
            onOk: () => deleteSheet(sheet),
          }),
        },
      ],
    };
  }

  // ── Tab: Danh mục (enum management, first) ──────────────────────────────
  const descTab = {
    key: '__desc',
    label: 'Danh mục',
    children: (
      <ProfileDescTab
        profile={profile}
        profiles={profiles}
        accent={accent}
        isActive={isActive}
        onSaved={onSaved}
        onNavigateToSheet={sheet => setActiveTab(sheet)}
      />
    ),
  };

  // ── Sheet tabs (dynamic, after meta) ────────────────────────────────────
  const sheetItems = (profile.sheets || []).map(sheet => ({
    key: sheet,
    label: renaming === sheet
      ? (
        <RenameInput
          value={renameVal}
          onChange={setRenameVal}
          onCommit={() => commitRename(sheet)}
          onCancel={() => setRenaming(null)}
        />
      )
      : (
        <Dropdown trigger={['contextMenu']} menu={sheetContextMenu(sheet)}>
          <span
            onDoubleClick={e => { e.stopPropagation(); startRename(sheet); }}
            title="Nhấn đôi để đổi tên · Chuột phải để xem thêm"
            style={{ fontFamily: 'monospace', fontSize: 13, padding: '0 2px' }}
          >
            {sheet}
          </span>
        </Dropdown>
      ),
    children: <SheetSection profileId={profile.id} sheetName={sheet} accent={accent} />,
  }));

  // ── Tab: + (add sheet, last) ─────────────────────────────────────────────
  const addTab = {
    key: '__add_sheet',
    label: (
      <Tooltip title="Thêm sheet mới" placement="bottom">
        <PlusOutlined style={{ fontSize: 13, color: '#6b7280' }} />
      </Tooltip>
    ),
    children: null,
  };

  return (
    <div style={{ padding: '20px 24px' }}>

      {/* ── Breadcrumb + actions ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 8,
      }}>
        <Space size={6} wrap>
          <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={onBack}
            style={{ color: '#6b7280', padding: '0 4px' }}>
            Tiêu chuẩn
          </Button>
          <Text type="secondary">/</Text>
          <Text style={{ fontFamily: 'monospace', fontWeight: 700, color: accent }}>{profile.id}</Text>
          <Text type="secondary">—</Text>
          <Text style={{ fontWeight: 500 }}>{profile.name}</Text>
          {isActive && (
            <Space size={4}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: '#22c55e',
                display: 'inline-block', boxShadow: '0 0 5px #22c55e80',
              }} />
              <Text style={{ fontSize: 12, color: '#16a34a' }}>đang dùng</Text>
            </Space>
          )}
        </Space>
        <Space size={6}>
          {!isActive && (
            <Popconfirm title={`Dùng "${profile.id}" làm tiêu chuẩn hiện tại?`}
              onConfirm={onSetActive} okText="Dùng" cancelText="Hủy">
              <Button size="small" icon={<CheckCircleOutlined />} type="dashed">
                Dùng tiêu chuẩn này
              </Button>
            </Popconfirm>
          )}
          {!isActive && (
            <Popconfirm title={`Xóa tiêu chuẩn "${profile.id}"?`}
              onConfirm={onDelete} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* ── Excel-style tabs: Mô tả | Danh mục | sheets... | + ──────── */}
      <Tabs
        key={profile.id}
        type="card"
        size="small"
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[descTab, ...sheetItems, addTab]}
      />

      <AddSheetModal
        open={addSheetOpen}
        profileId={profile.id}
        existingSheets={profile.sheets || []}
        onClose={() => setAddSheetOpen(false)}
        onSaved={() => { onSaved?.(); setAddSheetOpen(false); }}
      />
    </div>
  );
}
