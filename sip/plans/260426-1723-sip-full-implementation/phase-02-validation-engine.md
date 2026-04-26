# Phase 2: Validation Engine

## Context
- **Priority:** P1
- **Status:** Complete (2026-04-26)
- **Effort:** 120h
- **Depends on:** Phase 1 (Express skeleton, MongoDB, auth middleware)
- **Docs:** `docs/requirements.md` (sections 3-6), `docs/features-vi.md` (features 1-4)

## Overview

Implement folder structure validation, SheetJS Excel parsing, TT05 field-level validation (18 Ho_so + 21 Van_ban fields), cross-validation, PDF mapping check, and auto-fix suggestion engine.

## Key Insights

- Enum validation = EXACT string match (e.g., `"01: Nghị quyết"` not `"01"`)
- Cross-validation: document count, MaLuuTru prefix, duplicate check, PDF existence
- Auto-fix only SUGGESTS — never auto-saves. Fuzzy matching finds suggestions, applied value must be exact enum
- PDF mapping: field 21 of Van_ban → comma-separated filenames → check in Attachment/
- Fallback: if field 21 empty, check `{MaLuuTru}.pdf`
- Sample Excel available at `tmp/H49.61.8.2017.01.xlsx`

## Files to Create

```
backend/src/
  services/
    folder-structure-validator.js    # Validate Attachment/ + Metadata/ layout
    excel-parser-service.js          # SheetJS parse Ho_so + Van_ban sheets
    field-validator-service.js       # Per-field validation (required, enum, date, int)
    cross-validator-service.js       # Cross-sheet checks
    pdf-mapping-validator.js         # PDF-Excel file mapping
    auto-fix-service.js              # Suggest fixes (date, trim, fuzzy enum)
    validation-orchestrator.js       # Orchestrate all validators, aggregate errors
  validators/
    ho-so-schema.js                  # 18 field definitions + rules
    van-ban-schema.js                # 21 field definitions + rules
    enum-definitions.js              # All TT05 enum values (exact strings)
  routes/
    upload-routes.js                 # POST /api/upload (multer)
    validate-routes.js               # POST /api/validate, POST /api/validate-inline
    save-routes.js                   # POST /api/save
  models/
    dossier-model.js                 # Dossier state, metadata, Excel data, version history
  tests/
    field-validator.test.js
    cross-validator.test.js
    pdf-mapping-validator.test.js
    folder-structure-validator.test.js
```

## Implementation Steps

1. **Enum definitions** — Create `enum-definitions.js` with all TT05 enums: thoiHanBaoQuan (6 values), cheDoSuDung (3), ngonNgu (11), tinhTrangVatLy (3), mucDoTinCay (3), cheoDuPhong (2), tinhTrangDuPhong (2), tenLoaiTaiLieu (32). Use frozen objects.

2. **Ho_so schema** — Define 18 fields with: name, vietnameseName, required, type (string/date/int/enum), enumValues, regex, severity. Conditional: field 17 required when field 16 = `"1: Có"`.

3. **Van_ban schema** — Define 21 fields similarly. Field 2 regex: `{MaHoSo}.\d{7}`. Field 21 optional, comma-separated PDF filenames.

4. **Folder structure validator** — Input: file list from upload. Check: `Attachment/` exists with ≥1 PDF, `Metadata/` exists with exactly 1 `.xlsx`. Return errors or pass.

5. **Excel parser** — Use SheetJS (`xlsx`). Read workbook, extract `Ho_so` and `Van_ban` sheets. Parse rows to JSON objects (column header → field name mapping). Handle: missing sheets, empty rows, date serial numbers.

6. **Field validator** — For each field definition: validateRequired, validateEnum (exact match), validateDate (DD/MM/YYYY parse), validatePositiveInt, validateRegex. Return `{ valid, code, message, field, row, severity }`.

7. **Cross-validator** — 4 checks: (a) Ho_so.TongSoTaiLieu == Van_ban row count, (b) each Van_ban.MaLuuTru starts with Ho_so.MaHoSo, (c) no duplicate MaLuuTru, (d) PDF mapping (see next).

8. **PDF mapping validator** — For each Van_ban row: check field 21 (comma-split, exact match in Attachment/). If empty, fallback `{MaLuuTru}.pdf`. Report: missing PDF = ERROR, extra PDF = WARNING.

9. **Auto-fix service** — Scan all errors, generate suggestions: date reformat (`1-2-2024` → `01/02/2024`, Excel serial → date), trim whitespace, fuzzy enum match (Levenshtein or keyword), extract int from string. Return `{ row, field, current, suggested, confidence }`.

10. **Validation orchestrator** — Chain: folder → parse → field validate → cross validate → PDF mapping → auto-fix scan. Return combined result with errors + suggestions.

11. **Upload route** — `POST /api/upload` with multer. Accept folder (webkitdirectory) or ZIP. Extract to temp dir. Run folder structure validation. Parse Excel. Store dossier in MongoDB (state: UPLOAD). Return parsed data + initial validation.

12. **Validate routes** — `POST /api/validate`: run full validation on dossier. `POST /api/validate-inline`: validate single field value (for real-time editing).

13. **Save route** — `POST /api/save`: apply user-accepted fixes, save new Excel version, re-validate, update dossier.

14. **Dossier model** — Schema: maHoSo, state, uploadedBy, excelData (Ho_so + Van_ban), validationResult, versions[], pdfFiles[], tempPath, createdAt, updatedAt.

15. **Unit tests** — Test each validator with valid/invalid data. Test enum exact match. Test cross-validation edge cases. Test date parsing (serial numbers, various formats).

## Todo

- [x] Enum definitions (all TT05 values)
- [x] Ho_so schema (18 fields)
- [x] Van_ban schema (21 fields)
- [x] Folder structure validator
- [x] Excel parser (SheetJS)
- [x] Field validator (required, enum, date, int, regex)
- [x] Cross-validator (4 checks)
- [x] PDF mapping validator
- [x] Auto-fix suggestion service
- [x] Validation orchestrator
- [x] Upload route (multer + folder/ZIP)
- [x] Validate routes (/validate, /validate-inline)
- [x] Save route with versioning
- [x] Dossier model
- [x] Unit tests (>80% coverage for validators)

## Success Criteria

1. Rejects malformed folder structure with clear error message
2. Parses sample Excel (`tmp/H49.61.8.2017.01.xlsx`) correctly — both sheets
3. Validates all 18 Ho_so fields per TT05 rules
4. Validates all 21 Van_ban fields per TT05 rules
5. Detects cross-sheet errors (count mismatch, prefix mismatch, duplicates)
6. Reports missing PDFs as ERROR, extra PDFs as WARNING
7. Auto-fix suggests date reformats and whitespace trims
8. `POST /api/validate` returns structured error response
9. >80% unit test coverage on validators

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Excel column headers vary | Map by position (index) not header text |
| Date serial numbers from Excel | SheetJS `cellDates:true` option + fallback manual conversion |
| Large Excel files (1000+ rows) | Stream processing, chunked validation |
| Vietnamese diacritics in enum | Exact byte comparison, no normalization |
