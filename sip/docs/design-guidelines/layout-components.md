# Layout Components

## Full Page Layout

```tsx
// Layout.tsx
import { Layout, Space, Button, Avatar, Dropdown, Badge } from 'antd';
import { BellOutlined, UserOutlined, MenuOutlined } from '@ant-design/icons';

const { Header, Content, Footer } = Layout;

export function AppLayout({ children }) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ── Header (Sticky, Navy) ── */}
      <Header
        style={{
          background: '#0D1B2A',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 2rem',
          height: 58,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo Left */}
        <Space size={12} style={{ color: 'white' }}>
          <div
            style={{
              width: 34,
              height: 34,
              background: '#0E9F8E',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'IBM Plex Mono'",
              fontSize: 18,
              fontWeight: 500,
            }}
          >
            📦
          </div>
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              fontFamily: "'IBM Plex Mono'",
              color: 'white',
            }}
          >
            SIP
          </span>
          <span
            style={{
              fontSize: 10,
              fontFamily: "'IBM Plex Mono'",
              background: 'rgba(14,159,142,0.25)',
              color: '#5FD4C8',
              border: '1px solid rgba(14,159,142,0.35)',
              borderRadius: 4,
              padding: '2px 7px',
              letterSpacing: '0.5px',
            }}
          >
            v1.0
          </span>
        </Space>

        {/* Meta Right */}
        <Space size={24} style={{ color: 'rgba(255,255,255,0.5)' }}>
          <span
            style={{
              fontSize: 11,
              fontFamily: "'IBM Plex Mono'",
            }}
          >
            SIP Packager 2026
          </span>

          {/* Notifications */}
          <Dropdown
            menu={{
              items: [
                { key: '1', label: 'Hồ sơ HS0001 đã được phê duyệt' },
                { key: '2', label: 'Lỗi xác thực: 5 trường còn lỗi' },
              ],
            }}
          >
            <Badge count={2} style={{ backgroundColor: '#D4860A' }}>
              <Button
                icon={<BellOutlined />}
                type="text"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              />
            </Badge>
          </Dropdown>

          {/* User Menu */}
          <Dropdown
            menu={{
              items: [
                { key: 'profile', label: 'Thông tin tài khoản' },
                { key: 'settings', label: 'Cài đặt' },
                { type: 'divider' },
                { key: 'logout', label: 'Đăng xuất', danger: true },
              ],
            }}
          >
            <Avatar
              icon={<UserOutlined />}
              size={32}
              style={{ background: '#0E9F8E', cursor: 'pointer' }}
            />
          </Dropdown>
        </Space>
      </Header>

      {/* ── Content Area ── */}
      <Content
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '2rem 1.5rem 4rem',
          width: '100%',
        }}
      >
        {children}
      </Content>

      {/* ── Footer (Navy) ── */}
      <Footer
        style={{
          background: '#0D1B2A',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '1.5rem 2rem',
          textAlign: 'center',
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
          fontFamily: "'IBM Plex Mono'",
          marginTop: '2rem',
        }}
      >
        SIP Packager © 2026 | Bộ Ngoại giao | Lưu trữ số
      </Footer>
    </Layout>
  );
}
```

## 2-Column Grid (Main + Sidebar)

```tsx
// DashboardLayout.tsx
import { Row, Col } from 'antd';

interface TwoColumnLayoutProps {
  main: React.ReactNode;
  sidebar: React.ReactNode;
}

export function TwoColumnLayout({ main, sidebar }: TwoColumnLayoutProps) {
  return (
    <Row gutter={[24, 24]}>
      {/* Main Content — 2/3 width on desktop */}
      <Col xs={24} sm={24} md={16}>
        {main}
      </Col>

      {/* Sidebar — 1/3 width on desktop, full width on mobile */}
      <Col xs={24} sm={24} md={8}>
        {sidebar}
      </Col>
    </Row>
  );
}

// Usage:
export function DossierPage() {
  return (
    <TwoColumnLayout
      main={<ValidationPanel dossier={dossier} />}
      sidebar={<DossierInfoSidebar dossier={dossier} />}
    />
  );
}
```

## Sidebar Components

### Info Sidebar (Key-Value Pairs)

```tsx
// InfoSidebar.tsx
import { Card, Space, Divider } from 'antd';

interface InfoRow {
  label: string;
  value: string | React.ReactNode;
  code?: boolean;
}

interface SidebarCardProps {
  title: string;
  items: InfoRow[];
}

export function SidebarCard({ title, items }: SidebarCardProps) {
  return (
    <Card
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(14,31,50,0.12)',
        borderRadius: 10,
        marginBottom: '1rem',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: '#0D1B2A',
          padding: '13px 16px',
          fontSize: 12,
          fontWeight: 500,
          color: 'rgba(255,255,255,0.8)',
          fontFamily: "'IBM Plex Mono'",
          letterSpacing: '0.3px',
          marginBottom: '14px',
        }}
      >
        {title}
      </div>

      <div style={{ padding: '0 16px' }}>
        {items.map((item, idx) => (
          <div key={idx}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '6px 0',
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: '#6B7C8D',
                  flexShrink: 0,
                  fontFamily: "'IBM Plex Mono'",
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: '#0D1B2A',
                  textAlign: 'right',
                  wordBreak: 'break-all',
                  fontFamily: item.code ? "'IBM Plex Mono'" : 'inherit',
                  fontSize: item.code ? 11 : 12,
                }}
              >
                {item.value}
              </span>
            </div>
            {idx < items.length - 1 && (
              <Divider style={{ margin: '0 0 6px 0' }} />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// Usage:
<SidebarCard
  title="THÔNG TIN HỒ SƠ"
  items={[
    { label: 'Mã hồ sơ', value: 'HS0001' },
    { label: 'Tiêu đề', value: 'Hồ sơ năm 2025' },
    { label: 'Ngày upload', value: '2026-04-26' },
    { label: 'Checksum', value: 'a1b2c3d4...', code: true },
  ]}
/>
```

### Status Sidebar

```tsx
// StatusSidebar.tsx
import { Card, Tag, Space, Button } from 'antd';
import { CheckCircleOutlined, ExclamationOutlined } from '@ant-design/icons';

export function StatusSidebar({ dossier }) {
  const statusColor = {
    UPLOAD: 'blue',
    VALIDATED: 'cyan',
    APPROVED: 'green',
    REJECTED: 'red',
  };

  return (
    <Card style={{ marginBottom: '1rem' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <p style={{ fontSize: 12, color: '#6B7C8D', margin: '0 0 8px 0' }}>
            TRẠNG THÁI
          </p>
          <Tag color={statusColor[dossier.status]}>
            {dossier.status}
          </Tag>
        </div>

        {dossier.errorCount > 0 && (
          <div>
            <p style={{ fontSize: 12, color: '#6B7C8D', margin: '0 0 8px 0' }}>
              LỖI
            </p>
            <Tag
              icon={<ExclamationOutlined />}
              color="#C0392B"
            >
              {dossier.errorCount} lỗi
            </Tag>
          </div>
        )}

        <Button type="primary" block>
          Xem chi tiết
        </Button>
      </Space>
    </Card>
  );
}
```

## Card Component

```tsx
import { Card } from 'antd';

// Basic card with header
<Card
  title="Bước 1: Tải lên tài liệu"
  style={{
    borderRadius: 10,
    border: '1px solid rgba(14,31,50,0.12)',
  }}
>
  Card content here
</Card>

// Card with step badge
<Card
  title={
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#0E9F8E',
          color: 'white',
          fontSize: 11,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'IBM Plex Mono'",
        }}
      >
        1
      </div>
      <span>Tải lên tài liệu</span>
    </div>
  }
>
  Content
</Card>

// Card with dark header (Navy)
<Card
  title="THÔNG TIN"
  headStyle={{
    background: '#0D1B2A',
    color: 'white',
    fontFamily: "'IBM Plex Mono'",
    fontSize: 12,
  }}
>
  Content
</Card>
```

## Responsive Considerations

### Grid Breakpoints
- **xs (0-575px):** 1 column, full width
- **sm (576-767px):** 1 column, full width
- **md (768-991px):** 2 columns (main 16, sidebar 8)
- **lg (992-1199px):** 2 columns
- **xl (1200px+):** 2 columns, max-width 960px

### Mobile-optimized Layout
```tsx
<Row gutter={[12, 12]}>  {/* Smaller gap on mobile */}
  <Col xs={24} sm={24} md={16}>
    {/* Stack on mobile, side-by-side on desktop */}
  </Col>
  <Col xs={24} sm={24} md={8}>
    {/* Stacks below on mobile */}
  </Col>
</Row>
```

### Scrollable Tables on Mobile
```tsx
<div style={{ overflowX: 'auto' }}>
  <Table
    columns={columns}
    dataSource={data}
    scroll={{ x: 800 }}  {/* Horizontal scroll width */}
  />
</div>
```

## Spacing & Alignment

```tsx
// Consistent spacing using Ant Design Space
import { Space } from 'antd';

{/* Horizontal layout with gap */}
<Space size="middle">
  <Button>Button 1</Button>
  <Button>Button 2</Button>
</Space>

{/* Vertical layout with gap */}
<Space direction="vertical" style={{ width: '100%' }}>
  <div>Item 1</div>
  <div>Item 2</div>
</Space>

{/* Custom gap sizes */}
<Space size={8}>Tight gap</Space>
<Space size={16}>Normal gap</Space>
<Space size={24}>Large gap</Space>
