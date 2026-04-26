# Phase 5: SIP Packaging

## Context
- **Priority:** P1
- **Status:** Pending
- **Effort:** 120h
- **Depends on:** Phase 4 (workflow state machine, APPROVED state)
- **Docs:** `docs/requirements.md` (section 8), `docs/features-vi.md` (feature 18)

## Overview

Implement OAIS-compliant SIP packaging: generate METS.xml (1.12), EAD.xml (EAD3), PREMIS.xml (3), compute SHA-256 checksums, build folder structure, ZIP creation, and async job processing via BullMQ + Redis.

## Key Insights

- Packaging only allowed when: state = APPROVED, zero ERRORs, all PDFs mapped
- Async via BullMQ: `POST /api/package` returns jobId → poll status
- Job timeout: 5 minutes, retry on failure
- Target: <30s for 100-page dossier, <500MB output
- SIP structure: `SIP_[MaHoSo]/METS.xml + metadata/{EAD,PREMIS,checksums.csv} + representations/original/*.pdf`
- SIGNED state skipped in MVP — PACKAGING → DONE directly
- Packaging options: package type (SIP/AIP), checksum algo, software name, submitting org

## Files to Create

```
backend/src/
  services/
    sip-packaging-service.js         # Orchestrate SIP creation
    mets-generator.js                # Generate METS.xml (METS 1.12)
    ead-generator.js                 # Generate EAD.xml (EAD 3)
    premis-generator.js              # Generate PREMIS.xml (PREMIS 3)
    checksum-service.js              # SHA-256 computation
    zip-service.js                   # Create ZIP archive
  jobs/
    packaging-job-processor.js       # BullMQ job handler
    queue-setup.js                   # BullMQ queue + worker config
  routes/
    package-routes.js                # POST /api/package, GET /api/package/:jobId/status
```

## Implementation Steps

1. **BullMQ setup** — Create `queue-setup.js`: initialize BullMQ Queue (`sip-packaging`) and Worker connected to Redis. Configure: concurrency 2, job timeout 5min, retry 2 attempts. Export queue for route use.

2. **Package route** — `POST /api/package { dossierId, options? }` — requires Approver/Admin. Validates: dossier state = APPROVED, no ERRORs. Adds job to BullMQ queue. Returns `{ jobId }`. `GET /api/package/:jobId/status` returns job state (QUEUED/PROCESSING/DONE/FAILED) + progress.

3. **METS.xml generator** — Build METS 1.12 XML:
   - `<metsHdr>`: createDate, AGENT (submitting org, software)
   - `<dmdSec>`: reference to EAD.xml
   - `<amdSec>`: reference to PREMIS.xml
   - `<fileSec>`: list all PDF files with CHECKSUM, SIZE, MIMETYPE
   - `<structMap>`: physical structure (representations/original/*)
   Use `xmlbuilder2` library. Validate output is well-formed.

4. **EAD.xml generator** — Build EAD 3 XML:
   - `<control>`: record ID = MaHoSo
   - `<archdesc>`: level=file, title = TieuDe, dates, language
   - `<dsc>`: component list mapping each Van_ban row
   - Each `<c>`: title, date, creator (coQuan), scope note (trichYeu), keywords
   Map Ho_so + Van_ban fields to EAD elements.

5. **PREMIS.xml generator** — Build PREMIS 3 XML:
   - `<object>`: one per PDF file — identifier, format (PDF), size, checksum
   - `<event>`: creation event (packaging timestamp)
   - `<agent>`: software agent (app name + version)
   - `<rights>`: access restrictions from cheDoSuDung

6. **Checksum service** — Compute SHA-256 for all files in SIP. Return map `{ filename: hash }`. Write `checksums.csv` (filename, algorithm, hash).

7. **ZIP service** — Use `archiver` library. Create `SIP_[MaHoSo]_[YYYYMMDD].zip` with folder structure:
   ```
   SIP_[MaHoSo]/
   ├── METS.xml
   ├── metadata/
   │   ├── EAD.xml
   │   ├── PREMIS.xml
   │   └── checksums.csv
   └── representations/original/
       └── *.pdf
   ```
   Stream to temp file. Verify ZIP integrity.

8. **SIP packaging orchestrator** — `sip-packaging-service.js` orchestrates:
   a. Load dossier + Excel data from MongoDB
   b. Copy PDFs from temp to working dir
   c. Generate METS.xml, EAD.xml, PREMIS.xml
   d. Compute checksums for all files
   e. Build ZIP
   f. Upload ZIP to MinIO `sip-files/YYYY/` bucket (MinIO integration deferred to Phase 6 — save to temp for now)
   g. Update dossier state: PACKAGING → DONE
   h. Log audit entry

9. **Job processor** — BullMQ worker calls `sip-packaging-service.create(dossierId, options)`. Reports progress (0-100%). On failure: log error, mark job FAILED, keep dossier at APPROVED for retry.

10. **Packaging options** — Support configurable options per `features-vi.md` section 18: package type (SIP default), checksum algo (SHA-256 default), software name, submitting org. Store defaults in config collection.

## Todo

- [x] BullMQ queue + worker setup
- [x] Package routes (POST /api/package, GET status)
- [x] METS.xml generator (METS 1.12)
- [x] EAD.xml generator (EAD 3)
- [x] PREMIS.xml generator (PREMIS 3)
- [x] SHA-256 checksum service
- [x] ZIP creation service
- [x] SIP packaging orchestrator
- [x] Job processor with progress reporting
- [x] Packaging options support
- [x] Dossier state transition (APPROVED → PACKAGING → DONE)
- [x] Audit log on packaging start/complete/fail

## Success Criteria

1. `POST /api/package` returns jobId, job completes within 30s for 100 pages
2. Generated METS.xml is well-formed XML, references all files
3. Generated EAD.xml maps Ho_so + Van_ban data correctly
4. Generated PREMIS.xml includes file format info + preservation events
5. Checksums verified by re-computing after ZIP creation
6. ZIP structure matches spec exactly
7. Cannot package if dossier has ERRORs or state != APPROVED
8. Failed jobs can be retried
9. Dossier transitions to DONE after successful packaging

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| XML not conformant to METS/EAD/PREMIS specs | Validate against official XSD schemas |
| Large ZIP files (500MB+) | Stream ZIP creation, check size, warn if over 500MB |
| Redis connection lost mid-job | BullMQ built-in retry; job marked FAILED, retryable |
| Concurrent packaging of same dossier | Check state atomically before job creation |

## Failure Modes

- **Job timeout** → mark FAILED, revert state to APPROVED, allow retry
- **Missing PDF at packaging time** → should not happen (validated), but check and fail gracefully
- **Disk space** → write to temp, clean up after upload to MinIO
