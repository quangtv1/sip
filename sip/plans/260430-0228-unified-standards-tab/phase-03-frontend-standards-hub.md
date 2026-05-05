# Phase 03 — Frontend: Unified Standards Hub

## Overview
- **Priority:** P1
- **Status:** pending (blocked by Phase 01 + 02)
- **Effort:** ~4.5h
- **Risk:** Medium — replaces 3 tabs, new component tree

## New Component Tree

```
SystemConfigPage.jsx
  [MinIO]  [Tiêu chuẩn ★]
                │
         standards-hub-tab.jsx        ~150 lines
           ├─ Profile table + actions
           ├─ <SheetEditorModal />
           └─ <EnumSection />
                │
         sheet-editor-modal.jsx       ~180 lines
           ├─ N-sheet Tabs (dynamic)
           ├─ Field table (inline edit)
           └─ Add/remove/rename sheet
                │
         enum-section.jsx             ~160 lines
           ├─ "Xem theo" selector (Global / TT05 / TT04...)
           ├─ Enum collapse list
           └─ Clone / Dùng global actions
```

## Files

| Action | File |
|--------|------|
| UPDATE | `frontend/src/pages/SystemConfigPage.jsx` |
| CREATE | `frontend/src/pages/system-config/standards-hub-tab.jsx` |
| CREATE | `frontend/src/pages/system-config/sheet-editor-modal.jsx` |
| CREATE | `frontend/src/pages/system-config/enum-section.jsx` |
| DELETE | `frontend/src/pages/system-config/profile-management-tab.jsx` |
| DELETE | `frontend/src/pages/system-config/schema-management-tab.jsx` |
| DELETE | `frontend/src/pages/system-config/enum-management-tab.jsx` |

---

## Step 1 — `SystemConfigPage.jsx`

Remove `Danh mục`, `Cấu trúc bảng`, `Tiêu chuẩn` tabs.
Add single `Tiêu chuẩn` tab pointing to `StandardsHubTab`.

```jsx
import StandardsHubTab from './system-config/standards-hub-tab.jsx';

const TAB_ITEMS = [
  { key: 'minio',     label: 'MinIO',       children: <MinioConfigTab /> },
  { key: 'standards', label: 'Tiêu chuẩn', children: <StandardsHubTab /> },
];
```

---

## Step 2 — `standards-hub-tab.jsx`

**Responsibilities:** profile table, profile CRUD modal, trigger SheetEditorModal, render EnumSection.

**API calls:**
- `GET /config/profiles` — list
- `GET /config/active-profile`
- `POST /config/profiles` — create
- `PUT /config/profiles/:id` — edit meta (name, description only — sheets edited in modal)
- `DELETE /config/profiles/:id`
- `PUT /config/active-profile`

**Profile table columns:** ID (+ active badge) | Tên | Sheets (tags) | Actions

**Actions per row:**
- `[Sửa bảng]` → opens `SheetEditorModal` with `profileId`
- `[Dùng]` / `[Đang dùng]` → set active
- `[Xóa]` (disabled if active)
- `[✎]` → opens meta-edit modal (name + description only)

**Create/Edit modal fields:** ID (create only), Tên, Mô tả, Sheets (tag input — array of sheet names)

**Key state:**
```jsx
const [profiles, activeId, loading]   // table data
const [sheetModalProfileId]           // null = closed, string = open
const [metaModal]                     // { open, profileId }
```

**Layout:**
```jsx
<>
  <Space style={{ marginBottom: 12 }}>
    <Button type="primary" onClick={openCreate}>+ Tạo mới</Button>
  </Space>
  <Table dataSource={profiles} columns={columns} />

  <Divider />

  <EnumSection profiles={profiles} />

  <SheetEditorModal
    profileId={sheetModalProfileId}
    open={!!sheetModalProfileId}
    onClose={() => setSheetModalProfileId(null)}
    onSaved={fetchProfiles}
  />
</>
```

---

## Step 3 — `sheet-editor-modal.jsx`

**Responsibilities:** N-sheet tab editor, add/remove/rename sheets, save schema per sheet.

**Props:** `{ profileId, open, onClose, onSaved }`

**API calls:**
- `GET /config/profiles/:id` — load `sheets[]`
- `GET /config/profiles/:id/schema/:sheetName` — per tab (lazy on tab switch)
- `PUT /config/profiles/:id/schema/:sheetName` — save fields
- `PUT /config/profiles/:id` — update profile when sheets[] changes (add/remove sheet)
- `POST /config/profiles/:id/schema/:sheetName/reset` — restore defaults

**State:**
```jsx
const [profile, setProfile]     // { sheets: [...] }
const [schemaMap, setSchemaMap] // { sheetName: fields[] }
const [activeSheet]             // currently visible tab
const [dirtySheets]             // Set of sheet names with unsaved changes
```

**Enum keys hook** — updated to include per-standard enums:
```jsx
function useEnumKeys(profileId) {
  // GET /config/profiles/:id/enums → merge global + per-standard
  // label: `${displayName} (${name})` with "(riêng)" badge if overridden
}
```

**Tab structure:**
```jsx
<Tabs
  type="editable-card"
  onEdit={(targetKey, action) => {
    if (action === 'add') handleAddSheet();
    if (action === 'remove') handleRemoveSheet(targetKey);
  }}
  activeKey={activeSheet}
  onChange={handleTabChange}
  items={profile.sheets.map(name => ({
    key: name,
    label: (
      <Space>
        {name}
        {dirtySheets.has(name) && <Badge dot />}
      </Space>
    ),
    children: <SheetFieldEditor
      profileId={profileId}
      sheetName={name}
      fields={schemaMap[name] || []}
      onChange={fields => markDirty(name, fields)}
      enumKeys={enumKeys}
    />,
  }))}
/>
```

**Add sheet flow:**
1. Prompt modal: "Tên sheet mới"
2. Validate name (no spaces, unique within profile)
3. `PUT /config/profiles/:id` with `sheets: [...old, newName]`
4. Add empty tab immediately

**Remove sheet (✕):**
1. Confirm: "Xóa sheet X? Dữ liệu cấu trúc sẽ được giữ lại trong DB."
2. `PUT /config/profiles/:id` with sheets filtered
3. Remove tab

**Save button (per sheet):**
- `PUT /config/profiles/:id/schema/:sheetName` with current fields
- Clear dirty flag for that sheet

**Footer:** `[Đóng]` — warns if any dirty sheets remain

**SheetFieldEditor sub-component** (extracted from current `schema-management-tab.jsx`):
- Field table: # | name | label | type | required | Tham số | severity | [del]
- `[+ Thêm trường]` `[Khôi phục mặc định]` `[Lưu sheet]`
- Reuse `TypeParamInputs` component from existing schema-management-tab

---

## Step 4 — `enum-section.jsx`

**Responsibilities:** Collapse list of enums, global vs per-standard view, clone/revert actions.

**Props:** `{ profiles: Profile[] }`

**State:**
```jsx
const [scopeId, setScopeId]  // 'global' | profileId
const [enums, setEnums]      // { NAME: { displayName, values, builtin, overridden? } }
```

**API calls:**
- `scopeId === 'global'`: `GET /config/enums`
- `scopeId === profileId`: `GET /config/profiles/:id/enums`

**"Xem theo" selector:**
```jsx
<Select value={scopeId} onChange={setScopeId} style={{ width: 200 }}>
  <Option value="global">Global (dùng chung)</Option>
  {profiles.map(p => <Option key={p.id} value={p.id}>{p.id} — {p.name}</Option>)}
</Select>
```

**Collapse item label:**
```jsx
<Space>
  <Text strong>{info.displayName}</Text>
  <Tag color="blue" style={{ fontFamily: 'monospace' }}>{name}</Tag>
  {info.overridden && <Tag color="orange">riêng</Tag>}
  {info.builtin && <Tag>hệ thống</Tag>}
  <Text type="secondary">({info.values?.length || 0} giá trị)</Text>
</Space>
```

**Collapse item extra (per-standard scope only):**
```jsx
{scopeId !== 'global' && (
  info.overridden
    ? <Button size="small" onClick={() => handleRevertToGlobal(name)}>Dùng global</Button>
    : <Button size="small" onClick={() => handleClone(name)}>Clone từ global</Button>
)}
```

**EnumPanel** (reuse from existing `enum-management-tab.jsx`):
- Same field editor
- On save: if `scopeId === 'global'` → `PUT /config/enums/:name`
- If `scopeId === profileId` → `PUT /config/profiles/:id/enums/:name`

**Clone flow:**
1. `POST /config/profiles/:id/enums/:name/clone`
2. Reload enum list
3. Panel now shows overridden values (same as global initially)

**Revert flow:**
1. Confirm: "Bỏ bản riêng và dùng lại giá trị global?"
2. `DELETE /config/profiles/:id/enums/:name`
3. Reload

---

## Component Size Budget

| Component | Est. Lines | Strategy |
|-----------|-----------|----------|
| `standards-hub-tab.jsx` | ~150 | Profile table + meta modal + wires SheetEditorModal + EnumSection |
| `sheet-editor-modal.jsx` | ~180 | Modal + tabs + SheetFieldEditor inline |
| `enum-section.jsx` | ~160 | Scope selector + collapse + clone/revert actions |
| Total new | ~490 | Replaces ~510 lines across 3 old files |

---

## Todo

- [ ] Update `SystemConfigPage.jsx` — swap to 2 tabs
- [ ] Create `standards-hub-tab.jsx` — profile table + meta CRUD + trigger modal
- [ ] Create `sheet-editor-modal.jsx` — N-sheet tab editor + field table
- [ ] Create `enum-section.jsx` — scope selector + per-standard clone/revert
- [ ] Update `useEnumKeys` hook in sheet-editor-modal to call `/profiles/:id/enums`
- [ ] Delete old tab files: `profile-management-tab.jsx`, `schema-management-tab.jsx`, `enum-management-tab.jsx`
- [ ] Test: create profile → sửa bảng → thêm sheet → lưu → reload ✓
- [ ] Test: clone enum for TT04, edit values, verify TT05 unaffected ✓
- [ ] Rebuild frontend + restart containers

## Success Criteria

- SystemConfigPage has exactly 2 tabs: MinIO + Tiêu chuẩn
- Profile table shows ID, Tên, Sheets (as tags), Actions
- "Sửa bảng" opens modal with correct sheet tabs
- Adding a sheet updates profile.sheets[] and shows new tab
- Removing a sheet (✕) updates profile.sheets[] and removes tab
- "Xem theo: TT04" in Danh mục section shows TT04-scoped enums
- Clone → edit → TT05 still uses global values
- All changes persist across page reload
