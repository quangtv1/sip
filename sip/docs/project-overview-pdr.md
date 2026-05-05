# Project Overview & Product Development Requirements

**Project:** SIP (Submission Information Package) System  
**Status:** MVP Implementation Phase (Phases 1-5, 8 Complete)  
**Version:** 1.0 (MVP Ready for UAT)  
**Last Updated:** 2026-05-05

---

## Executive Summary

A web application that helps Vietnamese archival staff validate and package digital records according to **Thông tư 05/TT-BNV** (national archival standard). Users upload a dossier (hồ sơ) containing Excel metadata + PDF documents, the system validates against TT05 rules, shows errors visually, allows corrections, then auto-packages into a standards-compliant SIP (Submission Information Package) following OAIS principles.

**Core Mission:** Eliminate manual metadata validation errors, ensure 100% TT05 compliance, reduce packaging time from 2 hours to <10 minutes per dossier.

---

## Objectives

| Objective | Success Metric |
|-----------|---|
| Reduce validation errors | 95% first-pass validation success rate |
| Speed up packaging | <10 minutes per dossier (vs. 2 hours manual) |
| Ensure TT05 compliance | 0% rule violations in produced SIPs |
| Improve auditability | 100% action traceability via immutable logs |
| Lower training burden | Operators need <30 min orientation |

---

## Core Features (10-Item Backlog)

### Phase 1: Foundation (Sprint 1-2)
1. **Upload & Validation** — Drag-drop dossier, auto-validate fields, display errors grouped by severity (ERROR/WARNING)
2. **Excel Data Grid** — Render both sheets (Ho_so + Van_ban) in editable HTML table with inline error highlighting and cell-level validation

### Phase 2: Intelligence (Sprint 3-4)
3. **Auto-fix Engine** — Detect common issues (bad date format, whitespace, enum fuzzy match) and suggest fixes with before/after diff
4. **PDF-Excel Mapping** — Verify all referenced PDFs exist and match Van_ban entries, flag missing/extra files
5. **Error Panel & Navigation** — Centralized error list with drill-down to highlight row/cell, filter by severity

### Phase 3: Workflow & Approval (Sprint 5-6)
6. **Approval Workflow** — Multi-state machine (UPLOAD → VALIDATING → VALIDATED → APPROVED → PACKAGING → SIGNED → DONE) with role-based transitions
7. **RBAC (5 Roles)** — Admin, Operator, Approver, Signer, Auditor with granular permission matrix

### Phase 4: Packaging & Delivery (Sprint 7-8)
8. **SIP Packaging** — Auto-generate METS.xml + EAD.xml + PREMIS.xml, compute SHA-256 checksums, bundle with PDFs into zip
9. **Digital Signature** — XMLDSig + TSA timestamp on all metadata XML files, verify signature integrity

### Phase 10: Observability (Sprint 9-10)
10. **Dashboard & Audit Logs** — Real-time stats (total dossiers, error trends, success rate), append-only MongoDB logs, drill-down to errors per record
                            ↓
                        REJECTED (return to upload, fix, retry)
```

### Audit Log & Dashboard
- Immutable append-only audit log (MongoDB)
- Dashboard: total dossiers, error counts, success rate, error trends
- Drill-down: view errors + original Excel with highlights

### RBAC (Role-Based Access Control)
| Role | Upload | Validate | Edit Data | Approve | Sign | View Logs |
|------|--------|----------|-----------|---------|------|-----------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Operator | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approver | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Signer | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Auditor | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### Storage Abstraction
- MinIO object storage (S3-compatible) for PDFs + SIP packages
- Admin-configurable endpoints, buckets, credentials
- Presigned URLs for downloads (1-hour expiry)
- Auto-retry on network failures (3 attempts)

---

## 3. Product Development Requirements (PDR)

### 3.1 Functional Requirements

#### FR-1: File Structure Validation
- **Requirement:** System validates input dossier against strict structure
- **Input:** ZIP or folder upload containing `[TenHoSo]/Attachment/` + `[TenHoSo]/Metadata/[TenHoSo].xlsx`
- **Output:** Pass (proceed) or FAIL (block, show error)
- **Acceptance Criteria:**
  - Missing Attachment/ → ERROR
  - Missing Metadata/ → ERROR
  - Multiple or zero Excel files → ERROR
  - Malformed structure → ERROR
  - Valid structure → allow proceed to validation

#### FR-2: Excel Parsing & Schema Validation
- **Requirement:** Read Excel and validate all fields per TT05 standard
- **Input:** Excel file with `Ho_so` + `Van_ban` sheets
- **Output:** Field-level errors with row, column, message, severity
- **Acceptance Criteria:**
  - Parse sheets without hanging
  - Validate required fields (Ho_so: Mã hồ sơ, Tiêu đề, Thời hạn, Chế độ, Ngày bắt đầu, Ngày kết thúc, Tổng số, Mức độ tin cậy)
  - Validate enum values (exact string match per TT05, no fuzzy matching)
  - Validate date format (DD/MM/YYYY)
  - Validate positive integers (page count, document count)
  - Validate cross-sheet constraints (Van_ban code starts with Ho_so code, document count = Van_ban rows, no duplicates)
  - Return all errors in single response, not fail on first error

#### FR-3: Interactive Error Review & Fixing
- **Requirement:** Display validation errors with suggestions, allow user to review/apply fixes before packaging
- **Input:** Validation error list
- **Output:** Updated Excel data + audit log entry
- **Acceptance Criteria:**
  - Show errors in sortable/filterable table (ERROR vs WARNING)
  - Click error → highlight cell in Excel grid
  - Show suggestion for fixable errors (e.g., date format, fuzzy enum)
  - User can apply all or specific suggestions
  - After applying → re-validate, show updated state
  - No auto-save without user consent

#### FR-4: SIP Packaging
- **Requirement:** Generate OAIS-compliant SIP from validated dossier
- **Input:** Validated Excel, PDF files, checksums
- **Output:** Folder `SIP_[MaHoSo]/` containing METS, EAD, PREMIS, checksums.csv, representations/original/*.pdf
- **Acceptance Criteria:**
  - METS.xml well-formed, references all files
  - EAD.xml well-formed, describes dossier + documents per Ho_so/Van_ban data
  - PREMIS.xml includes preservation info (format, hardware, software)
  - SHA256 checksums for all files
  - ZIP archive size < 500MB
  - No errors during packaging

#### FR-5: Digital Signature
- **Requirement:** Sign XML files with XMLDSig + TSA, verify on load
- **Input:** XML files, private key, TSA endpoint
- **Output:** Signed XML with embedded signature + timestamp
- **Acceptance Criteria:**
  - Sign METS, EAD, PREMIS independently
  - Signature includes TSA timestamp
  - Verify returns valid/invalid with reason
  - No re-signing after SIGNED state

#### FR-6: Audit Log
- **Requirement:** Immutable log of all actions for compliance/traceability
- **Input:** Action (UPLOAD/VALIDATE/APPROVE/PACKAGE/SIGN), user, dossier, error count, details
- **Output:** Append-only MongoDB collection
- **Acceptance Criteria:**
  - All state transitions logged
  - User, timestamp, action, dossier code, error count recorded
  - No update/delete, only append
  - Log visible in Auditor dashboard

#### FR-7: RBAC
- **Requirement:** Enforce role-based permissions on all API endpoints
- **Input:** JWT token (decoded user + role)
- **Output:** Allow or deny action
- **Acceptance Criteria:**
  - Operator cannot approve or sign
  - Approver cannot upload or edit data
  - Signer sees only APPROVED dossiers, can only sign
  - Admin sees all features
  - Auditor sees only logs + dashboard (read-only)
  - UI hides disallowed actions (not just disabled)

---

### 3.2 Non-Functional Requirements

#### NFR-1: Performance
- File upload: handle 50MB files within 5 seconds
- Validation: validate 1000-row Excel within 2 seconds
- Dashboard load: < 1 second with cached data
- SIP packaging: < 30 seconds for typical 100-page dossier

#### NFR-2: Reliability
- Storage retry: auto-retry 3× on network failure
- Zero data loss: all uploaded files stored before proceeding
- Graceful degradation: if MinIO down, queue and retry

#### NFR-3: Security
- No file storage on server filesystem
- Presigned URLs for file access (1-hour expiry)
- JWT tokens with 8-hour expiry
- Hash passwords with bcrypt
- CORS configured to allow only trusted origins
- No sensitive data in logs (mask credentials, PII)

#### NFR-4: Compliance
- Strict TT05 enum validation (no shortcuts or fuzzy matching)
- No packaging if ERROR-level issues remain
- Immutable audit trail
- Archival metadata per METS/EAD/PREMIS standards
- Digital signature per XMLDSig spec

#### NFR-5: Maintainability
- Stateless API (no session affinity needed)
- Modular codebase: Validation ↔ Packaging ↔ Workflow independent
- Config from environment (no hardcoded values)
- Code standards: documented in code-standards.md

---

### 3.3 Acceptance Criteria

**Release Definition:** MVP complete when:

1. ✅ File structure validation working (rejects bad layouts)
2. ✅ Excel parsing + TT05 validation complete (all field rules + cross-checks)
3. ✅ Error display with suggestions operational
4. ✅ User can approve/reject, fixes are applied
5. ✅ SIP packaging generates valid METS/EAD/PREMIS
6. ✅ Signatures applied correctly + verification working
7. ✅ Audit log immutable and complete
8. ✅ RBAC enforced on all endpoints
9. ✅ MinIO storage integrated, presigned URLs working
10. ✅ Dashboard showing real data (not mocks)
11. ✅ All tests passing (unit + integration)
12. ✅ Docs complete (README, API, deployment)

---

## 4. Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React + Ant Design + Chart.js |
| Backend | Node.js + Express |
| Database | MongoDB (audit log, config, metadata versions) |
| File Storage | MinIO (S3-compatible) |
| Containerization | Docker + Docker Compose |
| Reverse Proxy | Nginx (port 8080) |
| Excel Parsing | SheetJS (xlsx) |
| Validation | AJV (JSON Schema) |
| Signing | node-xmldsig or similar |
| JWT | jsonwebtoken |
| File Upload | multer |

---

## 5. Development Timeline

### Completed Phases (as of 2026-05-05)

**Phase 1: Setup & Core Infrastructure (Week 1-2)** ✓
- Docker Compose with backend + nginx + MongoDB + MinIO
- Backend skeleton: Express app with CORS, routes structure
- JWT auth + RBAC middleware (5 roles: Admin, Operator, Approver, Signer, Auditor)
- MongoDB audit log collection

**Phase 2: File Validation (Week 2-3)** ✓
- File structure validator (Attachment/ + Metadata/)
- Excel parser (SheetJS)
- Field-level validation engine (11 types: string, date, positiveInt, enum, float, boolean, regex, email, url, range, dependent-enum)
- Cross-validation (document count, code prefixes, PDF mapping)

**Phase 3: Frontend UI (Week 4-5)** ✓
- File upload UI (drag & drop, folder picker)
- Excel grid renderer (editable, error highlighting, virtual scrolling)
- Error panel with filtering + drill-down
- Suggest fixes UI (show before/after, apply all/selective)
- LoginPage + auth context + JWT interceptor

**Phase 4: Workflow & Approval (Week 5-6)** ✓
- Workflow state machine (UPLOAD → VALIDATING → VALIDATED → APPROVED → PACKAGING → DONE + REJECTED)
- Approval UI (Approver role can approve/reject)
- SIP packaging engine (METS/EAD/PREMIS generation via BullMQ async queue)
- Audit log integration + dossier queue view
- Notifications stub (ready for email/SMS integration)

**Phase 5: SIP Packaging (Week 7-8)** ✓
- METS.xml generation (METS 1.12)
- EAD.xml generation (EAD 3)
- PREMIS.xml generation (PREMIS 3)
- SHA-256 checksum computation
- ZIP packaging with proper structure
- MinIO bucket integration (pdf-files/ + sip-files/)
- Presigned URL generation (1-hour expiry)

**Phase 8: Configuration Management & Testing (Week 10-12)** ✓
- SystemConfigPage with 4 admin tabs (MinIO, enums, profiles, schema)
- Profile CRUD system (create/read/update/delete validation profiles, TT05 default)
- Dynamic enum/schema management (no restart required)
- Extended field types (float, boolean, regex, email, url, range, dependent-enum)
- Jest test suite (47 passing tests: unit + integration)
- GitHub Actions CI pipeline
- Security hardening (Helmet, CORS, rate limiting, Winston logging)

### Deferred Phases

**Phase 6: Digital Signature & Storage (Deferred to Phase 6 task)**
- XMLDSig signature implementation (pending TSA service contract)
- TSA timestamp integration
- Signed SIP upload to MinIO
- **Current Status:** WebSocket notifications ✓, MinIO presigned URLs ✓, signing stub only

**Phase 7: Dashboard & Advanced Features (Deferred to Phase 7 task)**
- Dashboard charts (Chart.js integration)
- SIP Viewer (unzip, show tree, preview XML)
- Audit log viewer UI
- **Current Status:** Stats API ✓, SystemConfigPage provides admin UI, full dashboard deferred

---

## 6. Success Metrics

- **Validation Accuracy:** 100% compliance with TT05 (no false positives/negatives)
- **User Productivity:** Average time from upload to SIGNED state < 10 minutes
- **Error Detection Rate:** Catch 100% of structural errors, 95%+ of data errors pre-packaging
- **Uptime:** 99.5% (excludes planned maintenance)
- **Audit Trail Completeness:** 100% of actions logged + traceable

---

## 7. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| TT05 spec ambiguity | Validation incorrect | Work with archivists to clarify, document decisions |
| Large file handling (500MB+) | Upload timeout | Stream processing, chunked upload, async processing |
| MongoDB outage | Audit log unavailable | Backup strategy, alerting, failover planning |
| MinIO misconfiguration | Files not stored | Automated health checks, test suite |

---

## 8. See Also

- **Requirements Document:** `/docs/requirements.md` (detailed specs, API endpoints, data structures)
- **Code Standards:** `/docs/code-standards.md` (naming, patterns, testing)
- **System Architecture:** `/docs/system-architecture.md` (diagrams, component interaction)
- **Codebase Summary:** `/docs/codebase-summary.md` (what's implemented, what's planned)
