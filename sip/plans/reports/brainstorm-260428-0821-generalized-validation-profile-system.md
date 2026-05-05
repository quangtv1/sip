# Brainstorm: Generalized Validation Profile System

**Date:** 2026-04-28  
**Status:** Approved → Planning

---

## Problem Statement

Hệ thống validation hiện tại (Phase 2+3) hardcode 3 thứ:
1. **Sheet names**: `Ho_so`, `Van_ban` — cứng trong excel-parser + schema-cache
2. **Field types**: 4 loại (string, date, positiveInt, enum)
3. **Schema scope**: không có namespace profile — không hỗ trợ đa tiêu chuẩn

Mục tiêu: phần Cấu hình cho phép gán động tiêu chuẩn validate mà không cần sửa code.

---

## Requirements (Confirmed)

- **Đa tiêu chuẩn song song**: nhiều profile (TT05, TT04, custom) tồn tại đồng thời
- **1 active profile**: global, dossier lưu profileId tại thời điểm tạo
- **Sheet names per profile**: configurable, định nghĩa trong profile
- **Extended field types**: float, boolean, regex (pattern tự định nghĩa), email, url, range, dependent-enum
- **Composite/computed**: DEFER — expression eval = security risk

---

## Approved Architecture: Full Profile System

### DB Schema

```
AppConfig keys:
  active_profile          → 'TT05'
  profile:TT05            → { name, primarySheet: 'Ho_so', secondarySheet: 'Van_ban', description }
  profile:TT04            → { name, primarySheet: 'MucLuc', secondarySheet: 'TaiLieu', description }
  schema:TT05:Ho_so       → [ fieldDefs ]
  schema:TT05:Van_ban     → [ fieldDefs ]
  enum:NGON_NGU           → [ values ]  ← shared, not profile-scoped

Dossier model:
  + profileId: String (default 'TT05' for existing dossiers)
```

### Extended Field Types

| Type | New Params | Validation |
|---|---|---|
| `float` | `min?`, `max?` | Số thực dương, tùy chọn range |
| `boolean` | — | true/false/1/0/có/không |
| `regex` | `pattern: string` | Compile + test, pattern stored in field def |
| `email` | — | Built-in RFC email validation |
| `url` | — | Built-in URL format validation |
| `range` | `min`, `max`, `isFloat?` | Số trong [min, max] |
| `dependent-enum` | `dependsOn: {field, valueMap: {val→enumKey}}` | Enum resolved based on sibling field |
| `composite` | — | **DEFERRED** |

### Component Changes

```
schema-cache-service.js
  + getActiveProfile()             → { primarySheet, secondarySheet, ... }
  + getProfile(profileId)
  + getSchema(profileId, sheet)    ← new signature (old getSchema(sheet) → lookup active profile)
  + invalidateProfile(profileId)

excel-parser-service.js
  → getActiveProfile() → { primarySheet, secondarySheet }
  → Sheet names from profile, not hardcoded

field-validator-service.js
  → Extended type dispatcher (7 new types + composite stub)

config-routes.js
  + GET  /api/config/profiles
  + POST /api/config/profiles
  + GET/PUT /api/config/profiles/:id
  + GET/PUT/POST /api/config/profiles/:id/schema/primary
  + GET/PUT/POST /api/config/profiles/:id/schema/secondary
  + GET/PUT /api/config/active-profile

SystemConfigPage.jsx
  + "Tiêu chuẩn" tab: list profiles, CRUD, set active
  Schema tab: scoped per profile (sub-select profile)
```

### Migration Plan

| Item | Action |
|---|---|
| Existing `schema:Ho_so` in DB | Keep as-is; migrate to `schema:TT05:Ho_so` on first profile setup |
| Existing dossiers | Add `profileId = 'TT05'` via migration script |
| `VALID_SHEETS` in cache service | Replace with dynamic profile sheet lookup |
| `schema:Ho_so` cache key | Replace with `profileId:sheet` composite key |

---

## Implementation Phases

| Phase | Nội dung | Effort | Risk |
|---|---|---|---|
| 4a | Profile CRUD API + active profile setting + UI tab | 4h | Medium |
| 4b | Schema namespace migration: cache keys → profileId:sheet, update parser + validator | 4h | Medium-High |
| 4c | Extended types: float, boolean, regex, email, url, range | 3h | Low |
| 4d | Dependent-enum type | 3h | Medium |
| 4e | Composite type | Deferred | High |

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Migration breaks existing schemas | High | Keep old keys as fallback, migrate lazily |
| Active profile switch mid-operation | Medium | Lock profile during active uploads |
| Dependent-enum circular deps | Medium | Validate no cycles on save |
| Regex pattern from DB — ReDoS | Medium | Validate pattern on save, reject known dangerous patterns |

---

## Success Criteria

- Admin tạo profile TT04 với sheet names khác, hệ thống đọc đúng sheet khi upload
- Dossier cũ (TT05) vẫn validate đúng khi chuyển active profile sang TT04
- Admin thêm field type `regex` với pattern tùy chọn → validate đúng
- `dependent-enum`: field B chọn enum khác nhau tùy theo value field A

---

## Deferred

- **Composite/computed fields**: cần expression engine an toàn, để Phase 5
