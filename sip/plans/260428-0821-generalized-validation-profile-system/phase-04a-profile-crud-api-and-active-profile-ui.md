---
title: "Phase 4a: Profile CRUD API + Active Profile UI"
status: completed
priority: P1
effort: 4h
risk: Medium
completed: 2026-04-28
---

# Phase 4a: Profile CRUD API + Active Profile UI

## Overview

Add profile management: create/read/update/delete named profiles (TT05, TT04, custom), set active profile, expose via REST API, and add "Tiêu chuẩn" tab to `SystemConfigPage`.

## Context Links

- Plan: `plan.md`
- Brainstorm: `plans/reports/brainstorm-260428-0821-generalized-validation-profile-system.md`
- Current cache service: `backend/src/services/schema-cache-service.js`
- Current config routes: `backend/src/routes/config-routes.js`
- SystemConfigPage: `frontend/src/pages/SystemConfigPage.jsx`

## DB Schema

```
AppConfig key          Value shape
─────────────────────────────────────────────────────
active_profile         "TT05"
profile:TT05           { name: "Thông tư 05", primarySheet: "Ho_so",
                         secondarySheet: "Van_ban", description: "..." }
profile:TT04           { name: "Thông tư 04", primarySheet: "MucLuc",
                         secondarySheet: "TaiLieu", description: "..." }
```

Profiles are identified by their key suffix (e.g. `TT05`). Profile ID must match `^[A-Za-z0-9_-]{2,20}$`.

## Requirements

- CRUD profiles (create, list, get, update, delete)
- Cannot delete the currently active profile
- `GET /api/config/active-profile` → current active profile object
- `PUT /api/config/active-profile` → set active (body: `{ profileId }`)
- Seed default TT05 profile on first setup if not exists
- Frontend: "Tiêu chuẩn" tab shows list of profiles, CRUD modal, "Đặt làm mặc định" button

## API Endpoints

```
GET  /api/config/profiles                → list all profiles (array of {id, name, primarySheet, secondarySheet, description})
POST /api/config/profiles                → create profile (body: {id, name, primarySheet, secondarySheet, description})
GET  /api/config/profiles/:id            → get one profile
PUT  /api/config/profiles/:id            → update profile
DELETE /api/config/profiles/:id          → delete (reject if active)
GET  /api/config/active-profile          → { profileId, ...profileData }
PUT  /api/config/active-profile          → body: { profileId } → set active
```

## Related Code Files

**Modify:**
- `backend/src/services/schema-cache-service.js` — add profile cache + helpers
- `backend/src/routes/config-routes.js` — add profile routes
- `frontend/src/pages/SystemConfigPage.jsx` — add Tiêu chuẩn tab

**Create:**
- `frontend/src/pages/system-config/profile-management-tab.jsx`

## Implementation Steps

### Backend: schema-cache-service.js additions

```js
const profileCache = new Map(); // profileId → profileData
let activeProfileCache = null;  // string | null

async function getActiveProfileId() {
  if (activeProfileCache) return activeProfileCache;
  if (!isDbConnected()) return 'TT05';
  const stored = await AppConfig.findOne({ key: 'active_profile' }).lean();
  activeProfileCache = stored?.value || 'TT05';
  return activeProfileCache;
}

async function getActiveProfile() {
  const id = await getActiveProfileId();
  return getProfile(id);
}

async function getProfile(profileId) {
  if (profileCache.has(profileId)) return profileCache.get(profileId);
  if (!isDbConnected()) return defaultProfile(profileId);
  const stored = await AppConfig.findOne({ key: `profile:${profileId}` }).lean();
  const data = stored?.value || defaultProfile(profileId);
  profileCache.set(profileId, data);
  return data;
}

function defaultProfile(profileId) {
  // Built-in fallback for TT05 so system works without DB profiles
  if (profileId === 'TT05') {
    return { name: 'Thông tư 05', primarySheet: 'Ho_so', secondarySheet: 'Van_ban', description: '' };
  }
  return null;
}

function invalidateProfiles() {
  profileCache.clear();
  activeProfileCache = null;
}

// Export additions: getActiveProfileId, getActiveProfile, getProfile, invalidateProfiles
```

Update `invalidateAll()` to also call `invalidateProfiles()`.

### Backend: config-routes.js — profile routes

Add after existing enum/schema routes:

```js
const PROFILE_ID_RE = /^[A-Za-z0-9_-]{2,20}$/;

// Helper: read all profile IDs from DB
async function listProfileIds() {
  const docs = await AppConfig.find({ key: /^profile:/ }).lean();
  return docs.map(d => d.key.replace('profile:', ''));
}

// GET /profiles
router.get('/profiles', async (req, res, next) => { ... });

// POST /profiles
router.post('/profiles', async (req, res, next) => {
  const { id, name, primarySheet, secondarySheet, description = '' } = req.body;
  // validate: id matches regex, name/primarySheet/secondarySheet non-empty
  // reject duplicate key
  // upsert AppConfig { key: `profile:${id}`, value: { name, primarySheet, secondarySheet, description } }
  // schemaCacheService.invalidateProfiles()
});

// GET /profiles/:id, PUT /profiles/:id, DELETE /profiles/:id (reject if active)

// GET /active-profile
router.get('/active-profile', async (req, res, next) => {
  const id = await schemaCacheService.getActiveProfileId();
  const data = await schemaCacheService.getProfile(id);
  res.json({ success: true, data: { profileId: id, ...data } });
});

// PUT /active-profile
router.put('/active-profile', async (req, res, next) => {
  const { profileId } = req.body;
  // verify profile exists
  await AppConfig.findOneAndUpdate({ key: 'active_profile' }, { value: profileId }, { upsert: true });
  schemaCacheService.invalidateProfiles();
  schemaCacheService.invalidateAll();
  res.json({ success: true });
});
```

### Frontend: profile-management-tab.jsx

Component structure:
- Table: columns = [ID, Tên profile, Sheet chính, Sheet phụ, Mô tả, Actions]
- Actions per row: Edit (modal), Delete (confirm, disabled if active), Set Active (button)
- Active profile shown with a Tag "Đang dùng"
- "Thêm profile" button → modal with form fields: ID, Tên, Sheet chính, Sheet phụ, Mô tả
- On load: `GET /api/config/profiles` + `GET /api/config/active-profile`
- Seed logic: if list is empty, auto-create TT05 default via POST

### Frontend: SystemConfigPage.jsx

Add 4th tab:
```jsx
import ProfileManagementTab from './system-config/profile-management-tab.jsx';

const TAB_ITEMS = [
  { key: 'minio',   label: 'MinIO',          children: <MinioConfigTab /> },
  { key: 'enums',   label: 'Danh mục',        children: <EnumManagementTab /> },
  { key: 'schema',  label: 'Cấu trúc bảng',  children: <SchemaManagementTab /> },
  { key: 'profile', label: 'Tiêu chuẩn',     children: <ProfileManagementTab /> },
];
```

## Todo

- [ ] Add `profileCache`, `activeProfileCache`, `getActiveProfileId()`, `getActiveProfile()`, `getProfile()`, `defaultProfile()`, `invalidateProfiles()` to `schema-cache-service.js`
- [ ] Update `invalidateAll()` to call `invalidateProfiles()`
- [ ] Export new methods from `schema-cache-service.js`
- [ ] Add profile CRUD routes to `config-routes.js`
- [ ] Add active-profile GET/PUT routes to `config-routes.js`
- [ ] Create `frontend/src/pages/system-config/profile-management-tab.jsx`
- [ ] Add "Tiêu chuẩn" tab to `SystemConfigPage.jsx`
- [ ] Test: create profile, set active, verify `getActiveProfile()` returns correct sheet names

## Success Criteria

- `GET /api/config/profiles` returns list with at least TT05
- `PUT /api/config/active-profile` switches active profile
- Cannot delete active profile (returns 400)
- UI shows profile list; can create/edit/set-active
- `getActiveProfile()` returns `{ primarySheet: 'Ho_so', secondarySheet: 'Van_ban' }` for TT05 with no DB

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Missing TT05 seed | `defaultProfile('TT05')` fallback in service layer |
| Profile delete race with active | Server-side check before delete |
| `invalidateProfiles()` not called on update | Always call after any write to `profile:*` or `active_profile` |
