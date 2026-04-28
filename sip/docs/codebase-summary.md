# Codebase Summary

**Status:** Phase 1-8 Complete + Phase 4 (Generalized Validation Profile System) Complete  
**Last Updated:** 2026-04-28

---

## Current Structure

```
sip/
├── backend/                      # Express API (Phase 2 Complete)
│   ├── src/
│   │   ├── validators/           # TT05 field rules
│   │   ├── services/             # Validation orchestration
│   │   ├── models/               # Dossier schema
│   │   ├── routes/               # API endpoints
│   │   └── index.js              # Express app
│   ├── Dockerfile                # Multi-stage Node build
│   └── package.json
├── frontend/                     # React 18 + Vite 5 (Phase 3 Complete)
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── pages/                # Page routes
│   │   ├── config/               # API client, theme
│   │   ├── context/              # Auth context
│   │   ├── hooks/                # Custom hooks
│   │   └── utils/                # Helpers
│   ├── Dockerfile                # Multi-stage Nginx serve
│   ├── vite.config.js
│   └── package.json
├── tmp/                          # Legacy skeleton (unused)
│   └── mota.txt                  # Requirements outline (Vietnamese)
├── docs/
│   ├── requirements.md           # FULL SPEC (source of truth)
│   ├── project-overview-pdr.md   # Features + PDR
│   ├── codebase-summary.md       # THIS FILE
│   ├── code-standards.md         # Coding conventions
│   ├── system-architecture.md    # Architecture + design
│   └── project-roadmap.md        # 12-week timeline
├── README.md                     # Quick start guide
└── plans/                        # Implementation plans & reports
```

---

## What's Built (Phase 1-8 Complete + Phase 4 Profile System Complete)

### Backend (Phase 2 Implementation Complete)
- **Stack:** Express.js 4.x
- **Status:** Validation engine fully implemented
- **Completed Routes:**
  - `POST /api/upload` — folder/ZIP upload with multer, structure validation
  - `POST /api/validate` — full validation pipeline (Excel → field → cross → PDF → auto-fix)
  - `POST /api/validate-inline` — single-field real-time validation
  - `POST /api/save` — apply fixes, versioning (cap 20), sanitization

**Phase 2 Implementation Details:**

#### Validators (src/validators/)
- `enum-definitions.js` — All TT05 enum values (frozen objects): thoiHanBaoQuan (6), cheDoSuDung (3), ngonNgu (11), tinhTrangVatLy (3), mucDoTinCay (3), cheoDuPhong (2), tinhTrangDuPhong (2), tenLoaiTaiLieu (32)
- `ho-so-schema.js` — 18 field definitions with type, required, enum, regex, severity
- `van-ban-schema.js` — 21 field definitions; field 21 = comma-separated PDF filenames

#### Services (src/services/)
- `folder-structure-validator.js` — Validates Attachment/ + Metadata/ layout, ≥1 PDF, exactly 1 .xlsx
- `excel-parser-service.js` — SheetJS parser: sheet names from active profile → JSON, date serial handling, returns profileId
- `field-validator-service.js` — Per-field validation: string, date, positiveInt, enum, float, boolean, regex, email, url, range, dependent-enum (async)
- `cross-validator-service.js` — 5 checks: count match, prefix, duplicate MaLuuTru, duplicate MaDinhDanh, date range, retention hierarchy
- `pdf-mapping-validator.js` — Field 21 PDF filenames vs Attachment/, fallback {MaLuuTru}.pdf, missing = ERROR, extra = WARNING
- `auto-fix-service.js` — Suggest fixes: date reformat, trim, fuzzy enum (Levenshtein), int extraction
- `validation-orchestrator.js` — Chain all validators, threads profileId through pipeline, aggregate errors + suggestions
- `schema-cache-service.js` — Cache enums + schemas by profileId; profile CRUD methods; active profile getters/setters

#### Models (src/models/)
- `dossier-model.js` — Schema: maHoSo, profileId, state, uploadedBy, excelData (Ho_so + Van_ban), validationResult, versions[], pdfFiles[], tempPath, createdAt, updatedAt

#### Routes (src/routes/)
- `upload-routes.js` — multer, ZIP bomb guard, path traversal fix, temp cleanup, captures active profileId
- `validate-routes.js` — /validate/:id + /validate-inline, threads profileId through validation
- `save-routes.js` — version capping (20), input sanitization
- `config-routes.js` — Profile CRUD (GET/POST/PUT/DELETE /api/config/profiles), active profile (GET/PUT), schema routes scoped by profileId

**Testing:**
- 40/40 unit tests passing (node:test framework)
- Code review: all 3 critical + 6 high issues fixed

**Phase 4-5 Complete (New):**
- Workflow state machine (UPLOAD → VALIDATING → VALIDATED → APPROVED → PACKAGING → DONE + REJECTED → UPLOAD) ✓
- RBAC backend enforcement (authMiddleware + requireRole middleware) ✓
- Approval/rejection endpoints (/api/approve, /api/reject) ✓
- Dossier list/detail endpoints (GET /dossiers, GET /dossiers/:id) ✓
- Audit log integration (every action logged, state transitions recorded) ✓
- SIP packaging (METS/EAD/PREMIS generation) via BullMQ async queue ✓
- Checksum service (SHA-256 for all files) ✓
- ZIP packaging (folder structure + metadata files) ✓
- Frontend QueueViewPage (dossier list with filters) ✓
- Frontend DossierStatusBadge (visual state indicators) ✓
- Frontend DossierListTable (pagination + inline actions) ✓
- Notifications stub (saves to collection, no email yet) ✓

**Phase 8 Complete (Testing & Hardening):**
- Jest test suite: 47 tests (12 unit, 35 integration) ✓
- MongoMemoryServer in-memory testing (no mocking) ✓
- Test infrastructure: jest-env-setup.js, test-setup.js, test-auth-helper.js ✓
- GitHub Actions CI pipeline: runs unit + integration tests ✓
- .env.example: all required env vars documented ✓
- Bug fixes from testing:
  - approve-routes.js: per-route RBAC middleware (fixed global blocking)
  - workflow-engine.js: STATE_TO_AUDIT_ACTION mapping (invalid enums)
  - app.js: rate limiter + start() guarded by NODE_ENV !== 'test'
  - queue-setup.js: BullMQ test-mode stub added
- Security hardening: Helmet, CORS, rate limiting, Morgan skips /ws/ ✓

**Phase 4: Generalized Validation Profile System (NEW - 2026-04-28)**
- Profile CRUD API (create/read/update/delete named validation profiles) ✓
- Active profile management (GET/PUT /api/config/active-profile) ✓
- Frontend "Tiêu chuẩn" tab for profile management UI ✓
- Schema namespace migration (schema:profile:sheet keys) ✓
- Dossier profileId field (default 'TT05') ✓
- Excel sheet names from active profile (configurable primarySheet/secondarySheet) ✓
- Extended field types: float, boolean, regex, email, url, range ✓
- Dependent-enum cascading type (field B depends on field A value) ✓
- Schema validation with new type param checking ✓

**Not Yet Implemented:**
- Digital signature (XMLDSig + TSA) — Phase 6
- MinIO upload deferred to Phase 6
- Dashboard (stats charts, audit log viewer) — Phase 7

### Frontend (Phase 4-5 Implementation Complete)
- **Location:** `/mnt/d/app/sip/frontend/`
- **Stack:** React 18.2.0 + Ant Design 5.14.0 + Vite 5.1.0
- **Status:** Fully built, component library complete
- **Implemented Components:**

#### Layout
- `AppLayout.jsx` — Grid layout with sidebar + main content
- `AppHeader.jsx` — Header with title + logout
- `AppSidebar.jsx` — Navigation menu

#### Authentication
- `LoginPage.jsx` — Email/password login form
- `auth-context.jsx` — Global user + token state
- `use-auth.js` — Custom hook for auth operations

#### Upload Flow
- `UploadPanel.jsx` — Drag/drop + folder picker
- `FolderTreeView.jsx` — Folder structure preview

#### Validation & Editing
- `ExcelGrid.jsx` — Virtualized grid for Ho_so + Van_ban sheets
  - Inline cell editing
  - Error/warning highlighting (red/yellow)
  - Column frozen (field names)
  - Row height auto-sizing
- `ExcelCell.jsx` — Cell component with edit mode
- `EnumDropdown.jsx` — Dropdown for TT05 enum fields (Ho_so + Van_ban)

#### Error Handling
- `ErrorPanel.jsx` — Filterable error list
  - Filter by severity, field, row
  - Click → scroll to cell
  - Sort by severity, count
- `ErrorItem.jsx` — Single error row
- `AutoFixPanel.jsx` — Show suggestion + apply button

#### Workflow (Phase 4 New)
- `WorkflowBar.jsx` — Status display + action buttons
  - Shows current state (UPLOAD, VALIDATING, VALIDATED, APPROVED, PACKAGING, DONE, REJECTED)
  - Buttons enabled/disabled by RBAC role
  - Click action → POST to backend
  - Shows packaging progress (async job polling)

#### Dossier Queue (Phase 4 New)
- `QueueViewPage.jsx` — Paginated dossier list page
  - Filters: state, dateRange, MaHoSo search
  - Operators see only own dossiers
  - Click row → navigate to DossierPage for detail/edit
- `DossierListTable.jsx` — Pagination table with inline actions
  - State badges + action buttons
  - Sort by date, state, error count
- `DossierStatusBadge.jsx` — Color-coded state indicator
  - UPLOAD: blue, VALIDATED: green, APPROVED: gold, PACKAGING: cyan, DONE: green, REJECTED: red

#### PDF Viewing
- `PdfViewer.jsx` — Iframe with presigned URL
  - Used after dossier approved
  - Pre-APPROVED: temp endpoint
  - Post-APPROVED: presigned URL from MinIO

#### Data Fetching
- `use-dossier.js` — Query hook for dossier state + validation results
- `use-validation.js` — Query hook for validation details
- `api-client.js` — Axios instance with JWT interceptor
- React Query 5.18.0 for server-side caching

#### Pages
- `LoginPage.jsx` — Auth entry point
- `DossierPage.jsx` — Main workflow (upload → validate → approve → package)
- `QueueViewPage.jsx` — Dossier queue/list view (new Phase 4)

### Infrastructure (NOT YET IMPLEMENTED)
- **Docker Compose:** `tmp/docker-compose.yml` (PLANNED: 14 LOC)
- **Nginx Config:** `tmp/nginx/nginx.conf` (PLANNED: 10 LOC)
- **Status:** Skeleton only
- **Planned Services:**
  - `backend` (Express :3000)
  - `nginx` (reverse proxy :8080 → :3000)
  - `mongodb` (audit log, config)
  - `minio` (PDF + SIP storage)

---

## What's Planned

### Phase 1: Foundation (Sprint 1-2) — DONE ✓
- [x] Docker Compose setup (all 4 services)
- [x] Express backend skeleton + health check
- [x] MongoDB connection + audit log schema
- [x] Dossier model with versioning

### Phase 2: Validation Engine (Sprint 3-4) — DONE ✓
- [x] Folder structure validator
- [x] Excel parser (SheetJS)
- [x] Field validation (required, date, enum, int, regex)
- [x] TT05 cross-validation rules (count, prefix, duplicates, PDF mapping, date range)
- [x] Auto-fix engine (date format, trim, fuzzy enum, int extraction)
- [x] Upload route (multer, ZIP support, security)
- [x] Validate routes (/validate/:id, /validate-inline)
- [x] Save route (versioning, sanitization)
- [x] Unit tests (40/40 passing)

### Phase 3: Frontend UI (Sprint 5-6) — DONE ✓
- [x] React scaffold (18.2.0 + Ant Design 5.14.0 + Vite 5.1.0)
- [x] Upload panel (drag/drop, folder picker, tree preview)
- [x] Excel grid (virtualized, inline editing, error highlighting)
- [x] Error panel (filterable, navigable, drill-down)
- [x] Auto-fix suggestions (show before/after, apply)
- [x] Workflow bar (status + action buttons)
- [x] PDF viewer (presigned URL support)
- [x] Layout (header, sidebar, responsive)
- [x] Authentication (LoginPage, auth-context, JWT)
- [x] Docker multi-stage build (Node:18 build → Nginx:1.25 serve)

### Phase 4: Workflow & RBAC (Sprint 7-8) — DONE ✓
- [x] Workflow state machine (UPLOAD → VALIDATING → VALIDATED → APPROVED → PACKAGING → DONE + REJECTED → UPLOAD)
- [x] RBAC middleware + JWT (Operator, Approver, Signer, Admin, Auditor roles)
- [x] Approval endpoints (/approve, /reject)
- [x] Dossier list/detail endpoints (/dossiers, /dossiers/:id)
- [x] Audit log integration + queries
- [x] Frontend QueueViewPage (dossier list + filters)
- [x] Notifications stub (saves to collection)

### Phase 5: SIP Packaging (Sprint 9-10) — DONE ✓
- [x] METS.xml generation (METS 1.12)
- [x] EAD.xml generation (EAD 3)
- [x] PREMIS.xml generation (PREMIS 3)
- [x] SHA-256 checksum computation
- [x] ZIP packaging (folder structure + metadata)
- [x] BullMQ async queue (sip-packaging) with Redis
- [x] API: POST /api/package (enqueue), GET /api/package/:jobId/status (poll)

### Phase 6: Storage & UX Polish (Sprint 11-12)
- [ ] MinIO integration + presigned URLs
- [ ] Signature verification
- [ ] SSE progress notifications
- [ ] PDF preview + viewer

### Phase 7: Dashboard & Admin (Sprint 13-14)
- [ ] Dashboard (stats, charts, trends)
- [ ] Audit log viewer (filter, drill-down)
- [ ] User management (create, lock, role assignment)
- [ ] SIP viewer (unzip, browse, download)

### Phase 8: Testing & Hardening (Sprint 15-16) — DONE ✓
- [x] Unit tests (validators, services) — 12 tests
- [x] Integration tests (API endpoints, workflows) — 35 tests
- [x] Test infrastructure (Jest, MongoMemoryServer, helpers)
- [x] GitHub Actions CI pipeline
- [x] Security audit & hardening (Helmet, rate limiting, CORS)

---

## Technology Stack (Phase 3 Complete)

| Layer | Technology | Status | Notes |
|-------|-----------|--------|-------|
| **Frontend** | React 18.2.0 | ✓ Implemented | Vite 5.1.0 for bundling |
| | Ant Design 5.14.0 | ✓ Implemented | UI component library |
| | React Router 6.22.0 | ✓ Implemented | SPA routing + auth guards |
| | @tanstack/react-query 5.18.0 | ✓ Implemented | Server state management + caching |
| | Axios 1.6.0 | ✓ Implemented | HTTP client with JWT interceptor |
| | dayjs 1.11.10 | ✓ Implemented | Date formatting (locale-aware) |
| **Backend** | Node.js 18+ | ✓ Implemented | Runtime |
| | Express 4.x | ✓ Implemented | API framework |
| | MongoDB 5.0+ | ✓ Implemented | Audit logs, config, schema |
| | MinIO | ✓ Planned | S3-compatible object storage |
| **Proxy** | Nginx 1.25-alpine | ✓ Implemented | Reverse proxy + static file serve |
| **Parsing** | SheetJS (xlsx 0.18.5) | ✓ Implemented | Excel reading/writing |
| **Utilities** | fast-levenshtein 2.0.6 | ✓ Implemented | Fuzzy enum matching |
| | adm-zip 0.5.10 | ✓ Implemented | ZIP file handling |
| | tmp 0.2.1 | ✓ Implemented | Temp file cleanup |
| **Auth** | jsonwebtoken 9.x | ✓ Implemented | JWT token generation/verification |
| **Auth** | bcryptjs 2.4.3 | ✓ Implemented | Password hashing (Phase 4) |
| **Upload** | multer 1.x | ✓ Implemented | File upload middleware |
| **Async Queue** | bullmq 5.76.2 | ✓ Implemented | Job queue for SIP packaging (Phase 5) |
| **Redis** | ioredis 5.3.2 | ✓ Implemented | Redis client for BullMQ (Phase 5) |
| **Archive** | archiver 7.0.1 | ✓ Implemented | ZIP file creation (Phase 5) |
| **XML** | xmlbuilder2 4.0.3 | ✓ Implemented | METS/EAD/PREMIS XML generation (Phase 5) |
| **S3 Storage** | minio 7.1.3 | ✓ Planned | MinIO integration (Phase 6) |
| **Logging** | winston 3.11.0 | ✓ Implemented | Structured logging (Phase 4) |
| **Testing** | jest 29.x | ✓ Implemented | Test runner (Phase 8) |
| **Testing** | @mongodb-js/oidc-mock-server | ✓ Implemented | DB mocking (Phase 8) |
| **Testing** | supertest 6.x | ✓ Implemented | HTTP assertion (Phase 8) |
| **Testing** | MongoMemoryServer | ✓ Implemented | In-memory MongoDB (Phase 8) |
| **CI/CD** | GitHub Actions | ✓ Implemented | Automated test pipeline (Phase 8) |
| **Signing** | node-xmldsig or xmldom | ✓ Planned | XMLDSig signing (Phase 6) |
| **Container** | Docker + Docker Compose | ✓ Implemented | Dev + deployment |

---

## Architecture Decisions (Confirmed)

### Stateless API
- No server-side sessions
- JWT tokens in Authorization header
- State in request/response or MongoDB (audit only)
- Implication: Can scale horizontally, no session affinity

### Storage Abstraction
- MinIO object storage (S3-compatible)
- Buckets: `pdf-files/` + `sip-files/`
- Presigned URLs for client downloads
- Implication: No direct file serving, all via MinIO

### Monolithic for MVP
- Single Express API (not microservices yet)
- Frontend + backend can be deployed together
- Planned for later: split Validation + Packaging into services

### Enum Validation: Strict TT05
- Exact string matching, no fuzzy or normalization
- E.g., "01: Nghị quyết" ≠ "01" or "01-Nghị quyết"
- Stored in DB, not hardcoded
- Implication: Support multi-version TT05 (2025, 2026, etc.)

---

## Tech Debt & Known Limitations

| Issue | Impact | Plan |
|-------|--------|------|
| No test coverage yet | Risk of regressions | Add unit + integration tests in Phase 2 |
| No error handling framework | Production fragile | Define error codes + responses in Phase 1 |
| No logging framework | Debugging hard | Add Winston or Pino in Phase 1 |
| Excel parsing untested | May fail on edge cases | Test with real archives' files |
| No rate limiting | Potential DoS | Add express-rate-limit before production |
| No input sanitization | XSS/injection risk | Add input validation middleware Phase 1 |

---

## Dependencies (npm packages, installed)

### Backend (`backend/package.json`)
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "mongoose": "^7.0.0",
  "jsonwebtoken": "^9.0.0",
  "multer": "^1.4.5",
  "morgan": "^1.10.0",
  "xlsx": "^0.18.5",
  "adm-zip": "^0.5.10",
  "fast-levenshtein": "^2.0.6",
  "tmp": "^0.2.1"
}
```

### Frontend (`frontend/package.json`) — Phase 3 New
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.22.0",
  "antd": "^5.14.0",
  "@ant-design/icons": "^5.3.0",
  "axios": "^1.6.0",
  "@tanstack/react-query": "^5.18.0",
  "dayjs": "^1.11.10"
}

devDependencies: {
  "vite": "^5.1.0",
  "@vitejs/plugin-react": "^4.2.0"
}
```

**Phase 2 Additions (Backend):**
- `xlsx` — Excel parsing with SheetJS
- `adm-zip` — ZIP file handling
- `fast-levenshtein` — Fuzzy matching for auto-fix suggestions
- `tmp` — Temporary file cleanup

**Phase 3 Additions (Frontend):**
- `react` + `react-dom` — UI framework
- `react-router-dom` — SPA routing
- `antd` + `@ant-design/icons` — Component library
- `axios` — HTTP client
- `@tanstack/react-query` — Server-side data fetching + caching
- `dayjs` — Date formatting
- `vite` — Bundler (build + dev server)

**Dev dependencies:**
- Node.js test runner (built-in, no Jest)

---

## Next Steps

1. **Week 1:** Scaffold Docker Compose, set up backend + database
2. **Week 2:** Implement file structure validator + Excel parser
3. **Week 3:** Complete field validation rules, error response format
4. **Week 4:** Build frontend grid UI + error panel
5. **Week 5-6:** Workflow state machine + approval flow
6. **Week 7-8:** SIP packaging + signature
7. **Week 9-10:** Dashboard + polish + deployment

---

## Running the Skeleton (When Ready)

```bash
cd /mnt/d/app/sip
docker-compose up --build

# Backend: http://localhost:8080/api/health
# Frontend: http://localhost:8080
# MinIO Console: http://localhost:9001
```

---

## Cross-References

- **Requirements (Source of Truth):** `/docs/requirements.md`
- **Code Standards:** `/docs/code-standards.md` (follow when implementing)
- **Architecture:** `/docs/system-architecture.md` (refer to before coding)
- **Roadmap:** `/docs/project-roadmap.md` (timeline + milestones)
