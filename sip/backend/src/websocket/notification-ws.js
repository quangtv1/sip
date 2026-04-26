/**
 * WebSocket notification server.
 * Mounted on /ws/notifications. Authenticates via JWT query param on connect.
 * Per-user connection registry: userId → Set<WebSocket>.
 * Usage: notificationWs.push(userId, event, data) from anywhere in the backend.
 */
const { WebSocketServer } = require('ws');
const authService = require('../services/auth-service');
const logger = require('../utils/logger');

/** userId → Set<WebSocket> */
const connections = new Map();

/**
 * Attach a WebSocket server to an existing HTTP server.
 * @param {http.Server} httpServer
 */
function attach(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/notifications' });

  wss.on('connection', (ws, req) => {
    // Extract JWT from query string: /ws/notifications?token=<jwt>
    const url = new URL(req.url, `http://localhost`);
    const token = url.searchParams.get('token');

    // Reject connections without a token before calling verifyToken
    if (!token) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    let userId;
    try {
      const decoded = authService.verifyToken(token);
      userId = decoded.email;
    } catch {
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Register connection
    if (!connections.has(userId)) connections.set(userId, new Set());
    connections.get(userId).add(ws);
    logger.info('WebSocket connected', { userId });

    ws.on('close', () => {
      connections.get(userId)?.delete(ws);
      if (connections.get(userId)?.size === 0) connections.delete(userId);
    });

    ws.on('error', (err) => {
      logger.warn('WebSocket error', { userId, error: err.message });
    });

    // Heartbeat: clients must respond to ping within 30s
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
  });

  // Ping all connections every 30s to detect stale sockets
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on('close', () => clearInterval(pingInterval));
  logger.info('WebSocket notification server ready at /ws/notifications');
  return wss;
}

/**
 * Push a notification to all connections for a given userId.
 * @param {string} userId
 * @param {string} event
 * @param {object} data
 */
function push(userId, event, data = {}) {
  const sockets = connections.get(userId);
  if (!sockets || sockets.size === 0) return;

  const payload = JSON.stringify({ event, data, ts: Date.now() });
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

module.exports = { attach, push };
