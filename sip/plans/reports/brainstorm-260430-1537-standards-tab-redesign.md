# Brainstorm: Redesign Tab "Tiêu chuẩn"

## Problem Statement
Tab Tiêu chuẩn hiện tại (dark sidebar + detail panel) có các vấn đề:
- Không có view toggle (Table/Card)
- Sheet editor là modal riêng → nhiều click
- Không có breadcrumb
- Không phân biệt view/edit mode — dễ sửa nhầm
- Danh mục ẩn sau tab riêng

## Requirements
1. Toggle Table view / Card view (icon góc trên phải)
2. Click vào tiêu chuẩn → trang detail cuộn dài, hiện tất cả cùng lúc
3. Breadcrumb: `Tiêu chuẩn > TT05 — Thông tư 05`
4. Mặc định read-only
5. Mỗi sheet có nút "Chỉnh sửa" / "Lưu sheet này" / "Hủy" riêng
6. Danh mục (EnumSection) ở cuối trang

## Final Design

### Layer 1 — Standards List Page

**Table view:**
```
[⊞ Table] [⊟ Card]                           [+ Thêm tiêu chuẩn]
┌──────┬──────────────────┬──────────────┬──────────┐
│ Mã   │ Tên tiêu chuẩn   │ Sheets       │ Trạng    │
├──────┼──────────────────┼──────────────┼──────────┤
│ TT05 │ Thông tư 05/2023 │ Ho_so Van_ban│ ● dùng   │  ← click row → detail
│ TT07 │ Thông tư 07/2023 │ Ho_so        │          │
└──────┴──────────────────┴──────────────┴──────────┘
```

**Card view:**
```
[⊞] [⊟]                                      [+ Thêm]
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ 🔵 TT05     │  │ 🟢 TT07     │  │      +       │
│ Thông tư 05 │  │ Thông tư 07 │  │  Thêm mới   │
│ ● đang dùng │  │             │  │             │
│ Ho_so       │  │             │  │             │
│ Van_ban     │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
```

- Click row / card → vào detail page
- View toggle giữ state (localStorage hoặc useState)

### Layer 2 — Standard Detail Page (single scroll)

```
← Tiêu chuẩn > TT05 — Thông tư 05    [✎ Sửa thông tin] [Dùng] [Xóa]
═══════════════════════════════════════════════════════════════════

┌── Sheet: Ho_so ──────────────────── [✎ Chỉnh sửa] ──────────────┐
│  #  │ Tên trường    │ Nhãn          │ Kiểu     │ Bắt buộc │ Tham số │
│  0  │ so_hieu       │ Số hiệu       │ string   │ true     │ —       │
│  1  │ ngay_ban_hanh │ Ngày ban hành │ date     │ true     │ —       │
└──────────────────────────────────────────────────────────────────┘

  ↓ Khi click "Chỉnh sửa" trên sheet Ho_so:

┌── Sheet: Ho_so ────────── [Lưu sheet này] [Hủy] ─────────────────┐
│  #  │ [Tên trường  ]│ [Nhãn         ]│ [Kiểu ▼] │ [Bắt buộc ▼]│ [Tham số] │ 🗑 │
│  0  │ [so_hieu     ]│ [Số hiệu      ]│ [string] │ [true      ]│ —         │ 🗑 │
│  1  │ [ngay_...    ]│ [Ngày b...    ]│ [date  ] │ [true      ]│ —         │ 🗑 │
│                                                       [+ Thêm trường]       │
│                                        [Khôi phục mặc định]                 │
└──────────────────────────────────────────────────────────────────┘

┌── Sheet: Van_ban ────────────────── [✎ Chỉnh sửa] ──────────────┐
│  (tương tự)                                                        │
└──────────────────────────────────────────────────────────────────┘

┌── Danh mục ──────────────────────────────────────────────────────┐
│  EnumSection (defaultScopeId = profile.id)                        │
└──────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
standards-hub-tab.jsx          ← List page + view toggle + form modal
  ├── standard-card.jsx        ← Card view item
  └── standard-detail-page.jsx ← Detail scroll page
        ├── sheet-section.jsx  ← Per-sheet read/edit block (replaces sheet-editor-modal)
        └── enum-section.jsx   ← Existing, reused
```

## Key UX Rules
- Only ONE sheet in edit mode at a time (editing Ho_so auto-cancels any other)
- Edit mode per sheet: inline table row → inputs
- Dirty indicator (dot badge) trên sheet header khi có unsaved changes
- "Sửa thông tin" (meta: name/description/sheets list) → riêng, small modal
- Lưu sheet: PUT /config/profiles/:id/schema/:sheet
- Khôi phục mặc định: POST /config/profiles/:id/schema/:sheet/reset

## Files to Create/Modify
| File | Action |
|------|--------|
| `standards-hub-tab.jsx` | Rewrite — list page with toggle |
| `standard-detail-page.jsx` | NEW — replaces standard-detail-panel.jsx |
| `sheet-section.jsx` | NEW — inline read/edit table per sheet |
| `standard-card.jsx` | NEW — card view item |
| `standard-detail-panel.jsx` | DELETE (replaced) |
| `sheet-editor-modal.jsx` | DELETE (replaced by inline) |
| `enum-section.jsx` | Keep as-is |

## Risk / Trade-offs
- Sheet editor modal → inline: larger page but fewer clicks ✓
- All sheets visible: potentially long page → add sticky sheet headers or collapse option (v2)
- One sheet editable at a time: simple locking logic needed
