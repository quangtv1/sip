/**
 * Hook for real-time notifications.
 * Connects to the WebSocket notification server and polls REST API for initial state.
 *
 * Returns:
 *   items       - last 20 notifications (newest first)
 *   unreadCount - number of unread notifications
 *   markAllRead - function to mark all as read
 *   loading     - initial fetch in progress
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../config/api-client.js';
import { TOKEN_KEY } from '../config/api-client.js';

export default function useNotifications() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get('/notifications');
      setItems(res.data.data.items);
      setUnreadCount(res.data.data.unreadCount);
    } catch {
      // silent — keep stale state
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    let isMounted = true;

    function connect() {
      if (!isMounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = window.location.host;
      const ws = new WebSocket(`${protocol}://${host}/ws/notifications?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          // Server sends { event, data, ts } — check msg.event, not msg.type
          if (msg.event) {
            // Prepend new notification and bump unread count
            const notification = { event: msg.event, data: msg.data, createdAt: new Date(msg.ts).toISOString(), read: false };
            setItems((prev) => [notification, ...prev].slice(0, 20));
            setUnreadCount((prev) => prev + 1);
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = (evt) => {
        // Reconnect after 5s unless closed cleanly or component unmounted
        if (isMounted && evt.code !== 1000) {
          reconnectTimer.current = setTimeout(connect, 5000);
        }
      };

      ws.onerror = () => ws.close();
    }

    connect();
    fetchNotifications();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on unmount
        wsRef.current.close(1000);
      }
    };
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    try {
      await apiClient.post('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, []);

  return { items, unreadCount, markAllRead, loading };
}
