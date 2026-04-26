# Visual Language & Layout

## Color Palette

### Semantic Colors

| Màu | Hex | Ứng dụng |
|-----|-----|---------|
| **Navy** | #0D1B2A | Header, footer, dark text, authority |
| Navy (hover) | #162135 | Hover states, darker variant |
| **Teal** | #0E9F8E | Primary action, active states, CTA |
| Teal (hover) | #0A7266 | Primary button hover |
| Teal (light) | #E0F5F2 | Light background for teal elements |
| **Green** | #1A7A5E | Success, done, valid |
| Green (light) | #E6F7F1 | Success background |
| **Amber** | #D4860A | Warning, needs attention |
| Amber (light) | #FEF3E2 | Warning background |
| **Red** | #C0392B | Error, invalid, block |
| Red (light) | #FEE8E8 | Error background |
| **Blue** | #1A5CA8 | Info, additional info |
| Blue (light) | #EBF4FF | Info background |
| **Off-white** | #F7F8FA | Page background, contrast |
| **White** | #FFFFFF | Card, modal, container bg |

### Text Colors

| Use | Hex | Usage |
|-----|-----|-------|
| Primary text | #0D1B2A | Navy — body, headings |
| Secondary text | #3A4B5C | Darker gray — labels, hints |
| Tertiary text | #6B7C8D | Light gray — disabled, metadata |
| Quaternary text | #A0A6AA | Very light — disabled state |

### Border & Dividers

- Default: `rgba(14,31,50,0.12)` (light navy with transparency)
- Medium: `rgba(14,31,50,0.18)` (slightly darker)
- Light: `rgba(14,31,50,0.06)` (very subtle)

---

## Typography

| Element | Font | Size | Weight | Example |
|---------|------|------|--------|---------|
| Page title | Instrument Serif | 28px | 400 | Home page title (rare) |
| Section title | Noto Sans | 16px | 500 | Card header, panel title |
| Body text | Noto Sans | 14px | 400 | Paragraphs, descriptions |
| Form label | Noto Sans | 12px | 500 | Input labels, tab titles |
| Code/mono | IBM Plex Mono | 11-13px | 400 | Checksums, timestamps, tree |
| Small text | Noto Sans | 12px | 400 | Hints, metadata, tabs |

**Font Stack:**
```css
--sans: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--mono: 'IBM Plex Mono', 'Courier New', monospace;
--serif: 'Instrument Serif', 'Georgia', serif;
```

---

## Layout Structure

### Full Page Layout
```
┌────────────────────────────────────────────────────┐
│ Header (58px sticky, navy bg, 100% width)          │
├────────────────────────────────────────────────────┤
│                                                     │
│  Content Area (max-width: 960px, centered)        │
│  padding: 2rem 1.5rem 4rem                         │
│                                                     │
├────────────────────────────────────────────────────┤
│ Footer (navy bg, 100% width)                       │
└────────────────────────────────────────────────────┘
```

### Content Grid (2-Column)
```
Main Area (16/24)          Sidebar (8/24)
─────────────────────      ─────────
│ Card 1                   │ Info box
│                          │
│ Card 2                   │ Filters
│                          │
│ Card 3                   │ Status
└─────────────────────     └─────────

gap: 24px (1.5rem)
Max-width: 960px total
Mobile: 1 column (full width)
```

### Responsive Breakpoints
- **xs:** 0px → 1 column
- **sm:** 576px → 1 column
- **md:** 768px → 2 columns (16/8 split)
- **lg:** 992px → 2 columns
- **xl:** 1200px → 2 columns (max-width 960px)

---

## Spacing System

| Scale | Value | Usage |
|-------|-------|-------|
| xs | 8px | Tight spacing, small gaps |
| sm | 12px | Component internal |
| md | 16px | Standard padding, margin |
| lg | 24px | Section spacing, grid gap |
| xl | 32px | Large sections, top margin |

**Header & Footer:**
- Height: 58px (header)
- Padding: 0 2rem (horizontal)
- Top padding: 2rem
- Bottom padding: 4rem (content)

---

## Radius & Borders

| Type | Value | Usage |
|------|-------|-------|
| Large | 10px | Card, modal, button |
| Medium | 8px | Input, select, small card |
| Small | 6px | Alert, chip, tab |
| Extra small | 4px | Badge, very small element |

**Border Width:** 1px (default)  
**Box Shadow:** `0 2px 12px rgba(13,27,42,0.07)` (default card)

---

## Visual Hierarchy

1. **Header** — Navy bg, sticky, highest z-index (100)
2. **Main content** — White cards on off-white bg
3. **Sidebar** — Right column, same card style
4. **Footer** — Navy bg, lowest visual weight
5. **Modals** — Overlay with white bg, z-index 1000+

---

## Color Meanings

| Color | Meaning | Context |
|-------|---------|---------|
| Navy | Authority, official, formal | Header, buttons, text |
| Teal | Action, active, primary | CTA, links, highlights |
| Green | Success, valid, complete | Done badges, checkmarks |
| Amber | Warning, caution, needs review | Warnings, flags |
| Red | Error, invalid, blocked | Errors, rejections, danger |
| Blue | Info, notice, additional | Info messages, hints |
| Gray | Disabled, secondary, inactive | Disabled buttons, hints |

---

## Accessibility

- **Contrast:** All text passes WCAG AA (4.5:1 for body, 3:1 for large text)
- **Color alone:** Never use color alone to convey information (also use icons, text)
- **Motion:** Respect `prefers-reduced-motion` media query
- **Keyboard:** All interactive elements keyboard-accessible (Tab order)

---

**Mục tiêp:** Thiết kế giao diện nhất quán, chuyên nghiệp, dễ sử dụng.
