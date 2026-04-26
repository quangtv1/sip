require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config/index');
const { connectDatabase } = require('./config/database');
const logger = require('./utils/logger');

const healthRoutes = require('./routes/health-routes');
const authRoutes = require('./routes/auth-routes');
const userRoutes = require('./routes/user-routes');
const uploadRoutes = require('./routes/upload-routes');
const validateRoutes = require('./routes/validate-routes');
const saveRoutes = require('./routes/save-routes');
const dossierRoutes = require('./routes/dossier-routes');
const packageRoutes = require('./routes/package-routes');
const fileRoutes = require('./routes/file-routes');
const configRoutes = require('./routes/config-routes');
const notificationRoutes = require('./routes/notification-routes');
const dashboardRoutes = require('./routes/dashboard-routes');
const logRoutes = require('./routes/log-routes');
const errorHandlerMiddleware = require('./middleware/error-handler-middleware');

const app = express();

// --- Middleware chain ---
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Redact JWT token from WS upgrade request logs to prevent credential leakage
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.url.startsWith('/ws/'),
}));
// Global 100kb limit — upload routes set their own higher limit via multer
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// --- Routes ---
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/validate', validateRoutes);
app.use('/api/save', saveRoutes);
app.use('/api/dossiers', dossierRoutes);
app.use('/api/package', packageRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/config', configRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', dashboardRoutes);
app.use('/api/logs', logRoutes);

// 404 for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.path} not found` } });
});

// --- Centralised error handler (must be last) ---
app.use(errorHandlerMiddleware);

// --- Startup ---
async function start() {
  try {
    await connectDatabase();

    // Initialise MinIO — load config from DB or env, ensure buckets exist
    const minioStorageService = require('./services/minio-storage-service');
    await minioStorageService.reloadConfig();
    await minioStorageService.ensureBuckets();

    // Start SIP packaging BullMQ worker
    const { startWorker } = require('./jobs/packaging-job-processor');
    startWorker();

    const server = app.listen(config.PORT, () => {
      logger.info('Backend started', {
        port: config.PORT,
        env: config.NODE_ENV,
        // Never log full MONGO_URL — may contain credentials
        mongoHost: require('mongoose').connection.host || 'connecting...',
      });
    });

    // Attach WebSocket server for real-time notifications
    const notificationWs = require('./websocket/notification-ws');
    notificationWs.attach(server);
  } catch (err) {
    logger.error('Failed to start backend', { error: err.message });
    process.exit(1);
  }
}

start();

module.exports = app;
