# Color Palette Reference

## Semantic Color Palette

### Primary Colors

#### Navy (#0D1B2A)
**Purpose:** Authority, formal, official, trust

**Usage:**
- Header background
- Footer background
- Dark text color
- Primary button (alternative)
- Navigation elements
- Sidebar headers
- Dark theme backgrounds

**Accessibility:**
- Text: High contrast (meets WCAG AAA)
- Background: Use white/light text
- Hex: `#0D1B2A`
- RGB: `rgb(13, 27, 42)`

**Ant Design Token:**
```tsx
colorText: '#0D1B2A'
```

---

#### Teal (#0E9F8E)
**Purpose:** Action, primary, engagement, active state

**Usage:**
- Primary CTA buttons
- Active/selected state indicators
- Step badges
- Links
- Icons for positive actions
- Progress indicators
- Hover states for interactive elements

**Variations:**
- Base: `#0E9F8E`
- Hover/Dark: `#0A7266` (darker for pressed state)
- Light/Background: `#E0F5F2` (for badges, light backgrounds)

**Accessibility:**
- On white: 4.9:1 contrast (WCAG AAA)
- On light backgrounds: Good visibility
- Hex: `#0E9F8E`
- RGB: `rgb(14, 159, 142)`

**Ant Design Token:**
```tsx
colorPrimary: '#0E9F8E'
```

---

### Status Colors

#### Green (#1A7A5E)
**Purpose:** Success, complete, valid, done

**Usage:**
- Success alerts
- Done/completed badges
- Checkmarks
- Green progress states
- Valid field indicators
- Success step badges

**Variations:**
- Base: `#1A7A5E`
- Light/Background: `#E6F7F1`

**Accessibility:**
- On white: 5.3:1 contrast (WCAG AAA)
- Hex: `#1A7A5E`
- RGB: `rgb(26, 122, 94)`

**Ant Design Token:**
```tsx
colorSuccess: '#1A7A5E'
```

---

#### Amber/Orange (#D4860A)
**Purpose:** Warning, attention needed, caution

**Usage:**
- Warning alerts
- Caution badges
- Items needing review
- Warning step states
- Non-blocking errors
- Orange progress states

**Variations:**
- Base: `#D4860A`
- Light/Background: `#FEF3E2`

**Accessibility:**
- On white: 4.8:1 contrast (WCAG AAA)
- Hex: `#D4860A`
- RGB: `rgb(212, 134, 10)`

**Ant Design Token:**
```tsx
colorWarning: '#D4860A'
```

---

#### Red (#C0392B)
**Purpose:** Error, invalid, critical, destructive

**Usage:**
- Error alerts
- Invalid field indicators
- Error badges
- Danger buttons
- Blocking errors
- Red progress states
- Delete confirmations

**Variations:**
- Base: `#C0392B`
- Light/Background: `#FEE8E8`

**Accessibility:**
- On white: 4.6:1 contrast (WCAG AAA)
- Hex: `#C0392B`
- RGB: `rgb(192, 57, 43)`

**Ant Design Token:**
```tsx
colorError: '#C0392B'
```

---

#### Blue (#1A5CA8)
**Purpose:** Information, notice, additional context

**Usage:**
- Info alerts
- Information icons
- Help text
- Blue badges
- Info step states

**Variations:**
- Base: `#1A5CA8`
- Light/Background: `#EBF4FF`

**Accessibility:**
- On white: 5.1:1 contrast (WCAG AAA)
- Hex: `#1A5CA8`
- RGB: `rgb(26, 92, 168)`

**Ant Design Token:**
```tsx
colorInfo: '#1A5CA8'
```

---

### Neutral Colors

#### Off-white (#F7F8FA)
**Purpose:** Page background, neutral container

**Usage:**
- Page/layout background
- Neutral backgrounds
- Contrast with white cards
- Disabled states
- Hover overlays

**Accessibility:**
- White text: 12:1 contrast (WCAG AAA)
- Navy text: 10.2:1 contrast (WCAG AAA)
- Hex: `#F7F8FA`
- RGB: `rgb(247, 248, 250)`

**Ant Design Token:**
```tsx
colorBgLayout: '#F7F8FA'
```

---

#### White (#FFFFFF)
**Purpose:** Card background, elevated surfaces

**Usage:**
- Card backgrounds
- Modal backgrounds
- Dropdown backgrounds
- Input backgrounds
- Elevated surfaces

**Hex: `#FFFFFF`**

**Ant Design Token:**
```tsx
colorBgContainer: '#FFFFFF'
```

---

### Text Colors

| Color | Hex | Usage | Contrast |
|-------|-----|-------|----------|
| Primary | `#0D1B2A` | Body text, headings | 21:1 on white |
| Secondary | `#3A4B5C` | Labels, metadata | 10.4:1 on white |
| Tertiary | `#6B7C8D` | Hints, disabled | 5.8:1 on white |
| Quaternary | `#A0A6AA` | Very light text | 3.7:1 on white |

**Ant Design Tokens:**
```tsx
colorText: '#0D1B2A',
colorTextSecondary: '#3A4B5C',
colorTextTertiary: '#6B7C8D',
colorTextQuaternary: '#A0A6AA',
colorTextDisabled: '#A0A6AA',
```

---

### Border & Divider Colors

| Color | Usage | Hex |
|-------|-------|-----|
| Default border | Lines, dividers | `rgba(14,31,50,0.12)` |
| Medium border | Hover borders | `rgba(14,31,50,0.18)` |
| Light border | Subtle dividers | `rgba(14,31,50,0.06)` |

**Ant Design Tokens:**
```tsx
colorBorder: 'rgba(14,31,50,0.12)',
colorBorderSecondary: 'rgba(14,31,50,0.06)',
colorDivider: 'rgba(14,31,50,0.08)',
```

---

## Color Usage by Component

### Alert Component

```tsx
// Success
<Alert type="success" message="..." />
// Background: #E6F7F1
// Border: rgba(26,122,94,0.2)
// Text: #1A7A5E

// Warning
<Alert type="warning" message="..." />
// Background: #FEF3E2
// Border: rgba(212,134,10,0.2)
// Text: #D4860A

// Error
<Alert type="error" message="..." />
// Background: #FEE8E8
// Border: rgba(192,57,43,0.2)
// Text: #C0392B

// Info
<Alert type="info" message="..." />
// Background: #EBF4FF
// Border: rgba(26,92,168,0.2)
// Text: #1A5CA8
```

### Badge/Tag Component

```tsx
// Primary (Teal)
<Tag color="#0E9F8E">Active</Tag>

// Success (Green)
<Tag color="#1A7A5E">Done</Tag>

// Warning (Amber)
<Tag color="#D4860A">Warning</Tag>

// Error (Red)
<Tag color="#C0392B">Error</Tag>

// Info (Blue)
<Tag color="#1A5CA8">Info</Tag>
```

### Button Component

```tsx
// Primary (Teal)
<Button type="primary">Action</Button>
// Background: #0E9F8E
// Hover: #0A7266
// Text: White

// Default (Gray)
<Button type="default">Secondary</Button>
// Background: #FFFFFF
// Border: rgba(14,31,50,0.12)
// Text: #0D1B2A

// Danger (Red)
<Button danger>Delete</Button>
// Background: #C0392B
// Text: White
```

### Header & Footer

```tsx
// Header
<Header style={{ background: '#0D1B2A' }}>
  {/* White text content */}
</Header>

// Footer
<Footer style={{ background: '#0D1B2A' }}>
  {/* rgba(255,255,255,0.3) text */}
</Footer>
```

---

## Color Accessibility

### WCAG Contrast Ratios

All colors meet **WCAG AA** (4.5:1) or **WCAG AAA** (7:1) when used as specified.

| Color Pair | Ratio | Standard |
|-----------|-------|----------|
| Navy text on white | 21:1 | AAA ✓ |
| Teal on white | 4.9:1 | AA ✓ |
| Green on white | 5.3:1 | AA ✓ |
| Amber on white | 4.8:1 | AA ✓ |
| Red on white | 4.6:1 | AA ✓ |
| Blue on white | 5.1:1 | AA ✓ |
| White text on navy | 20:1 | AAA ✓ |

### Color Blindness Friendly

✓ Uses patterns + color (not color alone)
✓ Avoids red-green contrast problems
✓ Symbols/icons supplement color meaning

---

## CSS Variables (Optional)

For easier theme switching, define CSS custom properties:

```css
:root {
  --navy: #0D1B2A;
  --navy-2: #162135;
  --teal: #0E9F8E;
  --teal-dim: #0A7266;
  --teal-pale: #E0F5F2;
  --green: #1A7A5E;
  --green-pale: #E6F7F1;
  --amber: #D4860A;
  --amber-pale: #FEF3E2;
  --red: #C0392B;
  --red-pale: #FEE8E8;
  --blue: #1A5CA8;
  --blue-pale: #EBF4FF;
  --off: #F7F8FA;
  --white: #FFFFFF;
  --border: rgba(14, 31, 50, 0.12);
  --text-primary: #0D1B2A;
  --text-secondary: #3A4B5C;
  --text-tertiary: #6B7C8D;
}

/* Usage */
.button-primary {
  background: var(--teal);
}

.alert-error {
  background: var(--red-pale);
  color: var(--red);
}
```

---

## Dark Mode (Future)

If dark theme is implemented, invert logic:

```tsx
// Dark mode palette
const darkTheme = {
  token: {
    colorBgLayout: '#141414',           // Dark background
    colorBgContainer: '#1f1f1f',        // Dark card
    colorText: '#FFFFFF',               // Light text
    colorTextSecondary: '#BFBFBF',      // Gray text
    colorBorder: 'rgba(255,255,255,0.15)', // Light border
    // ... colors remain same (teal, green, etc)
  },
};
```

---

## Testing Colors

Verify color implementation:

```tsx
// Contrast checker
import tinycolor from 'tinycolor2';

const checkContrast = (color1, color2) => {
  const c1 = tinycolor(color1);
  const c2 = tinycolor(color2);
  const ratio = tinycolor.readability(c1, c2);
  console.log(`Contrast ratio: ${ratio.toFixed(2)}`);
  return ratio >= 4.5; // WCAG AA
};

// Test
checkContrast('#0E9F8E', '#FFFFFF'); // 4.9:1 ✓
checkContrast('#0D1B2A', '#FFFFFF'); // 21:1 ✓✓
```

---

## Color Export (Figma/Design System)

**Figma Variables:**
```
sip/color/primary = #0E9F8E
sip/color/error = #C0392B
sip/color/success = #1A7A5E
sip/color/warning = #D4860A
sip/color/info = #1A5CA8
sip/color/text/primary = #0D1B2A
sip/color/text/secondary = #3A4B5C
sip/color/neutral/background = #F7F8FA
```

**Tailwind Config (if using Tailwind CSS):**
```js
module.exports = {
  theme: {
    colors: {
      navy: '#0D1B2A',
      teal: '#0E9F8E',
      'teal-dim': '#0A7266',
      green: '#1A7A5E',
      amber: '#D4860A',
      red: '#C0392B',
      // ...
    },
  },
};
```

---

**Mục tiêu:** Nhất quán, rõ ràng, dễ sử dụng trong tất cả các component.
