# Brainstorm: Standards Tab Redesign — Excel Tabs on Detail Page

## Problem
Current hub embeds full detail inline in editable-card tabs → cluttered, confusing navigation.
Tables use 11–12px font → too small to read comfortably.

## Requirements
1. Hub: simple list (Table) or icon grid (Card) — NO embedded detail
2. Click standard → detail page with Excel-style tabs:
   - `[Ho_so]` `[Van_ban]` `[...]` → each sheet = 1 tab (dynamic)
   - `[Danh mục]` → EnumSection
   - `[Cấu hình ⚙]` → profile meta + edit inline
3. Font size in sheet tables: 11–12px → 14px, table size "middle"

## Chosen Design: Option B — Dynamic Sheet Tabs

### Layer 1 — Hub (unchanged logic, reverted layout)
```
[≡ Table] [⊞ Card]                     [+ Thêm tiêu chuẩn]
Table: click row → detail
Card:  click card → detail  (no AddCard inline, keep toolbar button)
```
- Remove editable-card Excel tabs from hub
- Restore `selected`/`setSelected` navigation

### Layer 2 — Detail Page
```
← Tiêu chuẩn > TT05 — Thông tư 05    [Sửa] [Dùng] [Xóa]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Ho_so]  [Van_ban]  [Phu_luc]  │  [📚 Danh mục]  [⚙ Cấu hình]
─────────────────────────────────────────────────────────
[Tab content — full width]
```
Tab bar: Ant Design `Tabs type="line"` (or "card")
- Sheet tabs: dynamic from `profile.sheets`, accent dot per sheet
- Separator: visual divider between sheet tabs and meta tabs
- `Danh mục` tab: EnumSection
- `Cấu hình` tab: profile summary + edit form inline (no separate modal)

### Font Size Fix
`sheet-section.jsx`:
- Cell font: 11–12px → **14px**
- Table `size="small"` → **`size="middle"`**
- Column widths increase proportionally

## Files to Change
| File | Change |
|------|--------|
| `standards-hub-tab.jsx` | Revert to list/grid only; restore `selected`/`setSelected` |
| `standard-detail-page.jsx` | Replace single-scroll layout with inner Tabs (sheet + Danh mục + Cấu hình) |
| `sheet-section.jsx` | Font 14px, size="middle", wider columns |

## Key UX Rules
- Default tab: first sheet (index 0)
- Sheet tabs: monospace ID, accent color dot
- Meta tabs (Danh mục, Cấu hình): visually distinguished (icon + different style)
- Breadcrumb + actions always visible above tabs
- One sheet editable at a time (existing behavior preserved)
