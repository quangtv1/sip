# Plan: Refactor Codebase Safely

**Generated**: 2026-05-02  
**Estimated Complexity**: High  
**Scope**: SIP product code in `backend/`, `frontend/`, `docs/`, `plans/`. Excludes `claudekit-engineer/` and unrelated untracked parent-directory files.

## Overview

The current codebase is not too large, but it has a high-risk architectural split: the product now exposes dynamic validation profiles, custom sheets, custom enums, and per-standard enum overrides, while the main upload/save/validation/editing workflow still assumes the original TT05 two-sheet model: `Ho_so` + `Van_ban`.

The safest refactor is not a rewrite. The recommended path is:

1. Stabilize the current behavior with tests and immediate bug fixes.
2. Introduce explicit domain contracts for profile, schema, enum, and dossier sheet data.
3. Move route-level persistence and cache logic into services.
4. Convert backend validation and frontend grid rendering to use schema-driven adapters while preserving legacy `hoSoRow` and `vanBanRows`.
5. Split oversized frontend pages after contracts are stable.

## Current Findings

### Evidence Gathered

- Main source size: about 14.7k lines across `backend/src` and `frontend/src`.
- Largest hot files:
  - `frontend/src/pages/DossierPage.jsx` ~502 lines
  - `backend/src/routes/config-routes.js` ~488 lines
  - `frontend/src/components/excel/ExcelGrid.jsx` ~366 lines
  - `backend/src/services/field-validator-service.js` ~313 lines
  - several `frontend/src/pages/system-config/*` files around 200-280 lines
- Worktree is already dirty with unrelated edits/untracked files, so refactor should be isolated in small commits.
- Backend `npm test -- --runInBand` failed in this sandbox: 4/4 suites failed, 47/47 tests failed, runtime ~669s. Root cause is `MongoMemoryServer.create()` trying to bind `0.0.0.0` and getting `listen EPERM`; Mongoose cleanup operations then time out.
- Frontend `npm test` failed after ~240s before running tests: Vitest fork workers timed out for all 4 test files. Treat test baseline as not currently reliable.

### High-Risk Problems

1. Active profile UI likely broken:
   - Backend returns `{ profileId, ...profile }` and exposes `PUT /api/config/active-profile`.
   - Frontend reads `aRes.data.data?.id` and calls `POST /config/active-profile`.
   - Files: `backend/src/routes/config-routes.js`, `frontend/src/pages/system-config/standards-hub-tab.jsx`.

2. Save path ignores dynamic profile:
   - `save-routes.js` sanitizes with hardcoded `HO_SO_SCHEMA` and `VAN_BAN_SCHEMA`.
   - `reValidate()` is called without `dossier.profileId`, so non-TT05 dossiers can be revalidated as TT05 after save.
   - File: `backend/src/routes/save-routes.js`.

3. Inline validation partly ignores profile context:
   - `validateInline()` resolves schema by profile, but calls `validateField()` without passing `profileId`, affecting dependent enum resolution.
   - File: `backend/src/services/validation-orchestrator.js`.

4. Custom enum support conflicts with schema validation:
   - Config routes support custom enum metadata.
   - `validateSchemaPayload()` only accepts enum keys in hardcoded `ENUM_NAMES`, so custom enum-backed schema fields are rejected.
   - File: `backend/src/utils/schema-payload-validator.js`.

5. Dynamic sheets are configured but not truly processed:
   - Profile UI supports arbitrary `sheets`.
   - Excel parser only uses `profile.sheets[0]` and `[1]`.
   - Validation/data model remain `hoSoRow` + `vanBanRows`.
   - Frontend `ExcelGrid` hardcodes `HO_SO_FIELDS` and `VAN_BAN_FIELDS`.

6. `config-routes.js` owns too much:
   - Auth, validation, persistence key formats, cache invalidation, schema migration compatibility, MinIO tests, profile CRUD, enum CRUD, and per-standard overrides are all in one route module.

7. Frontend composition is too coupled:
   - `DossierPage.jsx` contains upload workspace, queue tab, archive tab, workflow actions, edit state, PDF viewer state, filters, and localStorage column config.
   - Queue/archive concerns are duplicated or redirected from app routes.

## Brainstorm Result

### Position A: Minimal Stabilization

Fix only the profile/save/schema bugs, add tests, avoid changing the data model.

Benefits:
- Lowest implementation risk.
- Fastest path to restore current feature correctness.
- Good first production patch.

Weakness:
- Leaves the same two-sheet assumptions in place.
- Future profile/sheet changes will keep creating hidden regressions.

### Position B: Contract-First Refactor

Introduce explicit contracts and adapters:

- Profile service owns profile/sheet semantics.
- Schema service owns schema resolution and enum validation.
- Dossier data has a canonical sheet representation, with legacy adapters for `hoSoRow` and `vanBanRows`.
- Frontend grids receive field schema props instead of hardcoded field arrays.

Benefits:
- Solves the root mismatch without a risky rewrite.
- Preserves current TT05 flows during migration.
- Enables parallel backend/frontend work once contracts are defined.

Weakness:
- Requires careful compatibility tests.
- Needs phased rollout and dual-read/dual-write period.

### Position C: Full Generic N-Sheet Rewrite

Replace the existing validation, save, UI, and packaging flow with a fully generic sheet engine.

Benefits:
- Clean long-term model.
- Removes most TT05-specific branching.

Weakness:
- High blast radius.
- Packaging, cross-validation, PDF mapping, and UI workflows still contain domain-specific concepts, so "fully generic" is partly fictional.
- Too risky before test baseline is trustworthy.

### Nash Equilibrium

Choose Position B, but start with Position A as Sprint 1.

No side can improve materially by switching alone:
- Pure hotfix is too short-lived.
- Full rewrite is too risky without test baseline.
- Contract-first with initial hotfix gives production safety first, then pays down the core architecture mismatch incrementally.

## Recommended Direction

Use a compatibility-first refactor:

- Keep current public API response fields `hoSoRow`, `vanBanRows`, `validation`, `profileId`.
- Add a canonical internal shape such as:

```js
{
  profileId,
  sheets: [
    { name: 'Ho_so', role: 'primary', rows: [/* one row */] },
    { name: 'Van_ban', role: 'documents', rows: [/* many rows */] }
  ]
}
```

- For one release, write both canonical `sheets` and legacy `hoSoRow`/`vanBanRows`.
- Keep TT05 cross-validation and SIP packaging on legacy adapters until generic sheet parsing is stable.
- Make arbitrary extra sheets visible and persisted first; only add cross-sheet domain rules for them when requirements are explicit.

## Prerequisites

- Agree that TT05 two-sheet behavior remains the production compatibility target during refactor.
- Decide whether arbitrary extra sheets are only metadata storage/display for now, or must participate in validation/package output.
- Use a branch and small commits because the worktree currently contains unrelated dirty changes.

## Sprint 0: Test Baseline And Guardrails

**Goal**: Make the current behavior measurable before changing architecture.

**Demo/Validation**:
- Backend unit tests run without MongoDB.
- Backend integration tests either run in CI/Docker or fail fast with a clear environment message.
- Frontend tests complete in a bounded time.

### Task 0.1: Add Refactor ADR

- **Location**: `docs/adr/refactor-profile-schema-contract.md`
- **Description**: Document the chosen compatibility-first strategy and non-goals.
- **Dependencies**: None
- **Acceptance Criteria**:
  - ADR states legacy fields are preserved during rollout.
  - ADR states arbitrary N-sheet validation is not implemented in one step.
- **Validation**: Review doc only.

### Task 0.2: Fix Backend Test Harness For Sandbox/CI

- **Location**: `backend/tests/helpers/test-setup.js`, `backend/jest.config.js`
- **Description**: Configure MongoMemoryServer to bind localhost where supported, reduce Mongoose buffering timeout, and fail fast when DB cannot start.
- **Dependencies**: None
- **Acceptance Criteria**:
  - Integration test setup no longer waits minutes after MongoMemoryServer bind failure.
  - Failure message tells developer to run tests in Docker/CI if local binding is blocked.
- **Validation**:
  - `cd backend && npm run test:unit -- --runInBand`
  - `cd backend && npm run test:integration -- --runInBand`

### Task 0.3: Separate Pure Unit Tests From DB Tests

- **Location**: `backend/package.json`, `backend/jest.config.js`
- **Description**: Ensure tests that do not require MongoDB can run independently from integration tests.
- **Dependencies**: Task 0.2
- **Acceptance Criteria**:
  - Unit tests do not initialize MongoMemoryServer.
  - Integration tests are explicitly named and isolated.
- **Validation**: `npm run test:unit`.

### Task 0.4: Add Characterization Tests For Existing Contracts

- **Location**: `backend/tests/integration/config-api.test.js`, `backend/tests/integration/validation-profile-api.test.js`
- **Description**: Lock down current API shapes for active profile, profile CRUD, schema CRUD, enum CRUD, save/revalidate.
- **Dependencies**: Task 0.2
- **Acceptance Criteria**:
  - Tests prove active profile response uses `profileId`.
  - Tests prove save uses dossier's stored profile.
  - Tests cover custom enum schema field.
- **Validation**: `npm run test:integration -- config-api validation-profile-api`.

### Task 0.5: Stabilize Frontend Test Runner

- **Location**: `frontend/src/__tests__/setup.js`, targeted component tests
- **Description**: Bound test runtime, clean up timers, and fix stale assertions that no longer match component callbacks.
- **Dependencies**: None
- **Acceptance Criteria**:
  - `cd frontend && npm test -- --runInBand` or equivalent completes.
  - `ExcelGrid` edit callback expectation matches actual contract or the component contract is fixed.
- **Validation**: `npm test`.

## Sprint 1: Immediate Production Hotfixes

**Goal**: Fix correctness issues without structural churn.

**Demo/Validation**:
- Admin can set active standard from UI.
- Saving a non-TT05 dossier keeps its profile-specific schema.
- Custom enum schema fields can be saved.

### Task 1.1: Fix Active Profile Frontend Contract

- **Location**: `frontend/src/pages/system-config/standards-hub-tab.jsx`
- **Description**: Read `active-profile.data.profileId` and call `PUT /config/active-profile`.
- **Dependencies**: Task 0.4 recommended
- **Acceptance Criteria**:
  - Active standard badge renders after load.
  - "Dùng tiêu chuẩn này" succeeds and updates active state.
- **Validation**:
  - Component test with mocked `apiClient`.
  - Manual admin flow in UI.

### Task 1.2: Use Dynamic Schema For Save Sanitization

- **Location**: `backend/src/routes/save-routes.js`, new helper/service if needed
- **Description**: Load dossier first, resolve `dossier.profileId`, then sanitize fields from resolved profile schemas instead of hardcoded TT05 schemas.
- **Dependencies**: Task 0.4 recommended
- **Acceptance Criteria**:
  - Unknown fields are stripped.
  - Fields defined in a custom profile are preserved.
  - Revalidation receives `profileId: dossier.profileId || 'TT05'`.
- **Validation**: Integration test with custom profile and custom field.

### Task 1.3: Pass ProfileId Through Inline Validation

- **Location**: `backend/src/services/validation-orchestrator.js`
- **Description**: Pass `pid` into `validateField()` so dependent enum lookups use the same profile context.
- **Dependencies**: None
- **Acceptance Criteria**:
  - Inline dependent-enum validation uses per-standard enum override.
- **Validation**: Unit test for `validateInline()`.

### Task 1.4: Allow Custom Enum Keys In Schema Payloads

- **Location**: `backend/src/utils/schema-payload-validator.js`, `backend/src/routes/config-routes.js`
- **Description**: Make enum-key validation accept a provided set of valid enum names from global/custom/per-profile enum metadata.
- **Dependencies**: Task 0.4
- **Acceptance Criteria**:
  - Built-in enum keys still pass.
  - Custom enum keys pass after creation.
  - Unknown enum keys fail.
- **Validation**: Integration tests for enum create + schema save.

## Sprint 2: Extract Config Domain Services

**Goal**: Make config behavior testable without going through a 488-line route module.

**Demo/Validation**:
- `config-routes.js` becomes mostly HTTP mapping.
- Profile/schema/enum behavior is tested at service level.

### Task 2.1: Add Config Key Builder

- **Location**: `backend/src/services/config-key-service.js`
- **Description**: Centralize AppConfig keys: `profile:{id}`, `schema:{profileId}:{sheet}`, `enum:{name}`, `enum:{profileId}:{name}`, `enum-meta:{name}`, `active_profile`.
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - No route constructs these key strings manually after migration.
- **Validation**: Unit tests for all key builders.

### Task 2.2: Extract Profile Service

- **Location**: `backend/src/services/profile-service.js`, `backend/src/routes/config-routes.js`
- **Description**: Move profile CRUD, active profile, sheet normalization, and TT05 default behavior into a service.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Route handlers call service methods.
  - Deleting active profile is still blocked.
  - Existing response shapes remain unchanged.
- **Validation**: Service unit tests + config API tests.

### Task 2.3: Extract Enum Service

- **Location**: `backend/src/services/enum-service.js`
- **Description**: Own built-in/custom/per-profile enum lookup, mutation, clone, override, and valid key listing.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Schema validator consumes valid enum keys from this service.
  - Cache invalidation is called in one place.
- **Validation**: Unit tests and profile enum API tests.

### Task 2.4: Extract Schema Service

- **Location**: `backend/src/services/schema-service.js`
- **Description**: Own sheet resolution, schema payload validation, storage, reset, and default fallback.
- **Dependencies**: Tasks 2.1, 2.3
- **Acceptance Criteria**:
  - Error messages distinguish missing profile from invalid sheet.
  - Legacy `/schema/:sheet` still works for `Ho_so`/`Van_ban`.
  - Profile-scoped schema routes support actual sheet names.
- **Validation**: Service unit tests + route characterization tests.

## Sprint 3: Canonical Sheet Data Contract

**Goal**: Remove the hidden assumption that "profile" means exactly two sheets, while preserving legacy adapters.

**Demo/Validation**:
- Uploading TT05 still returns `hoSoRow` and `vanBanRows`.
- Uploading a custom profile can preserve all configured sheets in canonical form.

### Task 3.1: Define Dossier Sheet Adapter

- **Location**: `backend/src/services/dossier-sheet-adapter.js`
- **Description**: Convert between legacy `{ hoSoRow, vanBanRows }` and canonical `{ sheets: [{ name, role, rows }] }`.
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - `Ho_so` maps to role `primary`, one-row data.
  - `Van_ban` maps to role `documents`, many-row data.
  - Unknown extra sheets map to role `auxiliary`.
- **Validation**: Unit tests.

### Task 3.2: Extend Dossier Model Additively

- **Location**: `backend/src/models/dossier-model.js`
- **Description**: Add optional `sheets` field without removing `hoSoRow`/`vanBanRows`.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Existing documents still read normally.
  - New writes can include both canonical and legacy data.
- **Validation**: Model test and migration smoke test.

### Task 3.3: Parse All Profile Sheets

- **Location**: `backend/src/services/excel-parser-service.js`
- **Description**: Parse every sheet listed in `profile.sheets`, use each sheet schema, then build legacy adapters for the first primary/document sheets.
- **Dependencies**: Tasks 2.4, 3.1
- **Acceptance Criteria**:
  - Missing configured sheet produces a sheet-specific validation error.
  - TT05 output remains identical.
  - Extra sheet rows are preserved.
- **Validation**: Fixture tests with TT05 and custom 3-sheet workbook.

### Task 3.4: Make Field Validation Sheet-Aware

- **Location**: `backend/src/services/field-validator-service.js`, `backend/src/services/validation-orchestrator.js`
- **Description**: Add generic `validateSheetRows(profileId, sheetName, rows)` and keep `validateHoSoRow`/`validateVanBanRows` as wrappers.
- **Dependencies**: Task 3.3
- **Acceptance Criteria**:
  - All configured sheets get field validation.
  - Existing TT05 tests still pass.
- **Validation**: Unit tests for generic and wrapper APIs.

### Task 3.5: Keep Domain Cross-Validation Explicit

- **Location**: `backend/src/services/cross-validator-service.js`, `backend/src/services/pdf-mapping-validator.js`
- **Description**: Keep TT05 cross-validation and PDF mapping tied to the primary/document adapter until requirements exist for other sheet roles.
- **Dependencies**: Task 3.4
- **Acceptance Criteria**:
  - No false promise that all sheet combinations are semantically validated.
  - Errors use actual configured sheet names when possible.
- **Validation**: Regression tests for TT05 cross rules.

## Sprint 4: Schema-Driven Frontend Grid

**Goal**: Remove hardcoded field arrays from the main editing experience.

**Demo/Validation**:
- Custom profile fields render in dossier editor.
- TT05 editor still looks and behaves the same.

### Task 4.1: Expose Dossier Profile Metadata To Frontend

- **Location**: `backend/src/routes/dossier-routes.js`, `frontend/src/hooks/use-dossier.js`
- **Description**: Return `profileId`, `sheets`, and enough schema metadata for the editor, or provide a dedicated profile schema fetch path.
- **Dependencies**: Sprint 3
- **Acceptance Criteria**:
  - Dossier detail response identifies profile and sheet names.
  - Frontend can fetch schemas for all relevant sheets.
- **Validation**: API integration test and hook test.

### Task 4.2: Make ExcelGrid Accept Field Definitions

- **Location**: `frontend/src/components/excel/ExcelGrid.jsx`
- **Description**: Replace internal `HO_SO_FIELDS`/`VAN_BAN_FIELDS` as source of truth with `fields` props; keep constants only as fallback for legacy tests.
- **Dependencies**: Task 4.1 can be developed in parallel with mock data
- **Acceptance Criteria**:
  - Grid renders columns from schema order/index.
  - Error mapping still highlights by `sheet.row.field`.
  - Column config keys remain stable by field name.
- **Validation**: Component tests for TT05 and custom field list.

### Task 4.3: Render Dossier Sheet Tabs Dynamically

- **Location**: `frontend/src/pages/DossierPage.jsx`
- **Description**: Build data tabs from dossier/profile sheets instead of hardcoded `Ho_so` and `Van_ban`.
- **Dependencies**: Tasks 4.1, 4.2
- **Acceptance Criteria**:
  - Error counts are grouped by actual sheet names.
  - `handleCellChange`, `handleApplyFixes`, and navigation work for schema-driven sheets.
- **Validation**: Page/component tests with mocked dossier data.

### Task 4.4: Preserve Legacy Save Contract During UI Migration

- **Location**: `frontend/src/hooks/use-dossier.js`, backend save adapter
- **Description**: Save canonical sheet edits where supported, but continue sending `hoSoRow`/`vanBanRows` until backend accepts canonical save payload.
- **Dependencies**: Tasks 3.1, 4.3
- **Acceptance Criteria**:
  - TT05 save still works.
  - Custom profile fields survive save.
- **Validation**: Integration/API tests and manual edit/save flow.

## Sprint 5: Split Frontend Workspaces

**Goal**: Reduce UI coupling after behavior is protected.

**Demo/Validation**:
- Package/edit, queue, and archive views each have focused components.

### Task 5.1: Extract Queue Workspace

- **Location**: `frontend/src/pages/QueueViewPage.jsx`, `frontend/src/components/dossier/QueueWorkspace.jsx`, `frontend/src/pages/DossierPage.jsx`
- **Description**: Move `QueueTab` out of `DossierPage` and reuse it from `/queue` or a real queue route.
- **Dependencies**: Sprint 4 not strictly required, but safer after tests
- **Acceptance Criteria**:
  - No duplicate queue logic.
  - `/queue` is not a redirect to `/dossier` unless product intentionally wants tabs.
- **Validation**: Route/component tests.

### Task 5.2: Extract Archive Workspace

- **Location**: `frontend/src/components/files/ArchiveWorkspace.jsx`, `frontend/src/pages/FileBrowserPage.jsx`, `frontend/src/pages/DossierPage.jsx`
- **Description**: Move SIP archive table state and column config out of `DossierPage`.
- **Dependencies**: Task 5.1 optional
- **Acceptance Criteria**:
  - Archive page owns archive-specific state.
  - Dossier editor no longer imports archive table directly.
- **Validation**: Component test.

### Task 5.3: Split Dossier Editing Hooks

- **Location**: `frontend/src/hooks/use-dossier-loader.js`, `frontend/src/hooks/use-dossier-edits.js`, `frontend/src/hooks/use-workflow-actions.js`
- **Description**: Separate data loading, edit draft state, and workflow actions.
- **Dependencies**: Sprint 4
- **Acceptance Criteria**:
  - `DossierPage.jsx` primarily composes components.
  - Hooks have unit/component coverage.
- **Validation**: Existing DossierPage behavior tests still pass.

## Sprint 6: Operational Hardening

**Goal**: Make the refactor safe in multi-process and production-like deployments.

**Demo/Validation**:
- Cache and temp-file behavior are observable and recoverable.

### Task 6.1: Versioned Config Cache Invalidation

- **Location**: `backend/src/services/schema-cache-service.js`, extracted config services
- **Description**: Add a config version or updated-at check so multiple backend processes do not serve stale schemas forever.
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - Cache invalidates after config mutation in current process.
  - Multi-process strategy is documented, even if first implementation uses short TTL.
- **Validation**: Unit tests with mocked AppConfig changes.

### Task 6.2: Temp Storage Lifecycle Audit

- **Location**: `backend/src/routes/upload-routes.js`, `backend/src/services/sip-packaging-service.js`, new cleanup job if needed
- **Description**: Document and test when temp upload directories are retained/deleted, especially after packaging failure.
- **Dependencies**: None
- **Acceptance Criteria**:
  - No approved dossier loses PDFs before packaging.
  - Stale failed uploads can be cleaned safely.
- **Validation**: Service tests and manual packaging failure simulation.

### Task 6.3: Add Rollout Metrics And Logs

- **Location**: `backend/src/utils/logger.js`, validation/save/package routes
- **Description**: Log profileId, sheet counts, schema version, validation duration, and save validation outcome.
- **Dependencies**: Sprint 3
- **Acceptance Criteria**:
  - Logs help identify profile-specific regressions without exposing sensitive data.
- **Validation**: Log snapshot/manual inspection.

## Testing Strategy

### Backend Unit

- `schema-payload-validator`: built-in enum, custom enum, unknown enum, regex ReDoS, dependent enum cycles.
- `schema-cache-service` or extracted schema service: fallback, per-profile override, invalidation.
- `field-validator-service`: generic sheet validator, dependent enum with profile override.
- `dossier-sheet-adapter`: legacy to canonical and canonical to legacy.
- `workflow-engine`: keep current transition/race tests.

### Backend Integration

- Auth smoke tests.
- Config profile CRUD.
- Active profile GET/PUT.
- Enum create/update/delete and per-profile overrides.
- Schema save/reset with custom enum keys.
- Upload using active profile.
- Save/revalidate uses stored dossier profileId.
- Inline validation with profileId.
- Dossier list RBAC.
- Packaging regression with TT05 dossier.

### Frontend

- `StandardsHubTab`: loads active profile from `profileId`, calls PUT when changing active profile.
- `ExcelGrid`: renders columns from passed schema; fallback constants still render TT05.
- `DossierPage`: dynamic sheet tabs, error count per sheet, edit/save contract.
- Queue/archive extracted workspaces retain filters and localStorage column config.

### Fixtures

- TT05 valid workbook.
- TT05 invalid workbook with known errors.
- Custom 2-sheet profile workbook.
- Custom 3-sheet profile workbook.
- Per-profile enum override fixture.

### Manual Smoke

1. `docker-compose up -d --build`
2. Login as admin.
3. Create custom enum.
4. Create custom profile and schema using that enum.
5. Set active profile.
6. Upload workbook for that profile.
7. Edit a custom field.
8. Save and revalidate.
9. Approve.
10. Package SIP.
11. Verify audit logs and file archive.

## Rollout Plan

1. **Branch and baseline**: create a refactor branch and do not mix unrelated dirty worktree changes.
2. **Hotfix release**: ship Sprint 1 only if production needs immediate repair.
3. **Additive schema release**: add canonical sheet data while continuing legacy reads/writes.
4. **Dual-run validation**: for TT05, compare generic validation result with legacy validation result in logs/tests before switching.
5. **Frontend dynamic grid canary**: enable for admin/custom profile users first; keep hardcoded fallback.
6. **Cutover**: make canonical sheet data primary after one stable release.
7. **Cleanup**: remove unused legacy paths only after migration and rollback window.

## Rollback Plan

- Keep `hoSoRow` and `vanBanRows` as stable fallback fields throughout the rollout.
- Feature-flag dynamic grid rendering if adding feature flags is acceptable, for example `DYNAMIC_SCHEMA_GRID`.
- If canonical save causes issues, continue accepting legacy save payload and disable canonical writes.
- If config service extraction regresses, routes can call old `schemaCacheService` paths temporarily because API response shapes remain unchanged.

## Parallel Work Plan

### Can Run In Parallel Immediately

- **Track A: Test harness**: Tasks 0.2, 0.3, frontend test stabilization.
- **Track B: Active profile frontend bug**: Task 1.1 with mocked API.
- **Track C: Backend config API characterization tests**: Task 0.4.
- **Track D: Documentation/ADR**: Task 0.1.

### Can Run In Parallel After Sprint 1

- **Track E: Profile service extraction**: Task 2.2.
- **Track F: Enum service extraction**: Task 2.3.
- **Track G: Schema service extraction**: Task 2.4 after key builder, partly parallel with E/F.
- **Track H: Frontend grid design spike**: Task 4.2 against mocked schema props.

### Should Stay Sequential

- Canonical sheet model before parsing all sheets.
- Parsing all sheets before dynamic save payload.
- Schema-driven grid before dynamic DossierPage tabs.
- Route split after DossierPage behavior tests exist.

## Risk Register

- **Risk**: Breaking TT05 production flow while supporting custom profiles.  
  **Mitigation**: Keep TT05 fixtures and legacy adapters mandatory in every sprint.

- **Risk**: Arbitrary sheet support becomes an implicit product promise.  
  **Mitigation**: Document roles: `primary`, `documents`, `auxiliary`; only primary/documents participate in current domain cross-validation.

- **Risk**: Cache invalidation works locally but not in multi-process deployments.  
  **Mitigation**: Add TTL/versioned invalidation in Sprint 6 before scaling backend replicas.

- **Risk**: Frontend and backend disagree on schema shape.  
  **Mitigation**: Add a single serialized schema DTO and test it at API + component boundaries.

- **Risk**: Dirty worktree causes accidental reversions.  
  **Mitigation**: Use small commits, avoid touching unrelated untracked files, inspect `git diff` before each commit.
