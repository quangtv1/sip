/**
 * NotificationBell — header bell icon with unread badge and popover dropdown.
 * Uses useNotifications hook for WS + REST state.
 */
import { Badge, Popover, Button } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useState } from 'react';
import useNotifications from '../../hooks/use-notifications.js';
import NotificationDropdown from './NotificationDropdown.jsx';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, loading, markAllRead } = useNotifications();

  function handleOpenChange(visible) {
    setOpen(visible);
  }

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      content={
        <NotificationDropdown
          items={items}
          loading={loading}
          onMarkAll={() => { markAllRead(); }}
        />
      }
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ color: '#ccc', fontSize: 16 }} />}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        />
      </Badge>
    </Popover>
  );
}
