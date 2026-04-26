# Phase 4: Workflow & RBAC

## Context
- **Priority:** P1
- **Status:** Pending
- **Effort:** 80h
- **Depends on:** Phase 3 (Frontend UI with WorkflowBar, auth context)
- **Docs:** `docs/features-vi.md` (features 13,14,16,23)

## Overview

Implement workflow state machine (UPLOAD→VALIDATING→VALIDATED→APPROVED→PACKAGING→SIGNED→DONE + REJECTED), approval/rejection endpoints, RBAC enforcement on all API endpoints, dossier listing (Queue View), and audit log integration for every state transition.

## Key Insights

- State transitions are strictly ordered — no skipping, no rollback after SIGNED
- REJECTED reverts to UPLOAD for re-editing
- Digital signature (SIGNED) is V2 — in MVP, PACKAGED auto-transitions to DONE
- Rejection requires note >=10 chars
- Every transition = audit log entry
- UI hides actions user can't perform (not just disable)

## Files to Create/Modify

```
backend/src/
  services/
    workflow-engine.js               # State machine + transition logic
    notification-service.js          # Stub for in-app notifications (Phase 6)
  routes/
    approve-routes.js                # POST /api/approve, POST /api/reject
    dossier-routes.js                # GET /api/dossiers, GET /api/dossiers/:id

frontend/src/
  pages/
    QueueViewPage.jsx                # Dossier list with filters
  components/
    dossier/
      DossierListTable.jsx           # Table: name, state, operator, date, errors
      DossierStatusBadge.jsx         # Color-coded state badge
      ApprovalDialog.jsx             # Confirm approve/reject with note
```

## Files to Modify

```
backend/src/routes/ (all existing routes) — add RBAC middleware
backend/src/services/audit-log-service.js — add transition logging
frontend/src/components/workflow/WorkflowBar.jsx — wire to approval API
frontend/src/App.jsx — add QueueView route
frontend/src/components/layout/AppSidebar.jsx — add Queue View nav item
```

## Implementation Steps

1. **Workflow engine** — Create state machine with allowed transitions map:
   - UPLOAD → VALIDATING (system)
   - VALIDATING → VALIDATED (system), UPLOAD (on validation failure)
   - VALIDATED → APPROVED (Approver), REJECTED (Approver)
   - REJECTED → UPLOAD (system, auto-revert)
   - APPROVED → PACKAGING (system)
   - PACKAGING → DONE (system, in MVP — skip SIGNED)
   - DONE → (terminal)
   Methods: `canTransition(from, to)`, `transition(dossierId, to, actor)`.

2. **Transition enforcement** — `transition()` checks: (a) valid transition, (b) actor has role for this transition, (c) pre-conditions (e.g., no ERRORs for APPROVED). Throws on violation. Logs to audit.

3. **Approve route** — `POST /api/approve { dossierId }` — requires Approver/Admin role. Checks dossier state = VALIDATED, no ERROR-level issues. Transitions to APPROVED. Logs audit entry.

4. **Reject route** — `POST /api/reject { dossierId, note }` — requires Approver/Admin. Note must be >= 10 chars. Transitions VALIDATED → REJECTED → auto-revert to UPLOAD. Logs with rejection note.

5. **Dossier routes** — `GET /api/dossiers` with query filters: state, uploadedBy, dateRange, search. Pagination (limit 20, offset). Sort by createdAt desc. `GET /api/dossiers/:id` returns full dossier detail.

6. **RBAC enforcement** — Add `requireRole()` middleware to ALL existing and new routes per permission matrix:
   - Upload/validate/save: Operator, Admin
   - Approve/reject: Approver, Admin
   - Users CRUD: Admin only
   - Stats/dossiers: Operator+
   - Audit logs: Admin, Auditor
   - Config: Admin only

7. **Audit log integration** — Every workflow transition appends to audit_logs: action (state name), userID, dossierID, timestamp, resultStatus, details (includes any notes). Log upload, validation start/end, approval, rejection, packaging start/end.

8. **Notification service stub** — Create `notification-service.js` with `notify(userId, event, data)` that stores to MongoDB `notifications` collection. Actual WebSocket push deferred to Phase 6.

9. **QueueViewPage** — Ant Design Table showing all dossiers. Columns: name, state (badge), operator, date, error count. Filters: state dropdown, date range. Click row → navigate to DossierPage.

10. **DossierListTable** — Reusable table component. State badges with colors: UPLOAD=blue, VALIDATING=processing, VALIDATED=orange, APPROVED=green, PACKAGING=cyan, DONE=green, REJECTED=red.

11. **ApprovalDialog** — Modal with confirm/reject actions. Reject requires TextArea (min 10 chars). Approve shows confirmation message. Both call respective API endpoints.

12. **WorkflowBar updates** — Wire approve/reject buttons to API. Show buttons based on user role AND dossier state. After action → refetch dossier state.

## Todo

- [x] Workflow state machine (transition map + validation)
- [x] Approve endpoint (POST /api/approve)
- [x] Reject endpoint (POST /api/reject)
- [x] Dossier listing endpoint (GET /api/dossiers)
- [x] RBAC middleware on all endpoints
- [x] Audit log integration for all transitions
- [x] Notification service stub
- [x] QueueViewPage + DossierListTable
- [x] ApprovalDialog (approve/reject UI)
- [x] WorkflowBar wired to API
- [x] Role-based UI visibility

## Success Criteria

1. State transitions enforced — cannot skip steps
2. Only Approver/Admin can approve/reject
3. Rejection requires note >= 10 chars
4. All transitions logged to audit_logs
5. Non-Admin blocked from user management (403)
6. QueueView shows dossier list with correct states
7. UI hides buttons user's role cannot access
8. Cannot approve dossier with ERROR-level issues

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Race condition on state transition | MongoDB findOneAndUpdate with state precondition |
| Role confusion in UI | Single source: JWT role decoded client-side |
| Audit log gaps | Wrap transition in try/finally — log even on failure |
