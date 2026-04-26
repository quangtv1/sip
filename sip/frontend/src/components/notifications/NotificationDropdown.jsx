/**
 * NotificationDropdown — Ant Design List rendered inside a Popover.
 * Shows last 20 notifications with read/unread indicator and mark-all-read button.
 *
 * Props:
 *   items       {Array}    - notification objects from API
 *   loading     {boolean}
 *   onMarkAll   {Function} - called when user clicks "Đánh dấu tất cả đã đọc"
 */
import { List, Button, Typography, Tag, Empty, Spin } from 'antd';

const { Text } = Typography;

const EVENT_LABELS = {
  DOSSIER_APPROVED:  'Phê duyệt',
  DOSSIER_REJECTED:  'Từ chối',
  PACKAGE_DONE:      'Đóng gói xong',
  PACKAGE_FAILED:    'Đóng gói lỗi',
};

function eventColor(event) {
  if (event === 'DOSSIER_APPROVED' || event === 'PACKAGE_DONE') return 'success';
  if (event === 'DOSSIER_REJECTED' || event === 'PACKAGE_FAILED') return 'error';
  return 'default';
}

export default function NotificationDropdown({ items = [], loading, onMarkAll }) {
  return (
    <div style={{ width: 340 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Text strong>Thông báo</Text>
        {items.some((n) => !n.read) && (
          <Button type="link" size="small" onClick={onMarkAll} style={{ padding: 0 }}>
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
      ) : items.length === 0 ? (
        <Empty description="Không có thông báo" style={{ padding: 24 }} />
      ) : (
        <List
          dataSource={items}
          style={{ maxHeight: 360, overflowY: 'auto' }}
          renderItem={(n) => (
            <List.Item
              style={{
                padding: '10px 12px',
                background: n.read ? 'transparent' : '#f0fffe',
                cursor: 'default',
              }}
            >
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Tag color={eventColor(n.event)} style={{ margin: 0 }}>
                    {EVENT_LABELS[n.event] || n.event}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {new Date(n.createdAt).toLocaleString('vi-VN')}
                  </Text>
                </div>
                {n.data?.dossierId && (
                  <Text style={{ fontSize: 12 }}>Hồ sơ: {n.data.maHoSo || n.data.dossierId}</Text>
                )}
                {n.data?.note && (
                  <div><Text type="secondary" style={{ fontSize: 12 }}>Ghi chú: {n.data.note}</Text></div>
                )}
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
