# System Architecture

**Version:** 1.5  
**Last Updated:** 2026-04-26 (Phase 1-8 Complete)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React)                      │
│            Upload | Excel Grid | Error Panel            │
│           Dashboard | Workflow Controls | SIP Viewer    │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/REST (JWT)
                       ▼
        ┌──────────────────────────────┐
        │   Nginx :8080                │
        │ Reverse Proxy + Static Files │
        └──────────────┬───────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────────────┐
│              Express Backend :3000                        │
│  POST /api/validate → Validation Service                 │
│  POST /api/save → Data Storage                           │
│  POST /api/package → Packaging Engine                    │
│  POST /api/sign → Signing Service                        │
│  GET /api/dashboard → Stats Aggregator                   │
│  GET /api/logs → Audit Log Query                         │
└────┬────────────────────────────────────────────────────┬─┘
     │                                                      │
     ▼                                                      ▼
┌──────────────────────┐                      ┌──────────────────────┐
│ MongoDB :27017       │                      │ MinIO :9000          │
│ Audit Logs           │                      │ Buckets:             │
│ Config               │                      │  - pdf-files/        │
│ Schema Versions      │                      │  - sip-files/        │
└──────────────────────┘                      └──────────────────────┘
```

---

## Component Breakdown

### 1. Frontend (React 18 + Ant Design 5 + Vite 5) — Phase 4-5 Complete

**Technology Stack:**
- React 18.2.0 + React Router v6 for SPA navigation
- Vite 5.1.0 for bundling (dev server, multi-stage Docker build)
- Ant Design 5.14.0 component library
- @tanstack/react-query 5.18.0 for server-side data fetching + caching
- Axios 1.6.0 with interceptors for JWT + error handling
- dayjs 1.11.10 for date formatting (locale-aware)

**State Management:**
- React Context (auth-context.jsx) for user session + role
- Local component state for UI (forms, modals)
- React Query for server state (dossiers, validation results)
- Custom hooks: use-auth, use-dossier, use-validation

**Architecture:**
```
src/
├── components/
│   ├── layout/          (AppLayout, AppHeader, AppSidebar)
│   ├── upload/          (UploadPanel, FolderTreeView)
│   ├── excel/           (ExcelGrid, ExcelCell, EnumDropdown)
│   ├── errors/          (ErrorPanel, ErrorItem, AutoFixPanel)
│   ├── workflow/        (WorkflowBar)
│   ├── dossier/         (QueueViewPage, DossierListTable, DossierStatusBadge)
│   └── pdf/             (PdfViewer)
├── pages/
│   ├── LoginPage.jsx    (Auth entry point)
│   ├── DossierPage.jsx  (Main workflow + edit)
│   └── QueueViewPage.jsx (Dossier list with filters + state badges)
├── config/
│   ├── api-client.js    (Axios instance + interceptors)
│   └── theme-config.js  (Ant Design theme override)
├── context/
│   └── auth-context.jsx (User state + JWT)
├── hooks/
│   ├── use-auth.js
│   ├── use-dossier.js   (Query dossier data)
│   └── use-validation.js
├── utils/
│   ├── enum-labels.js   (Enum display mapping)
│   └── format-helpers.js
└── App.jsx + main.jsx
```

**Key Flows Implemented:**

#### Upload Flow
1. User drags folder/ZIP onto UploadPanel
2. Component reads folder structure via Web APIs
3. POST /api/upload → backend creates dossier
4. Success → navigate to DossierPage with dossierID

#### Validation Flow
1. User views Excel grids (Ho_so, Van_ban sheets)
2. Error highlight cells in red, warnings in yellow
3. Click error → scroll to cell, show suggestion in AutoFixPanel
4. User applies fix → grid updates locally
5. Click "Save" → POST /api/save, re-validate

#### RBAC UI
- LoginPage shows role after auth
- WorkflowBar buttons enabled/disabled by role (RBAC enforced in backend)
- Sidebar navigation filtered by role (UI-level hiding, not security)

**Responsibilities (Implemented):**
- Upload dossier (drag & drop, folder picker)
- Render Excel sheets (Ho_so + Van_ban) in editable grid
- Display validation errors with filtering + drill-down
- Show auto-fix suggestions with before/after diff
- Manage workflow state transitions via WorkflowBar
- PDF viewer with presigned URL support

**Key Components (Fully Implemented):**
- `UploadPanel.jsx` — Drag/drop, folder picker, tree preview
- `ExcelGrid.jsx` — Virtualized table, cell editing, error highlighting
- `EnumDropdown.jsx` — Inline enum selector (saves on blur)
- `ErrorPanel.jsx` — Filterable error list, drill-down to cell
- `AutoFixPanel.jsx` — Show suggestion, apply or skip
- `WorkflowBar.jsx` — State display + action buttons (Approve, Package, Sign)
- `PdfViewer.jsx` — Iframe with presigned URL
- `AppLayout.jsx` — Grid layout (sidebar + main content)
- `LoginPage.jsx` — Email/password form, JWT storage
- `QueueViewPage.jsx` — Dossier list page with state/date filters (Phase 4)
- `DossierListTable.jsx` — Pagination + inline actions (Phase 4)
- `DossierStatusBadge.jsx` — Visual state indicators (Phase 4)

**API Client:**
- Axios instance (src/config/api-client.js) with:
  - Request interceptor: add JWT from localStorage
  - Response interceptor: 401 → silent token refresh (if refresh endpoint exists)
  - Error handler: normalize response errors
- CORS headers managed by backend (see `POST /api/login` for token flow)

**Token Management (JWT in localStorage):**
```javascript
// After successful login:
localStorage.setItem('token', response.data.token);
// All requests include: Authorization: Bearer {token}
```

**Rendering Performance:**
- ExcelGrid uses windowing for large datasets (1000+ rows)
- Components memoized to prevent unnecessary re-renders
- React Query caches dossier data (stale-while-revalidate)

---

### 2. Backend (Express.js)

**Responsibilities:**
- Route all HTTP requests
- Authenticate (JWT) and authorize (RBAC)
- Delegate to service modules
- Log all actions to MongoDB
- Handle file uploads via multer
- Generate presigned URLs for MinIO access

**Core Modules:**

#### 2.1 Validation Service (Phase 2 Complete)
```
POST /api/validate/:id
├── folder-structure-validator: Check Attachment/ + Metadata/
├── excel-parser-service: SheetJS → Ho_so + Van_ban JSON
├── field-validator-service: Required, enum (exact match), date, int, regex
├── cross-validator-service: Count, prefix, duplicates, date range, hierarchy
├── pdf-mapping-validator: Field 21 filenames + {MaLuuTru}.pdf fallback
├── auto-fix-service: Suggest date reformat, trim, fuzzy enum, int extraction
└── validation-orchestrator: Chain & aggregate errors + suggestions

POST /api/validate-inline
├── Single field validation with real-time suggestions
└── Used for in-grid editing feedback
```

#### 2.2 Data Storage Service (Phase 2 Complete)
```
POST /api/save
├── Input sanitization (no script tags, SQL)
├── Apply user-approved fixes to Excel
├── Version history (cap at 20 versions)
├── Save new Excel version (temp storage)
├── Re-validate after save
└── Return updated state + new errors
```

#### 2.3 Workflow Service (Phase 4 Complete)
```
State Machine (UPLOAD → VALIDATING → VALIDATED → APPROVED → PACKAGING → DONE)
                                            ↓
                                         REJECTED → UPLOAD

POST /api/approve
├── Verify role = APPROVER (RBAC)
├── Check state = VALIDATED
├── Transition to APPROVED
├── Log action to audit_logs
└── Notify stakeholders (stub)

POST /api/reject
├── Verify role = APPROVER (RBAC)
├── Check state = VALIDATED or APPROVED
├── Transition to REJECTED (reverts to UPLOAD)
├── Log action to audit_logs
└── Notify stakeholders

GET /api/dossiers
├── Query MongoDB for all dossiers (Operator: own only)
├── Support filters: state, dateRange, maHoSo
├── Return paginated list with state badges
└── Include validation summary per dossier

GET /api/dossiers/:id
├── Query MongoDB for specific dossier
├── Return full state + excelData + validationResult
└── Include audit trail for all transitions
```

#### 2.4 Packaging Engine (Phase 5 Complete)
```
Inputs: Excel data, PDF files, approved dossier
Process:
  1. Generate METS.xml (METS 1.12)
     ├── Describe structure
     ├── Reference all files
     └── Include checksums
  2. Generate EAD.xml (EAD 3)
     ├── Describe dossier hierarchy
     ├── Map to Ho_so + Van_ban
     └── Add keywords, dates
  3. Generate PREMIS.xml (PREMIS 3)
     ├── File format info
     ├── Hardware/software used
     └── Preservation events
  4. Compute SHA-256 checksums for all files
  5. Create folder structure:
     SIP_[MaHoSo]/
     ├── METS.xml
     ├── metadata/
     │   ├── EAD.xml
     │   ├── PREMIS.xml
     │   └── checksums.csv
     └── representations/original/
         └── *.pdf
  6. Zip all into SIP_[MaHoSo]_[YYYYMMDD].zip
Outputs: SIP zip file (stored in temp, ready for signing in Phase 6)
```

**Implementation Details (Phase 5):**
- Service: `sip-packaging-service.js` — orchestrates all generators
- BullMQ async queue (`sip-packaging`): decouples packaging from HTTP request
- Redis queue: stores job state (waiting → active → completed/failed)
- METS generator: `mets-generator.js` — METS 1.12 XML (structure + checksums)
- EAD generator: `ead-generator.js` — EAD 3 XML (archival description)
- PREMIS generator: `premis-generator.js` — PREMIS 3 XML (preservation metadata)
- Checksum service: `checksum-service.js` — SHA-256 for all files

#### 2.5 Signing Service (Phase 6 — Deferred)
```
POST /api/sign — NOT YET IMPLEMENTED
├── Verify dossier state = PACKAGING
├── Load SIP XML files from temp
├── Sign with XMLDSig:
│   ├── Load private key
│   ├── Compute signature
│   ├── Embed signature in XML
│   └── Add TSA timestamp
├── Verify signature (self-test)
├── Update dossier state → DONE
└── Upload signed SIP to MinIO (Phase 6)
```

#### 2.6 Audit Log Service (Phase 4 Complete)
```
Database: MongoDB collection "audit_logs"
Schema:
{
  _id: ObjectID,
  action: "UPLOAD|VALIDATE|APPROVE|REJECT|PACKAGE|SIGN|DOWNLOAD",
  userID: "user-email",
  dossierID: "MaHoSo",
  fileName: "dossier-name",
  timestamp: ISO8601,
  resultStatus: "SUCCESS|ERROR|WARNING",
  errorCount: 5,
  warningCount: 2,
  details: { 
    excelRows: Number,
    filesCount: Number,
    errors: [...],
    sipSize: Number,
    signatureValid: Boolean,
    fromState: "VALIDATED",
    toState: "APPROVED"  /* for state transitions */
  }
}

All actions append-only; no updates/deletes after creation.
Indexes:
- { dossierID: 1, timestamp: -1 } (query by dossier)
- { action: 1, timestamp: -1 } (query by action)
- { timestamp: -1 } (recent activities)
```

#### 2.7 Notification Service (Phase 4 Stub)
```
Database: MongoDB collection "notifications"
Schema:
{
  _id: ObjectID,
  userID: "user-email",
  dossierID: "MaHoSo",
  type: "STATE_CHANGE|ERROR|SUCCESS",
  message: "Hồ sơ được phê duyệt",
  read: false,
  createdAt: ISO8601
}

MVP: Stub saves to collection only (no email/SMS yet)
Future: Integrate with email/SMS/push notification services
```

#### 2.8 Dashboard / Stats Service
```
GET /api/stats?period=30d&groupBy=week
├── Count dossiers by state (UPLOAD, VALIDATED, DONE)
├── Sum errors by field (top 10)
├── Calculate success rate (DONE / total)
├── Error trend over time
└── Return aggregated data for Chart.js
```

**Routes Structure (Phase 4-5 Implementation):**
```
routes/
├── upload-routes.js   (POST /api/upload) — PHASE 2 ✓
│   ├── multer middleware (folder or ZIP)
│   ├── ZIP bomb guard (max 500MB)
│   ├── Path traversal protection
│   ├── Temp file cleanup
│   └── Dossier creation
├── validate-routes.js (POST /api/validate/:id, POST /api/validate-inline) — PHASE 2 ✓
│   ├── Full validation pipeline
│   └── Single-field inline validation
├── save-routes.js     (POST /api/save) — PHASE 2 ✓
│   ├── Input sanitization
│   ├── Version management
│   └── Re-validation
├── auth-routes.js     (POST /login, POST /logout, PUT /password) — PHASE 4 ✓
│   ├── JWT generation + refresh
│   ├── Password hashing (bcryptjs)
│   └── Session management
├── user-routes.js     (GET /users, POST /users, PUT /users/:id) — PHASE 4 ✓
│   ├── User CRUD operations
│   ├── Role assignment
│   └── RBAC enforcement
├── dossier-routes.js  (GET /dossiers, GET /dossiers/:id) — PHASE 4 ✓
│   ├── Paginated dossier list (filters: state, dateRange)
│   ├── Dossier detail + audit trail
│   └── Operator: own dossiers only
├── approve-routes.js  (POST /approve, POST /reject) — PHASE 4 ✓
│   ├── State machine enforcement
│   ├── RBAC: Approver role required
│   └── Audit log integration
├── package-routes.js  (POST /package, GET /package/:jobId/status) — PHASE 5 ✓
│   ├── BullMQ queue enqueue
│   ├── Job status polling
│   └── Async SIP generation
├── sign-routes.js     (POST /sign) — PHASE 6 (Planned)
│   ├── XMLDSig signing
│   ├── TSA integration
│   └── MinIO upload
├── dashboard-routes.js (GET /stats, GET /logs) — PHASE 7
│   ├── Stats aggregation
│   └── Audit log queries
├── files-routes.js    (GET /files, GET /preview, GET /download) — PHASE 6
│   ├── MinIO presigned URLs
│   └── File serving
└── health-routes.js   (GET /health) — PHASE 1 ✓
```

---

### 3. Database (MongoDB)

**Collections:**

#### audit_logs
```javascript
{
  _id: ObjectId,
  action: String,           // UPLOAD|VALIDATE|APPROVE|PACKAGE|SIGN
  userID: String,           // user email
  dossierID: String,        // MaHoSo
  fileName: String,
  timestamp: Date,
  resultStatus: String,     // SUCCESS|ERROR|WARNING
  errorCount: Number,
  warningCount: Number,
  details: {                // action-specific
    excelRows: Number,
    filesCount: Number,
    errors: [...],
    sipSize: Number,
    signatureValid: Boolean
  }
}

Indexes:
- { dossierID: 1, timestamp: -1 } (query by dossier)
- { action: 1, timestamp: -1 } (query by action)
- { timestamp: -1 } (recent activities)
```

#### config
```javascript
{
  _id: ObjectId,
  key: String,              // MINIO_CONFIG, JWT_EXPIRY, etc.
  value: Any,
  updatedAt: Date,
  updatedBy: String
}
```

#### schema_versions
```javascript
{
  _id: ObjectId,
  version: String,          // "2025", "2026"
  hoSoFields: [             // Field definitions
    { name: "maHoSo", required: true, type: "string", pattern: "..." },
    { name: "tenLoaiVanBan", required: true, enum: ["01: Nghị quyết", ...] }
  ],
  vanBanFields: [...],
  createdAt: Date
}
```

#### users (Phase 4)
```javascript
{
  _id: ObjectId,
  email: String,            // unique
  passwordHash: String,     // bcryptjs
  role: String,             // Admin|Operator|Approver|Signer|Auditor
  active: Boolean,
  createdAt: Date,
  lastLogin: Date
}
```

#### notifications (Phase 4 Stub)
```javascript
{
  _id: ObjectId,
  userID: String,           // user email
  dossierID: String,        // MaHoSo
  type: String,             // STATE_CHANGE|ERROR|SUCCESS
  message: String,
  read: Boolean,
  createdAt: Date
}
```

#### dossiers (Phase 4)
```javascript
{
  _id: ObjectId,
  maHoSo: String,           // folder name (unique)
  state: String,            // UPLOAD|VALIDATING|VALIDATED|APPROVED|PACKAGING|DONE|REJECTED
  uploadedBy: String,       // user email
  excelData: {
    HoSo: [...],            // Excel rows
    VanBan: [...]
  },
  validationResult: {
    valid: Boolean,
    errorCount: Number,
    warningCount: Number,
    errors: [...],
    suggestions: [...]
  },
  versions: [
    { versionNum: 1, timestamp: Date, excelData: {...} }
  ],
  pdfFiles: [String],       // List of PDF filenames
  tempPath: String,         // Temp folder path
  createdAt: Date,
  updatedAt: Date,
  stateHistory: [
    { from: "UPLOAD", to: "VALIDATING", actor: "user@example.com", timestamp: Date }
  ]
}
```

---

### 4. Storage (MinIO)

**Purpose:** S3-compatible object storage for PDFs and SIPs

**Buckets:**

#### pdf-files/
```
Structure: pdf-files/YYYY/MM/[MaHoSo]/
Example:   pdf-files/2026/04/HS001/H49.61.8.2017.01.0000001.pdf
           pdf-files/2026/04/HS001/H49.61.8.2017.01.0000002.pdf

Usage: Store uploaded PDFs before validation (filenames match Van_ban field 21)
```

#### sip-files/
```
Structure: sip-files/YYYY/MM/
Example:   sip-files/2026/04/SIP_HS001_20260425.zip
           sip-files/2026/04/SIP_HS002_20260425.zip

Usage: Store completed, signed SIPs
```

**Access:** Presigned URLs only (no direct file serving)
- Expiry: 1 hour
- Generated on-demand by backend
- Example: `https://minio.example.com/pdf-files/2026/04/HS001/VB001.pdf?X-Amz-Expires=3600&...`

---

## Workflow State Machine (Phase 4 Complete)

### State Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                      DOSSIER LIFECYCLE                      │
└─────────────────────────────────────────────────────────────┘

Initial: UPLOAD
  ├─ User uploads dossier (folder or ZIP)
  ├─ Temp files stored
  ├─ Auto-transitions to VALIDATING (system)
  └─→ State: VALIDATING

Validation: VALIDATING
  ├─ System runs validation pipeline
  ├─ Checks folder structure, Excel, fields, cross-rules
  ├─ Returns errors + suggestions
  └─→ State: VALIDATED (success) OR UPLOAD (critical failure)

Review: VALIDATED
  ├─ User edits Excel grid (fixes errors)
  ├─ POST /api/save re-validates
  ├─ Approver button enabled (RBAC: Approver role)
  └─→ State: APPROVED (approver action)
      OR REJECTED (approver action)

Approval: APPROVED
  ├─ Dossier locked (read-only)
  ├─ Packaging button enabled
  ├─ POST /api/package enqueues BullMQ job
  └─→ State: PACKAGING (system auto-transition)

Packaging: PACKAGING
  ├─ BullMQ job running in background
  ├─ METS.xml, EAD.xml, PREMIS.xml generated
  ├─ Checksums computed
  ├─ ZIP created: SIP_[MaHoSo]_[YYYYMMDD].zip
  ├─ Poll via GET /api/package/:jobId/status
  └─→ State: DONE (system auto-transition on success)
      OR UPLOAD (system auto-transition on failure)

Final: DONE
  ├─ SIP ready for signing (Phase 6: XMLDSig + TSA)
  ├─ Upload to MinIO (Phase 6)
  └─ No further transitions allowed

Rejected: REJECTED
  ├─ Approver rejected dossier at VALIDATED state
  ├─ Approver provides reason (optional comment)
  └─→ State: UPLOAD (auto-revert, allows re-edit)
```

### Allowed Transitions
```javascript
UPLOAD        → VALIDATING
VALIDATING    → VALIDATED | UPLOAD
VALIDATED     → APPROVED | REJECTED
APPROVED      → PACKAGING
PACKAGING     → DONE
REJECTED      → UPLOAD
DONE          → (no transitions)
```

### Role Guards (RBAC)
```javascript
VALIDATED → APPROVED:   Requires APPROVER or ADMIN role
VALIDATED → REJECTED:   Requires APPROVER or ADMIN role
APPROVED  → PACKAGING:  Requires OPERATOR, APPROVER, or ADMIN role
```

### Implementation
- **Service:** `workflow-engine.js` — state machine logic
- **Enforcement:** RBAC middleware checks role before transition
- **Logging:** Every transition logged to `audit_logs` collection
- **Atomicity:** `findOneAndUpdate` with state precondition prevents race conditions

---

## Data Flow: Complete Workflow (Phase 4-5 Complete)

```
1. USER UPLOADS DOSSIER — PHASE 2 COMPLETE ✓
   ↓
   Frontend: [UploadPanel] → drag/drop/folder → /api/upload
   ↓
   Backend:  multer → ZIP extraction → folder structure validation
   ↓
   Success: Store dossier in MongoDB → parse Excel → create temp files
   Error:   Block → return structured error response

2. SYSTEM VALIDATES — PHASE 2 COMPLETE ✓
   ↓
   Backend: Validation Orchestrator chains:
   - Folder structure check (Attachment/ + Metadata/)
   - Excel parsing (SheetJS Ho_so + Van_ban sheets)
   - Field validation (required, enum exact match, date DD/MM/YYYY, int, regex)
   - Cross-validation (count, prefix, duplicates, date range, retention)
   - PDF mapping (field 21 filenames, {MaLuuTru}.pdf fallback)
   - Auto-fix scanning (suggest reformat, trim, fuzzy enum, int extraction)
   ↓
   Response: List of errors + suggestions (row, field, code, severity, confidence)
   ↓
   Frontend: [ErrorPanel] displays errors, [ExcelGrid] highlights cells

3. USER REVIEWS & APPLIES FIXES — PHASE 3 COMPLETE ✓
   ↓
   Frontend: [DossierPage] shows Ho_so + Van_ban sheets in ExcelGrid
   - Cells color-coded: red = ERROR, yellow = WARNING, white = OK
   - Click cell → [ErrorPanel] shows error + suggestion in [AutoFixPanel]
   ↓
   Frontend: User edits directly in grid or selects fix from AutoFixPanel
   - Inline enum dropdown for TT05 fields
   - Text input for free-text fields
   - Changes highlighted locally
   ↓
   Backend: POST /api/validate-inline → single-field suggestion
   Frontend: Shows suggestion before save
   ↓
   Frontend: User selects fixes → POST /api/save
   ↓
   Backend: Apply fixes → sanitize input → version (cap 20) → re-validate
   ↓
   Frontend: ExcelGrid refreshes with validation results

4. USER APPROVES (Phase 4 Complete)
   ↓
   Frontend: [WorkflowBar] "Approve" button (Approver role only)
   ↓
   Backend: POST /api/approve
   ├── Verify role = APPROVER (RBAC middleware)
   ├── Check state = VALIDATED
   ├── Update dossier state → APPROVED
   ├── Log action to audit_logs
   └── Notify stakeholders (stub to notifications collection)
   ↓
   State: VALIDATED → APPROVED

5. APPROVER CAN REJECT (Phase 4 Complete)
   ↓
   Frontend: [WorkflowBar] "Reject" button
   ↓
   Backend: POST /api/reject
   ├── Verify role = APPROVER (RBAC middleware)
   ├── Check state = VALIDATED or APPROVED
   ├── Update dossier state → REJECTED
   ├── Log action to audit_logs
   └── Auto-transition to UPLOAD (allows re-edit)
   ↓
   State: VALIDATED/APPROVED → REJECTED → UPLOAD

6. SYSTEM PACKAGES SIP (Phase 5 Complete)
   ↓
   Frontend: [WorkflowBar] "Package" button (state = APPROVED)
   ↓
   Backend: POST /api/package
   ├── Verify state = APPROVED, errorCount = 0
   ├── Enqueue BullMQ job (sip-packaging queue)
   ├── Return { jobId } for polling
   └── State: APPROVED → PACKAGING (system)
   ↓
   BullMQ Worker Process:
   ├── Generate METS.xml (METS 1.12)
   ├── Generate EAD.xml (EAD 3)
   ├── Generate PREMIS.xml (PREMIS 3)
   ├── Compute SHA-256 checksums
   ├── Create folder: SIP_[MaHoSo]/
   ├── Zip: SIP_[MaHoSo]_[YYYYMMDD].zip
   ├── Update job status (completed or failed)
   └── Auto-transition state: PACKAGING → DONE or UPLOAD
   ↓
   Frontend: Poll GET /api/package/:jobId/status until complete
   ↓
   State: PACKAGING → DONE (success) OR UPLOAD (failure)

7. AUTHORIZED SIGNER SIGNS (Phase 6 — Planned)
   ↓
   Frontend: [WorkflowBar] "Sign" button (Signer role, state = DONE)
   ↓
   Backend: POST /api/sign
   ├── Load SIP XML files from temp storage
   ├── XMLDSig: sign METS, EAD, PREMIS
   ├── TSA: add timestamp authority signature
   ├── Verify signature (self-test)
   ├── Upload signed SIP to MinIO sip-files/
   └── State: DONE (no state change)
   ↓
   Status: SIP ready for archival

8. ARCHIVISTS RETRIEVE & STORE (Phase 6)
   ↓
   Frontend: Dashboard → drill-down SIP → download or preview
   ↓
   Backend: GET /api/files/preview → generate presigned URL (1 hour)
   ↓
   Frontend: Browser opens presigned URL → download from MinIO
   ↓
   Archivists: Receive SIP_[MaHoSo].zip → store in archive

9. AUDIT & COMPLIANCE (Phase 4 Complete)
   ↓
   All actions logged to audit_logs collection (immutable)
   ↓
   Audit trail includes state transitions + actor + timestamp
   ↓
   Auditors: [Dashboard] view audit trail, filter by action/date/user
   ↓
   Reports: Download CSV/PDF for compliance review (Phase 7)
```

---

## Role-Based Access Control (Phase 4 Complete)

### Roles & Permissions
```javascript
ADMIN {
  permissions: * (all actions)
  description: "System administrator, all access"
}

OPERATOR {
  permissions: [
    upload_dossier,
    edit_own_dossier,
    view_own_dossiers,
    initiate_package,
    validate_inline
  ]
  description: "Archives staff — upload & edit dossiers"
}

APPROVER {
  permissions: [
    view_all_dossiers,
    approve_dossier,
    reject_dossier,
    view_audit_logs
  ]
  description: "Archivists or supervisors — approve after validation"
}

SIGNER {
  permissions: [
    sign_sip,
    view_done_dossiers
  ]
  description: "Authorized signer — digital signature on SIPs"
}

AUDITOR {
  permissions: [
    view_audit_logs,
    view_all_dossiers,
    export_audit_trail
  ]
  description: "Compliance officer — read-only audit access"
}
```

### RBAC Enforcement (Middleware)
```javascript
// All protected routes:
1. authMiddleware — verify JWT signature, decode token
2. requireRole(ROLES.APPROVER, ROLES.ADMIN) — check role before business logic
// If role not in list → 403 Forbidden

Example:
app.post('/api/approve', authMiddleware, requireRole(ROLES.APPROVER, ROLES.ADMIN), approveHandler);
```

### Implementation
- **Middleware:** `rbac-middleware.js` — requireRole() factory
- **JWT Contents:** `{ sub: "user-email", role: "Approver", iat, exp }`
- **Stateless:** No DB lookup for role check (role embedded in JWT)
- **Logged:** Every protected action includes role in audit log

---

## Stateless API Design

**Principle:** API holds no server state between requests

**Implications:**
- No session store (no PHP sessions, no Redis session cache)
- All state in JWT token or MongoDB
- Horizontal scaling: requests can hit any instance
- Load balancer can use round-robin (no sticky sessions)

**JWT Token Contents:**
```json
{
  "sub": "user-email",
  "role": "Operator",
  "iat": 1234567890,
  "exp": 1234571490
}
```

**Stateless Checks:**
```javascript
POST /api/approve
Header: Authorization: Bearer <JWT>
Body: { dossierID: "HS001" }

Backend:
1. Verify JWT signature (stateless auth)
2. Decode to get role
3. Check role in RBAC matrix (no DB lookup required)
4. Query MongoDB for dossier state
5. Validate state machine transition
6. Update dossier + log audit
7. Return response
```

---

## Validation Rules Matrix (TT05)

**Ho_so Sheet (18 fields):**

| Field | Type | Required | Rule | Severity |
|-------|------|----------|------|----------|
| Mã hồ sơ | String | Yes | Regex ≥4 segments separated by `.`; must match folder name | ERROR |
| Tiêu đề hồ sơ | String | Yes | Not empty | ERROR |
| Thời hạn bảo quản | Enum | Yes | `01: Vĩnh viễn`/`02: 70 năm`/`03: 50 năm`/`04: 30 năm`/`05: 20 năm`/`06: 10 năm` | ERROR |
| Chế độ sử dụng | Enum | Yes | `01: Công khai`/`02: Sử dụng có điều kiện`/`03: Mật` | ERROR |
| Ngôn ngữ | Enum | Yes | `01: Tiếng Việt`–`11: Khác` (11 values) | ERROR |
| Thời gian bắt đầu | Date | Yes | DD/MM/YYYY | ERROR |
| Thời gian kết thúc | Date | Yes | DD/MM/YYYY | ERROR |
| Từ khóa | String | Yes | Not empty | ERROR |
| Tổng số tài liệu | Int | Yes | > 0; must equal count(Van_ban rows) | ERROR |
| Số lượng tờ | Int | Yes | > 0 | ERROR |
| Số lượng trang | Int | Yes | > 0 | ERROR |
| Tình trạng vật lý | Enum | No | `01: Tốt`/`02: Bình thường`/`03: Hỏng` if present | WARNING |
| Ký hiệu thông tin | String | No | Free text | — |
| Mức độ tin cậy | Enum | Yes | `01: Gốc điện tử`/`02: Số hóa`/`03: Hỗn hợp` | ERROR |
| Mã hồ sơ gốc giấy | String | No | Free text | — |
| Chế độ dự phòng | Enum | Yes | `1: Có`/`0: Không` | ERROR |
| Tình trạng dự phòng | Enum | Conditional | `01: Đã dự phòng`/`02: Chưa dự phòng`; required when Chế độ DP=`1: Có` | ERROR |
| Ghi chú | String | Yes | Not empty | ERROR |

**Van_ban Sheet (21 fields — key required fields):**

| Field | Type | Required | Rule | Severity |
|-------|------|----------|------|----------|
| Mã định danh tài liệu | String | Yes | Must match document filename | ERROR |
| Mã lưu trữ của tài liệu | String | Yes | Regex `{MaHoSo}.\d{7}` | ERROR |
| Thời hạn bảo quản | Enum | Yes | Same 6-value enum as Ho_so | ERROR |
| Tên loại tài liệu | Enum | Yes | `01: Nghị quyết`–`32: Khác` (32 values) | ERROR |
| Số của tài liệu | String | Yes | Not empty | ERROR |
| Ký hiệu của tài liệu | String | Yes | Not empty | ERROR |
| Ngày, tháng, năm tài liệu | Date | Yes | DD/MM/YYYY | ERROR |
| Tên cơ quan ban hành tài liệu | String | Yes | Not empty | ERROR |
| Trích yếu nội dung | String | Yes | Not empty | ERROR |
| Ngôn ngữ | Enum | Yes | Same 11-value enum as Ho_so | ERROR |
| Số lượng trang | Int | Yes | > 0 | ERROR |
| Ký hiệu thông tin | String | Yes | Not empty | ERROR |
| Từ khóa | String | Yes | Not empty | ERROR |
| Chế độ sử dụng | Enum | Yes | Same 3-value enum as Ho_so | ERROR |
| Mức độ tin cậy | Enum | Yes | Same 3-value enum as Ho_so | ERROR |
| Bút tích | String | No | Free text | — |
| Tình trạng vật lý | Enum | No | Same 3-value enum if present | WARNING |
| Chế độ dự phòng | Enum | Yes | `1: Có`/`0: Không` | ERROR |
| Tình trạng dự phòng | Enum | Conditional | Same as Ho_so; required when Chế độ DP=`1: Có` | ERROR |
| Ghi chú | String | Yes | Not empty | ERROR |
| Đường dẫn tài liệu Quy trình xử lý | String | No | PDF filename(s) comma-separated | — |

**Cross-Validation:**

| Check | Severity |
|-------|----------|
| Document count (Ho_so.TongSo) == count(Van_ban rows) | ERROR |
| Every Van_ban.MaLuuTru starts with Ho_so.MaHoSo | ERROR |
| No duplicate Van_ban.MaLuuTru | ERROR |
| PDF in `Van_ban["Đường dẫn tài liệu"]` (field 21) must exist in `Attachment/`; fallback: `{MaLuuTru}.pdf` | ERROR |
| Extra PDFs in Attachment/ (not referenced by any Van_ban) | WARNING |

---

## API Contracts (Key Endpoints)

### POST /api/validate
**Request:**
```json
{
  "excelData": {
    "HoSo": [[row1], [row2]],
    "VanBan": [[row1], [row2]]
  },
  "tt05Version": "2025"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "dossierID": "HS001",
    "valid": false,
    "errorCount": 3,
    "warningCount": 1,
    "errors": [
      {
        "field": "Mã hồ sơ",
        "row": 2,
        "message": "Required field",
        "severity": "ERROR",
        "code": "REQUIRED_FIELD"
      }
    ],
    "suggestions": [
      { "row": 3, "field": "Ngày bắt đầu", "current": "1/2/2024", "suggested": "01/02/2024" }
    ]
  }
}
```

### POST /api/approve
**Request:**
```json
{ "dossierID": "HS001" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dossierID": "HS001",
    "state": "APPROVED",
    "approvedBy": "approver@example.com",
    "timestamp": "2026-04-25T10:30:00Z"
  }
}
```

### GET /api/stats?period=30d
**Response:**
```json
{
  "success": true,
  "data": {
    "totalDossiers": 150,
    "byState": { "UPLOAD": 10, "VALIDATED": 30, "DONE": 110 },
    "successRate": 0.73,
    "topErrors": [
      { "field": "Mã lưu trữ", "count": 45, "percent": 30 },
      { "field": "Ngày tháng", "count": 35, "percent": 23 }
    ],
    "errorTrendByWeek": [ { "week": "2026-W17", "count": 50 }, ... ]
  }
}
```

---

## Deployment Architecture (Phase 3)

### Frontend Docker Build (Multi-stage)

**Dockerfile (frontend/):**
```dockerfile
# Stage 1: Build
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
# Output: dist/ folder with optimized SPA

# Stage 2: Serve
FROM nginx:1.25-alpine
COPY --from=0 /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 8080
```

**Result:**
- Frontend runs as nginx on :8080 (static files served)
- Backend API proxied to :3000 (via nginx upstream)
- No Node.js in production image (lightweight, fast startup)
- Gzip + caching headers configured in nginx

### Full Docker Compose Stack

```
┌──────────────────────────────────────────┐
│    Docker Compose (Development)          │
├──────────────────────────────────────────┤
│ Services:                                │
│ - nginx (port 8080) — serves frontend    │
│ - backend (port 3000) — Express API      │
│ - mongodb (port 27017) — audit logs      │
│ - redis (port 6379) — BullMQ job queue   │
│ - minio (ports 9000, 9001) — S3 storage  │
└──────────────────────────────────────────┘
         ↓ (for production)
┌──────────────────────────────────────────┐
│  Kubernetes / Docker Swarm               │
├──────────────────────────────────────────┤
│ - Multiple backend replicas              │
│ - Frontend nginx replicas (stateless)    │
│ - MongoDB replica set                    │
│ - MinIO distributed mode                 │
│ - Nginx ingress controller               │
│ - Persistent volumes for data            │
└──────────────────────────────────────────┘
```

---

## Testing Infrastructure (Phase 8 Complete)

### Test Suite Overview
- **Framework:** Jest 29.x (test runner + assertion library)
- **Test Count:** 47 passing (12 unit, 35 integration)
- **Database:** MongoMemoryServer for in-memory MongoDB (no mocking)
- **HTTP Testing:** supertest for API endpoint testing
- **Coverage Threshold:** ≥70% (lines, functions)
- **CI/CD:** GitHub Actions pipeline (auto-run on push/PR)

### Test Structure

**Unit Tests** (12 tests):
```
tests/unit/
├── workflow-engine.test.js (State machine logic, transitions, guards)
```

**Integration Tests** (35 tests):
```
tests/integration/
├── auth-api.test.js (Login, JWT tokens, password reset)
├── workflow-api.test.js (Approve, reject, RBAC enforcement)
├── stats-api.test.js (Dashboard stats, aggregation)
```

**Unit Tests in src/** (validators, services):
```
src/tests/
├── field-validator.test.js (Field validation rules)
├── cross-validator.test.js (Cross-field validation)
├── folder-structure-validator.test.js (Folder layout)
├── pdf-mapping-validator.test.js (PDF → Van_ban mapping)
```

### Test Setup & Helpers

**jest-env-setup.js** — Global test environment:
- Suppresses debug logs during tests (keeps output clean)
- Sets NODE_ENV=test globally
- Initializes test fixtures

**test-setup.js** — Database lifecycle:
```javascript
startDb()       // Starts MongoMemoryServer, connects Mongoose
clearDb()       // Clears all collections after each test
stopDb()        // Stops MongoMemoryServer after all tests
```

**test-auth-helper.js** — JWT generation for tests:
```javascript
makeToken({ role, email })  // Generates valid JWT for mocking authenticated requests
```

### CI/CD Pipeline (.github/workflows/ci.yml)

**Triggers:**
- Push to main or dev branches
- Pull requests to main

**Jobs:**

#### Backend Tests (Node.js 20)
```yaml
- npm ci --prefer-offline          # Install frozen dependencies
- npm run test:unit                # Run unit tests only
- npm run test:integration         # Run integration tests only
- npm run test:coverage            # Check coverage threshold
```

#### Frontend Build (Node.js 20)
```yaml
- npm ci --prefer-offline          # Install frozen dependencies
- npm run build                    # Type-check + bundle (Vite)
```

### Bug Fixes from Testing

**1. approve-routes.js — Per-route RBAC Middleware**
- **Issue:** Global RBAC middleware was blocking all sibling routes at `/:id` prefix
- **Symptom:** Operators couldn't fetch own dossiers (GET /api/dossiers/:id)
- **Fix:** Applied `requireRole()` only to POST /approve and POST /reject routes
- **Impact:** Allows Operators to read without affecting approval-only endpoints

**2. workflow-engine.js — STATE_TO_AUDIT_ACTION Mapping**
- **Issue:** Was logging dossier state names (APPROVED, PACKAGING) as audit actions
- **Symptom:** Audit log had invalid enum values (AUDIT_ACTIONS enum doesn't include state names)
- **Fix:** Created STATE_TO_AUDIT_ACTION mapping: APPROVED → APPROVE action, PACKAGING → PACKAGE action
- **Impact:** Audit logs now have valid, consistent action values

**3. app.js — NODE_ENV Guards**
- **Issue:** Rate limiter and server start() were running during tests, causing slowdown
- **Symptom:** Tests timed out due to rate limiting on concurrent requests
- **Fix:** Wrapped rate limiter initialization and app.listen() in `if (NODE_ENV !== 'test')` guards
- **Impact:** Test suite runs ~4x faster; production unaffected

**4. queue-setup.js — BullMQ Queue Test Stub**
- **Issue:** BullMQ Queue connects to Redis at module load, causing test failures if Redis down
- **Symptom:** Tests couldn't run without live Redis service
- **Fix:** Added test-mode stub in queue-setup.js: checks NODE_ENV, returns mock if 'test'
- **Impact:** Tests now fully isolated; no external service dependencies

### Environment Variables (.env.example)

All required env vars documented:
```
NODE_ENV=development|production|test
PORT=3000
MONGO_URL=mongodb://...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_EXPIRY=8h
ADMIN_EMAIL, ADMIN_PASSWORD
CORS_ORIGIN=...
MINIO_* variables
```

### Coverage Configuration (jest.config.js)

```javascript
collectCoverageFrom: [
  'src/services/**/*.js',
  'src/routes/**/*.js',
  'src/middleware/**/*.js',
  // Excludes (require live external services):
  '!src/services/minio-storage-service.js',
  '!src/jobs/**/*.js',                       // Redis
  '!src/websocket/**/*.js',                  // HTTP server
]
coverageThreshold: { global: { lines: 70, functions: 70 } }
```

### Running Tests Locally

```bash
# All tests (unit + integration)
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode (re-run on file changes)
npm test -- --watch

# Coverage report
npm run test:coverage
```

---

## Security Hardening (Phase 8)

### HTTP Headers (Helmet.js)
```javascript
if (NODE_ENV !== 'test') {
  app.use(helmet());  // Adds security headers (X-Frame-Options, X-XSS-Protection, etc.)
}
```

### Rate Limiting (express-rate-limit)
```javascript
if (NODE_ENV !== 'test') {
  // Login: 5 requests per minute per IP
  // API: 120 requests per minute per IP
}
```

### CORS Whitelisting
- Configured via CORS_ORIGIN env var
- Rejects cross-origin requests from unlisted origins

### Morgan Logging (Security)
```javascript
morgan.skip((req, res) => req.path.startsWith('/ws/'))
// Prevents WebSocket upgrade requests from logging JWT tokens in headers
```

### Input Validation & Sanitization
- Dossier creation: validate folder structure, filenames (no path traversal)
- Excel fields: sanitize HTML/SQL injection via field validators
- User input: trim, validate enum values, reject oversized payloads

---

## Security Model

### Authentication
- JWT signed with private key
- Token includes `sub` (user email), `role`, `iat`, `exp`
- Expiry: 8 hours; refresh token for silent re-auth

### Authorization
- RBAC: Role → Permissions (hardcoded in code, could move to DB)
- Middleware enforces before route handler
- UI hides disallowed actions (not just disabled)

### Data Protection
- PDFs stored in MinIO (not on filesystem)
- SIPs encrypted at rest (MinIO config)
- Presigned URLs with 1-hour expiry
- HTTPS enforced (nginx redirect)
- CORS whitelist (configured in .env)

### Audit
- Every action logged to MongoDB
- Immutable: append-only, no updates/deletes
- Auditors can view all logs (RBAC read-only role)

---

## See Also

- **Requirements:** `/docs/requirements.md` (detailed feature specs)
- **Code Standards:** `/docs/code-standards.md` (implementation patterns)
- **Roadmap:** `/docs/project-roadmap.md` (phases and timeline)
