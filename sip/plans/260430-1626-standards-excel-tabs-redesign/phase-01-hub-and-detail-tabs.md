# Phase 01 — Hub + Detail Page Excel Tabs

## Files
- `frontend/src/pages/system-config/standards-hub-tab.jsx` — rewrite
- `frontend/src/pages/system-config/standard-detail-page.jsx` — rewrite

## standards-hub-tab.jsx

Revert to simple list/grid. Restore `selected`/`setSelected` pattern.

**State:**
- `profiles`, `activeId`, `loading`, `error` — same as before
- `view`: 'table' | 'card'
- `selected`: profile object | null
- `formOpen`: boolean

**Render:**
```
if (selected) → return <StandardDetailPage ... onBack={() => setSelected(null)} />

else → show toolbar + Table or Card grid
  Toolbar: [AuditOutlined] Tiêu chuẩn (N) | [+ Thêm] [≡][⊞]
  Table: onRow click → setSelected(record)
  Card: onClick → setSelected(p)
  NO AddCard inline, keep [+ Thêm tiêu chuẩn] button in toolbar
```

**Remove:** AddCard component, activeTab state, editable-card Tabs, embedded={true} usage

## standard-detail-page.jsx

Replace single-scroll content with `Tabs type="line"` inner navigation.

**Props:** same as before, remove `embedded` prop

**Layout:**
```jsx
<div style={{ padding: '20px 24px' }}>
  {/* Breadcrumb + actions row (unchanged) */}

  {/* Profile summary banner (unchanged) */}

  {/* Inner Excel tabs */}
  <Tabs
    type="card"
    size="small"
    defaultActiveKey={profile.sheets[0]}
    items={[
      // Dynamic sheet tabs
      ...profile.sheets.map((sheet, idx) => ({
        key: sheet,
        label: <Space size={4}><span dot accent /><span monospace>{sheet}</span></Space>,
        children: <SheetSection profileId={profile.id} sheetName={sheet} accent={accent} />,
      })),
      // Danh mục tab
      {
        key: '__enum',
        label: <Space><UnorderedListOutlined />Danh mục</Space>,
        children: <EnumSection profiles={profiles} defaultScopeId={profile.id} />,
      },
      // Cấu hình tab
      {
        key: '__config',
        label: <Space><SettingOutlined />Cấu hình</Space>,
        children: <ProfileConfigTab profile={profile} accent={accent} onSaved={onSaved} />,
      },
    ]}
  />
</div>
```

**ProfileConfigTab** (inline component in same file):
- Shows profile.id, name, description, sheets in editable form
- Replaces MetaEditModal — edit inline in the tab
- Save button calls PUT /config/profiles/:id
- Under 40 lines

**Remove:** MetaEditModal, EnumSection + SheetSection rendered outside tabs, Title "Cấu trúc bảng" / "Danh mục"

## Success Criteria
- [ ] Hub shows list/grid only, click navigates to detail
- [ ] Detail shows Excel-style tabs: sheets + Danh mục + Cấu hình
- [ ] Each sheet tab renders SheetSection (read/edit)
- [ ] Cấu hình tab shows editable profile form
- [ ] Breadcrumb + actions unchanged
