# Brainstorm: Tab "Tiêu chuẩn" Thống nhất

**Date:** 2026-04-30 | **Status:** Approved → Plan

## Vấn đề
3 tab riêng biệt (Tiêu chuẩn, Cấu trúc bảng, Danh mục) gây workflow bị ngắt quãng.
- Danh mục global không rõ gắn với tiêu chuẩn nào
- Profile cố định 2 sheet (primarySheet/secondarySheet) — không mở rộng được

## Quyết định đã chốt

| Điểm | Quyết định |
|---|---|
| Số sheet/tiêu chuẩn | Động — N sheet tuỳ ý |
| Enum scope | Global + Clone per-standard khi cần |
| UI pattern sheet editor | Modal trung tâm |
| Tabs sau khi merge | MinIO + Tiêu chuẩn (2 tabs) |

## Thiết kế

### Layout Tab Tiêu chuẩn
```
[+ Tạo mới]
Table: ID | Tên | Sheets | Actions([Sửa bảng][Dùng][Xóa])

──────────────────────────────────────────
DANH MỤC  [+ Thêm] [Tải lại]
Xem theo: [Global ▼ / TT05 / TT04 ...]
Collapse list: ENUM_NAME (Tag mã) — [Clone/Dùng global]
```

### Sheet Editor Modal
```
Title: "Cấu trúc bảng — {profileId}"
Tabs: [Sheet1] [Sheet2 ✕] [+ Thêm sheet]
  Tên sheet: [input]
  Table: # | name | type | required | severity | Tham số
  [+ Thêm trường] [Khôi phục mặc định]
  Footer: [Lưu sheet] [Đóng]
```

### Enum: Global + Clone
- DB key global: `enum:NAME`
- DB key per-standard: `enum:profileId:NAME`
- UI: "Clone từ global" tạo bản riêng; "Dùng global" xóa bản riêng

## Data Model Change

**Profile — breaking change:**
```js
// Cũ: { primarySheet: "Ho_so", secondarySheet: "Van_ban" }
// Mới: { sheets: ["Ho_so", "Van_ban"] }
```
Migration inline: `getProfile()` tự convert cũ → mới khi đọc.

**Schema API — route change:**
```
Cũ: GET/PUT /config/profiles/:id/schema/:sheetType (primary|secondary)
Mới: GET/PUT /config/profiles/:id/schema/:sheetName (tên thực của sheet)
```

## Files thay đổi

| File | Loại thay đổi |
|---|---|
| `backend/src/routes/config-routes.js` | Update profile CRUD (sheets[]), schema routes dùng sheetName |
| `backend/src/services/schema-cache-service.js` | Migration + per-standard enum lookup |
| `frontend/src/pages/SystemConfigPage.jsx` | Giảm còn 2 tabs |
| `frontend/src/pages/system-config/profile-management-tab.jsx` | Rewrite → standards hub |
| `frontend/src/pages/system-config/schema-management-tab.jsx` | Extract → modal component |
| `frontend/src/pages/system-config/enum-management-tab.jsx` | Integrate vào hub |

## Rủi ro

1. `/config/profiles/:id/schema/primary|secondary` bị break — cần scan usage
2. `profile.primarySheet` reference trong code cũ — cần migration inline
3. Per-standard enum resolution cần update `field-validator-service.js`

## Unresolved Questions
- Khi xóa sheet khỏi tiêu chuẩn, schema DB key có bị xóa không hay giữ lại?
- Per-standard enum có hiển thị trong dropdown "Tham số" của sheet editor không (cần lọc theo tiêu chuẩn đang chỉnh)?
