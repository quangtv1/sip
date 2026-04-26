# Ant Design v5 Theme Setup

## ConfigProvider Configuration

```tsx
// theme.ts
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';

export const themeConfig = {
  token: {
    // ── Color Tokens ──
    colorPrimary: '#0E9F8E',          // Teal — primary action
    colorSuccess: '#1A7A5E',           // Green — success state
    colorWarning: '#D4860A',           // Amber — warning
    colorError: '#C0392B',             // Red — error
    colorInfo: '#1A5CA8',              // Blue — info

    // ── Background Colors ──
    colorBgContainer: '#FFFFFF',       // Card, modal bg
    colorBgLayout: '#F7F8FA',          // Page bg (off-white)
    colorBgElevated: '#FFFFFF',        // Dropdown, tooltip
    colorBgBase: '#F7F8FA',            // Base background

    // ── Border & Divider ──
    colorBorder: 'rgba(14,31,50,0.12)',
    colorBorderSecondary: 'rgba(14,31,50,0.06)',
    colorDivider: 'rgba(14,31,50,0.08)',

    // ── Text Colors ──
    colorText: '#0D1B2A',              // Navy — primary text
    colorTextSecondary: '#3A4B5C',     // Darker gray
    colorTextTertiary: '#6B7C8D',      // Light gray
    colorTextQuaternary: '#A0A6AA',    // Very light gray
    colorTextDisabled: '#A0A6AA',      // Disabled text

    // ── Link Color ──
    colorLink: '#0E9F8E',              // Teal — links
    colorLinkHover: '#0A7266',         // Teal hover
    colorLinkActive: '#0A7266',

    // ── Typography ──
    fontFamily: "'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    fontSizeHeading1: 28,
    fontSizeHeading2: 20,
    fontSizeHeading3: 16,
    fontSizeHeading4: 14,
    fontSizeHeading5: 14,
    fontWeightStrong: 500,
    lineHeight: 1.6,
    lineHeightHeading1: 1.4,
    lineHeightHeading2: 1.4,

    // ── Border Radius ──
    borderRadius: 10,                  // Large (card, button)
    borderRadiusLG: 10,
    borderRadiusSM: 6,                 // Small (alert, tab)
    borderRadiusXS: 4,                 // Extra small (badge)

    // ── Spacing ──
    margin: 16,
    marginXS: 8,
    marginSM: 12,
    marginMD: 16,
    marginLG: 24,
    marginXL: 32,
    padding: 16,
    paddingSM: 8,
    paddingMD: 12,
    paddingLG: 16,
    paddingXL: 24,

    // ── Components ──
    controlHeight: 32,                 // Input, button height
    controlHeightSM: 24,
    controlHeightLG: 40,

    // ── Shadow ──
    boxShadow: '0 2px 12px rgba(13, 27, 42, 0.07)',
    boxShadowSecondary: '0 1px 4px rgba(13, 27, 42, 0.04)',

    // ── Motion ──
    motionUnit: 0.1,                   // 100ms base animation
    motionEaseInOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },

  components: {
    // ── Layout ──
    Layout: {
      headerBg: '#0D1B2A',
      headerHeight: 58,
      headerPadding: '0 2rem',
      headerColor: '#FFFFFF',
      footerBg: '#0D1B2A',
      footerPadding: '1.5rem 2rem',
    },

    // ── Button ──
    Button: {
      borderRadius: 10,
      controlHeight: 36,
      fontWeight: 500,
      primaryColor: '#0E9F8E',
      colorPrimaryBorder: '#0E9F8E',
      colorPrimaryBgHover: '#0A7266',
      colorPrimaryBorder: 'rgba(14,159,142,0.2)',
    },

    // ── Input ──
    Input: {
      borderRadius: 6,
      controlHeight: 32,
      colorBorder: 'rgba(14,31,50,0.12)',
      colorBgContainer: '#FFFFFF',
      colorTextPlaceholder: '#6B7C8D',
      controlOutline: 'rgba(14,159,142,0.1)',
    },

    // ── Card ──
    Card: {
      borderRadius: 10,
      boxShadow: '0 2px 12px rgba(13, 27, 42, 0.07)',
      colorBgContainer: '#FFFFFF',
      colorBorder: 'rgba(14,31,50,0.12)',
    },

    // ── Alert ──
    Alert: {
      borderRadius: 6,
      colorSuccessBorder: 'rgba(26,122,94,0.2)',
      colorSuccessBg: '#E6F7F1',
      colorWarningBorder: 'rgba(212,134,10,0.2)',
      colorWarningBg: '#FEF3E2',
      colorErrorBorder: 'rgba(192,57,43,0.2)',
      colorErrorBg: '#FEE8E8',
      colorInfoBorder: 'rgba(26,92,168,0.2)',
      colorInfoBg: '#EBF4FF',
    },

    // ── Table ──
    Table: {
      borderRadius: 6,
      colorBgContainer: '#FFFFFF',
      colorBorder: 'rgba(14,31,50,0.12)',
      colorText: '#0D1B2A',
      colorTextSecondary: '#3A4B5C',
    },

    // ── Tabs ──
    Tabs: {
      colorPrimaryBorderHover: '#0E9F8E',
      colorPrimary: '#0E9F8E',
      inkBarColor: '#0E9F8E',
    },

    // ── Select ──
    Select: {
      borderRadius: 6,
      controlHeight: 32,
      colorBorder: 'rgba(14,31,50,0.12)',
    },

    // ── Modal ──
    Modal: {
      borderRadius: 10,
      boxShadowSecondary: '0 2px 12px rgba(13, 27, 42, 0.15)',
      colorBgElevated: '#FFFFFF',
    },

    // ── Tag ──
    Tag: {
      borderRadius: 4,
      colorBgContainer: '#FFFFFF',
      colorBorder: 'rgba(14,31,50,0.12)',
    },

    // ── Checkbox ──
    Checkbox: {
      borderRadiusSM: 4,
      colorPrimary: '#0E9F8E',
    },

    // ── Radio ──
    Radio: {
      colorPrimary: '#0E9F8E',
    },
  },
};

// ── App Wrapper ──
// main.tsx
import React from 'react';
import { ConfigProvider } from 'antd';
import { themeConfig } from './theme';
import App from './App';

export default function Main() {
  return (
    <ConfigProvider theme={themeConfig} locale={viVN}>
      <App />
    </ConfigProvider>
  );
}
```

## Usage in Components

### 1. Using Ant Design Components
```tsx
import { Button, Input, Card, Table, Modal, Form, Select } from 'antd';

// Button — automatically uses colorPrimary (teal)
<Button type="primary">Đóng gói</Button>

// Input — uses border & text colors from token
<Input placeholder="Mã hồ sơ" />

// Card — uses colorBgContainer, colorBorder
<Card title="Thông tin">
  Content here
</Card>
```

### 2. Custom Theme in Specific Component
```tsx
import { ConfigProvider } from 'antd';

<ConfigProvider
  theme={{
    token: {
      colorPrimary: '#D4860A', // Override for this subtree
    },
  }}
>
  <Button>Special</Button>
</ConfigProvider>
```

### 3. Dark Mode (Optional)
```tsx
const [isDark, setIsDark] = useState(false);

const darkTheme = {
  token: {
    colorBgLayout: '#141414',
    colorBgContainer: '#1f1f1f',
    colorText: '#FFFFFF',
    // ... other adjustments
  },
};

<ConfigProvider theme={isDark ? darkTheme : themeConfig}>
  <App />
</ConfigProvider>
```

## Locale Setup (Vietnamese)

```tsx
import viVN from 'antd/locale/vi_VN';

<ConfigProvider locale={viVN} theme={themeConfig}>
  {/* Ant Design will now show Vietnamese text for:
       - Datepicker month/day names
       - Pagination
       - Empty state
       - Table sort/filter labels
       - Validation messages
  */}
</ConfigProvider>
```

## Design Token Inheritance

Ant Design v5 uses a **cascading token system**:

1. **Global token** (`token`) — applied to all components
2. **Component token** (`components.Button`, etc.) — overrides global for that component
3. **Inline style** — CSS prop on element (highest priority)

**Cascade Example:**
```tsx
themeConfig = {
  token: {
    colorPrimary: '#0E9F8E',        // Applied everywhere
  },
  components: {
    Button: {
      primaryColor: '#0E9F8E',      // Overrides for Button only
    },
  },
};

// Result: Button uses teal, other components also use teal from global token
```

## Testing Theme Configuration

```tsx
// test-theme.tsx
import { Button, Input, Card, Alert } from 'antd';
import { ConfigProvider } from 'antd';
import { themeConfig } from './theme';

export function ThemeTest() {
  return (
    <ConfigProvider theme={themeConfig}>
      <div style={{ padding: '2rem', background: '#F7F8FA' }}>
        <h2>Theme Test</h2>

        <h3>Colors</h3>
        <Button type="primary">Primary (Teal)</Button>
        <Button type="default">Default</Button>
        <Button danger>Danger (Red)</Button>

        <h3>Inputs</h3>
        <Input placeholder="Text input" />
        <Input.TextArea placeholder="Textarea" rows={4} />

        <h3>Cards</h3>
        <Card title="Card Title">
          Card content with border-radius: 10px
        </Card>

        <h3>Alerts</h3>
        <Alert type="success" message="Success" showIcon />
        <Alert type="warning" message="Warning" showIcon />
        <Alert type="error" message="Error" showIcon />
      </div>
    </ConfigProvider>
  );
}
```

## Customization Best Practices

1. **Centralize token definitions** in one file (e.g., `theme.ts`)
2. **Use CSS variables** for runtime theme switching
3. **Test component colors** before deployment
4. **Document component-specific overrides** if needed
5. **Avoid inline colors** — use token values instead

## References

- Ant Design Theme: https://ant.design/docs/react/customize-theme
- Design Tokens: https://ant.design/docs/react/customize-theme-variable
- V5 Migration: https://ant.design/docs/react/migration-v4-to-v5
