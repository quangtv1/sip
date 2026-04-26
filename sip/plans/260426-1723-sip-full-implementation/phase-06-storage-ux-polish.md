# Phase 6: Storage & UX Polish

## Context
- **Priority:** P2
- **Status:** Complete (2026-04-26)
- **Effort:** 80h
- **Depends on:** Phase 5 (SIP packaging produces ZIP files)
- **Docs:** `docs/features-vi.md` (features 6,10,15,20,21)

## Overview

Integrate MinIO for PDF and SIP storage, implement presigned URLs, add upload progress (SSE), in-app notifications (WebSocket), and PDF viewer improvements.

## Key Insights

- Before APPROVED: PDFs on server temp dir, served via API
- After APPROVED: PDFs uploaded to MinIO `pdf-files/YYYY/MM/[MaHoSo]/`
- SIP ZIPs go to `sip-files/YYYY/`
- Presigned URLs: 1-hour expiry, generated on demand
- Storage config from MongoDB, hot-reloadable (no restart)
- Upload retry: max 3 attempts on network failure
- Notifications: WebSocket per user, JWT auth on connect

## Files to Create

```
backend/src/
  services/
    minio-storage-service.js         # MinIO client, upload, presigned URL, retry
    upload-progress-service.js       # SSE stream for upload/validation progress
  routes/
    file-routes.js                   # GET /api/files, GET /api/preview, GET /api/download
    config-routes.js                 # GET/POST /api/config (storage config)
    notification-routes.js           # GET /api/notifications
  websocket/
    notification-ws.js               # WebSocket server for notifications

frontend/src/
  components/
    upload/
      UploadProgress.jsx             # Step progress with SSE stream
    notifications/
      NotificationBell.jsx           # Bell icon + badge + dropdown
      NotificationDropdown.jsx       # Last 10 notifications
      NotificationToast.jsx          # Toast popup (5s auto-dismiss)
    files/
      FileBrowser.jsx                # MinIO file listing (tabs: PDF/SIP)
      FileRow.jsx                    # Single file row with actions
  hooks/
    use-notifications.js             # WebSocket hook for notifications
    use-upload-progress.js           # SSE hook for progress
```

## Files to Modify

```
backend/src/services/sip-packaging-service.js — upload ZIP to MinIO after creation
backend/src/services/notification-service.js — implement WebSocket push
backend/src/app.js — add WebSocket server, SSE support
frontend/src/components/layout/AppHeader.jsx — add NotificationBell
frontend/src/components/pdf/PdfViewer.jsx — use presigned URL after APPROVED
frontend/src/App.jsx — add routes for FileBrowser, config
```

## Implementation Steps

1. **MinIO storage service** — Initialize Minio client from config (loaded from MongoDB or env). Methods: `uploadFile(bucket, path, stream)`, `getPresignedUrl(bucket, path, expiry=3600)`, `listFiles(bucket, prefix)`, `downloadFile(bucket, path)`. Auto-create buckets on startup. Retry logic: 3 attempts with exponential backoff.

2. **Storage config routes** — `GET /api/config` returns current MinIO config (mask secretKey). `POST /api/config` updates config, test connection before saving, hot-reload MinIO client.

3. **File routes** — `GET /api/files?bucket=pdf-files&prefix=2026/04/` lists files. `GET /api/preview/:bucket/*path` generates presigned URL and returns it. `GET /api/download/:bucket/*path` streams file download.

4. **PDF storage integration** — On APPROVED transition: upload all PDFs from temp dir to MinIO `pdf-files/YYYY/MM/[MaHoSo]/`. Update dossier record with MinIO paths. Clean temp files.

5. **SIP storage integration** — After packaging (Phase 5), upload ZIP to MinIO `sip-files/YYYY/`. Update dossier with SIP path. Clean temp ZIP.

6. **Upload progress (SSE)** — `upload-progress-service.js` creates SSE endpoint. Backend emits events during validation pipeline: `{ step: "parsing", progress: 30 }`, `{ step: "validating", progress: 60, detail: "Checking row 45/100" }`, etc. Frontend subscribes via EventSource.

7. **UploadProgress component** — Ant Design Steps showing: Upload → Parse → Validate → PDF Check → Complete. Each step shows real-time progress from SSE. Final step shows summary (X errors, Y warnings).

8. **Notification WebSocket** — On backend startup, create WebSocket server on `/ws/notifications`. On connect, verify JWT from query param. On state transitions, push notification to relevant users (per notification rules from features-vi.md feature 15).

9. **Notification model** — MongoDB `notifications` collection: userId, type, title, message, dossierId, read, createdAt. TTL index: 30 days.

10. **NotificationBell** — Badge showing unread count. Click → dropdown with last 10 notifications. Mark as read on view. WebSocket updates badge in real-time.

11. **NotificationToast** — When WebSocket receives new notification → show Ant Design notification.info() toast at top-right. Auto-dismiss after 5 seconds.

12. **FileBrowser** — Two tabs: "PDF Files" and "SIP Files". Table: filename, size, date. Search by name. Sort by date/name. Pagination (20/page). Row actions: Preview, Download.

13. **PdfViewer update** — Before APPROVED: load from `/api/files/temp/...`. After APPROVED: use presigned URL from MinIO. Show loading state.

## Todo

- [ ] MinIO storage service (upload, presigned URL, list, download)
- [ ] Storage config routes (GET/POST /api/config)
- [ ] File listing/preview/download routes
- [ ] PDF upload to MinIO on APPROVED
- [ ] SIP upload to MinIO after packaging
- [ ] SSE upload progress endpoint
- [ ] UploadProgress component
- [ ] WebSocket notification server
- [ ] Notification model + service
- [ ] NotificationBell + dropdown
- [ ] NotificationToast
- [ ] FileBrowser (PDF + SIP tabs)
- [ ] PdfViewer presigned URL support

## Success Criteria

1. MinIO buckets auto-created on startup
2. PDFs uploaded to MinIO after dossier APPROVED
3. SIP ZIPs uploaded to MinIO after packaging
4. Presigned URLs work and expire after 1 hour
5. Upload progress shows real-time steps via SSE
6. WebSocket notifications push on state transitions
7. Notification bell shows unread count, updates in real-time
8. FileBrowser lists files from MinIO with search + pagination
9. Storage config changeable without restart

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| MinIO unavailable | Health check + retry logic + clear error messages |
| WebSocket connection drops | Auto-reconnect with exponential backoff |
| SSE compatibility | Fallback to polling every 2s |
| Large file upload to MinIO | Stream upload, not buffer entire file |
