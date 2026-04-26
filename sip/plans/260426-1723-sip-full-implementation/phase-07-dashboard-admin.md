# Phase 7: Dashboard & Admin

## Context
- **Priority:** P2
- **Status:** Complete (2026-04-26)
- **Effort:** 100h
- **Depends on:** Phase 6 (MinIO integration, file browser, notifications)
- **Docs:** `docs/features-vi.md` (features 11,12,17,22)

## Overview

Build dashboard with stats/charts, SIP viewer (unzip + tree + XML preview), audit log viewer, and user management UI.

## Key Insights

- Dashboard: 6 KPIs + 3 chart types (line, bar, pie)
- Drill-down: click log → modal with error list + Excel preview tabs
- SIP viewer: backend unzips in-memory, returns file tree
- XML preview: collapsible tree with syntax highlighting
- User management: Admin only, no delete (lock instead)
- Audit log: Admin + Auditor, read-only, filterable, exportable

## Files to Create

```
backend/src/
  services/
    stats-service.js                 # MongoDB aggregation for dashboard
    sip-viewer-service.js            # Unzip SIP in-memory, return file tree
  routes/
    dashboard-routes.js              # GET /api/stats
    log-routes.js                    # GET /api/logs (audit log listing)

frontend/src/
  pages/
    DashboardPage.jsx                # Stats + charts + recent logs
    UserManagementPage.jsx           # User CRUD (Admin only)
    AuditLogPage.jsx                 # Audit log viewer
  components/
    dashboard/
      StatCards.jsx                  # 4 stat cards (total, errors, success rate, pending)
      ErrorTrendChart.jsx            # Line chart: errors by month
      TopErrorFieldsChart.jsx        # Bar chart: top 10 error fields
      WorkflowDistributionChart.jsx  # Pie/donut: dossiers by state
      LogDrilldownModal.jsx          # Modal: error list + Excel preview
    sip-viewer/
      SipViewerModal.jsx             # Tree view of SIP contents
      XmlPreviewModal.jsx            # Collapsible XML tree + syntax highlight
    admin/
      UserTable.jsx                  # User list with actions
      UserFormModal.jsx              # Create/edit user form
      AuditLogTable.jsx              # Audit log table with filters
```

## Files to Modify

```
frontend/src/App.jsx — add routes for dashboard, users, audit log
frontend/src/components/layout/AppSidebar.jsx — add nav items
frontend/src/components/files/FileBrowser.jsx — add SIP viewer action
```

## Implementation Steps

1. **Stats service** — MongoDB aggregation pipeline:
   - Total dossiers count, by state
   - Error count (sum from audit logs)
   - Success rate (DONE / total)
   - Top 10 error fields (from validation results stored in dossiers)
   - Error trend by month/week (last 12 months)
   Support query params: period (30d, 90d, 1y), groupBy (week, month).

2. **Dashboard routes** — `GET /api/stats?period=30d&groupBy=month` returns aggregated data. Cache results for 30 seconds (in-memory or Redis).

3. **Log routes** — `GET /api/logs` with filters: action, userId, dossierId, dateRange. Pagination. Sort by timestamp desc. Admin + Auditor only. `GET /api/logs/export?format=csv` for CSV download.

4. **SIP viewer service** — `GET /api/files/sip/:path/contents` — download ZIP from MinIO, unzip in-memory (`adm-zip` or `yauzl`), return file tree with metadata (name, size, type). `GET /api/files/sip/:path/file/*filepath` — extract specific file from ZIP, return content (XML as text, others as download).

5. **StatCards** — 4 Ant Design Statistic cards: Total Dossiers, Total Errors, Success Rate (%), Pending Review. Color-coded values.

6. **ErrorTrendChart** — Chart.js Line chart: X = months, Y = error count. Tooltip with details. Responsive.

7. **TopErrorFieldsChart** — Chart.js horizontal Bar chart: top 10 fields with highest error count. Click bar → filter to that field.

8. **WorkflowDistributionChart** — Chart.js Doughnut chart: dossier count by state. Color per state. Legend with counts.

9. **LogDrilldownModal** — Click audit log entry → open modal with 2 tabs:
   - Tab 1 "Error List": table of errors from that validation run
   - Tab 2 "Excel Preview": read-only ExcelGrid with error highlighting

10. **DashboardPage** — Layout: StatCards row → Charts row (2 columns: trend + top fields) → Distribution chart → Recent activity table (last 20 logs). Auto-refresh every 30 seconds.

11. **SipViewerModal** — Triggered from FileBrowser when clicking a ZIP file. Shows: collapsible tree (Ant Design Tree) of SIP contents. Click a file → show content (XML preview for .xml, info card for .pdf, raw text for .csv).

12. **XmlPreviewModal** — Render XML as collapsible tree (parse XML → recursive component). Syntax highlighting (tag names = blue, attributes = green, text = black). Search box (Ctrl+F). Copy + download buttons.

13. **UserManagementPage** — Admin only. UserTable: columns = username, fullName, email, role (Tag), status (active/locked), lastLogin, actions. UserFormModal: create/edit form with role dropdown. Lock/unlock toggle (no permanent delete).

14. **AuditLogPage** — AuditLogTable with columns: timestamp, action (Tag), user, dossier, status, error count. Filters: action type, date range, user. Export CSV button. Pagination.

15. **Navigation updates** — Add sidebar items based on role: Dashboard (all), Queue (Operator+), Audit Log (Admin, Auditor), Users (Admin), Config (Admin).

## Todo

- [ ] Stats aggregation service
- [ ] Dashboard API route (GET /api/stats)
- [ ] Audit log listing route (GET /api/logs)
- [ ] SIP viewer service (unzip in-memory)
- [ ] StatCards component
- [ ] Error trend chart (Chart.js line)
- [ ] Top error fields chart (Chart.js bar)
- [ ] Workflow distribution chart (Chart.js doughnut)
- [ ] Log drill-down modal (errors + Excel preview)
- [ ] DashboardPage layout
- [ ] SipViewerModal (tree view)
- [ ] XmlPreviewModal (syntax highlighted tree)
- [ ] UserManagementPage + UserTable + UserFormModal
- [ ] AuditLogPage + AuditLogTable
- [ ] Navigation updates (role-based)

## Success Criteria

1. Dashboard loads in < 1 second
2. Charts show correct aggregated data
3. Drill-down modal shows validation errors for selected log
4. SIP viewer unzips and displays file tree correctly
5. XML preview renders METS/EAD/PREMIS with collapsible tree
6. User management CRUD works (Admin only)
7. Audit log filterable + CSV export works
8. Navigation respects RBAC (hide items by role)

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| MongoDB aggregation slow | Add indexes on timestamp, action; cache results |
| Large SIP file in-memory unzip | Limit unzip to 100MB, stream for larger |
| Chart.js bundle size | Dynamic import (lazy load chart components) |
| XSS in XML preview | Escape all XML content before rendering |
