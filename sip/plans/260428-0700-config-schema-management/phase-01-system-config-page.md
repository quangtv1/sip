# Phase 1: SystemConfigPage (MinIO UI)

## Context Links
- Route pattern: `frontend/src/App.jsx`
- Admin page pattern: `frontend/src/pages/UserManagementPage.jsx`
- Sidebar: `frontend/src/components/layout/AppSidebar.jsx` (already has `/config` entry for Admin)
- API: `backend/src/routes/config-routes.js` (GET/POST `/api/config/minio` already exist)

## Overview
- **Priority:** P1
- **Status:** Completed
- **Effort:** 2h
- **Risk:** Low — purely additive frontend, backend API already exists

## Key Insights
- Sidebar already has `/config` nav item with `SettingOutlined` icon, Admin-only
- `GET /api/config/minio` returns current config with masked secretKey
- `POST /api/config/minio` validates, tests connection, persists, hot-reloads
- `UserManagementPage` is the pattern to follow: Tabs component, `apiClient` for HTTP

## Requirements

### Functional
- Form pre-fills from `GET /api/config/minio` on mount
- Fields: endpoint (text), port (number), useSSL (Switch), accessKey (Input), secretKey (Input.Password)
- "Test ket noi" button calls `POST /api/config/minio` with form values
- Show success/error Alert after test
- Loading states on fetch and submit

### Non-functional
- Admin-only (route already inside `ProtectedRoute`; RBAC enforced server-side)
- Responsive form layout

## Architecture
```
SystemConfigPage.jsx
  ├── MinioConfigTab (Phase 1)
  ├── EnumManagementTab (Phase 2 — future)
  └── SchemaManagementTab (Phase 3 — future)
```

Phase 1 creates the page with a single tab. Structure supports adding tabs in later phases.

## Related Code Files

### Modify
- `frontend/src/App.jsx` — add `<Route path="config" element={<SystemConfigPage />} />`

### Create
- `frontend/src/pages/SystemConfigPage.jsx` — main page with Tabs, MinIO form

## Implementation Steps

1. **Create `SystemConfigPage.jsx`**
   - Import: `useState`, `useEffect`, `useCallback` from React
   - Import: `Typography`, `Tabs`, `Form`, `Input`, `InputNumber`, `Switch`, `Button`, `Alert`, `Space`, `message` from antd
   - Import `apiClient` from `../config/api-client.js`
   - Create `MinioConfigTab` component:
     - State: `loading`, `saving`, `error`, `success`
     - `useEffect` → fetch `GET /api/config/minio`, populate form via `form.setFieldsValue(data.data)`
     - Form with `Form.Item` for each field:
       - `endpoint`: `<Input />`, rules: required
       - `port`: `<InputNumber min={1} max={65535} />`, rules: required
       - `useSSL`: `<Switch />`, valuePropName="checked"
       - `accessKey`: `<Input />`, rules: required
       - `secretKey`: `<Input.Password />`, rules: required, placeholder="***"
     - Submit handler: `POST /api/config/minio` with form values
     - Show `Alert` success or error after submit
   - Create `SystemConfigPage` default export:
     - `<Title level={4}>Cau hinh he thong</Title>`
     - `<Tabs items={[{ key: 'minio', label: 'MinIO', children: <MinioConfigTab /> }]} />`

2. **Update `App.jsx`**
   - Import `SystemConfigPage` from `./pages/SystemConfigPage.jsx`
   - Add route: `<Route path="config" element={<SystemConfigPage />} />` inside AppLayout children (after `users` route)

## Todo List

- [x] Create `frontend/src/pages/SystemConfigPage.jsx` with MinioConfigTab
- [x] Add route in `frontend/src/App.jsx`
- [x] Verify sidebar nav works (already configured)
- [x] Test: form loads existing config, submit tests connection, shows result
- [x] Verify existing tests still pass

## Success Criteria
- Navigate to `/config` as Admin → see MinIO config form
- Form pre-fills with current config (secretKey shows `***`)
- Click "Test ket noi" → success message on valid config, error on invalid
- Non-admin users cannot see `/config` in sidebar

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API endpoint changes | Low | Low | API already stable and tested |

## Security Considerations
- secretKey never displayed (API returns `***`)
- Admin-only route enforced server-side via `requireRole(ROLES.ADMIN)`
- secretKey transmitted over HTTPS only

## Next Steps
- Phase 2 will add "Danh muc" tab to this same page
