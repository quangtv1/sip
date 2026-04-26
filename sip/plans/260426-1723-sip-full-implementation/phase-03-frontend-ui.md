# Phase 3: Frontend UI

## Context
- **Priority:** P1
- **Status:** Complete (2026-04-26)
- **Effort:** 100h
- **Depends on:** Phase 2 (validation API endpoints exist)
- **Docs:** `docs/design-guidelines/`, `docs/features-vi.md` (features 5,6,7,8,9,10)

## Overview

Scaffold React 18 + Ant Design 5 app. Build core components: LoginPage, UploadPanel, ExcelGrid (editable), ErrorPanel (filterable + drill-down), WorkflowBar, auto-fix UI, PDF viewer. Set up routing, API client (Axios + JWT interceptor), and state management (React Context + React Query).

## Key Insights

- Navy/Teal theme per design-guidelines (Ant Design ConfigProvider)
- ExcelGrid must handle 1000+ rows — use virtual scrolling
- Error Panel click → scroll to cell in ExcelGrid
- Auto-fix shows before/after diff, user confirms
- PDF viewer: iframe with presigned URL (or temp API before APPROVED)
- Dropdown for enum fields in edit mode
- JWT stored in localStorage, auto-attach via Axios interceptor

## Files to Create

```
frontend/
  package.json
  Dockerfile
  vite.config.js
  index.html
  public/
  src/
    main.jsx                           # Entry point
    App.jsx                            # Router + Layout
    config/
      api-client.js                    # Axios instance + JWT interceptor
      theme-config.js                  # Ant Design Navy/Teal theme
    context/
      auth-context.jsx                 # Auth state (user, token, login/logout)
    hooks/
      use-auth.js                      # Auth context hook
      use-validation.js                # Validation state + API calls
      use-dossier.js                   # Dossier CRUD + state
    pages/
      LoginPage.jsx                    # Login form
      DossierPage.jsx                  # Main workspace (Upload→Grid→Errors)
    components/
      layout/
        AppLayout.jsx                  # Header + Sidebar + Content
        AppHeader.jsx                  # Logo, user menu, notification bell
        AppSidebar.jsx                 # Navigation menu
      upload/
        UploadPanel.jsx                # Drag & drop, file picker
        FolderTreeView.jsx             # Tree view of uploaded folder
      excel/
        ExcelGrid.jsx                  # Editable table (Ho_so + Van_ban tabs)
        ExcelCell.jsx                  # Single cell (read/edit mode)
        EnumDropdown.jsx               # Dropdown for enum fields
      errors/
        ErrorPanel.jsx                 # Error list, filter, click-to-scroll
        ErrorItem.jsx                  # Single error row
        AutoFixPanel.jsx               # Before/after diff, apply buttons
      workflow/
        WorkflowBar.jsx                # Status badge + action buttons
      pdf/
        PdfViewer.jsx                  # iframe PDF viewer
    utils/
      format-helpers.js                # Date formatting, number formatting
      enum-labels.js                   # Vietnamese enum display labels
```

## Implementation Steps

1. **Scaffold React** — Create Vite + React 18 project. Install: antd@5, @ant-design/icons, axios, react-router-dom@6, @tanstack/react-query. Add Dockerfile (multi-stage: node build → nginx serve).

2. **Theme config** — Configure Ant Design ConfigProvider with Navy/Teal colors from `docs/design-guidelines/theme-setup.md`. Set typography, border radius, component tokens.

3. **API client** — Axios instance with baseURL `/api`. Request interceptor: attach `Authorization: Bearer <token>` from localStorage. Response interceptor: on 401 → redirect to login. Standard error handler.

4. **Auth context** — React Context for auth state: user, token, isAuthenticated, login(), logout(). Persist token in localStorage. Decode JWT for user info (email, role).

5. **LoginPage** — Ant Design Card with Form (email + password). Call `POST /api/auth/login`. On success, store token + redirect to DossierPage. Error display on invalid credentials.

6. **AppLayout** — Ant Design Layout with Header (logo, user dropdown, notification placeholder), Sider (nav menu based on role), Content. React Router outlet.

7. **UploadPanel** — Ant Design Upload.Dragger. Accept folder (webkitdirectory) or ZIP. On upload → call `POST /api/upload`. Show progress bar. On success → render FolderTreeView + trigger validation.

8. **FolderTreeView** — Ant Design Tree component. Render uploaded folder structure. Color-code: red (ERROR), yellow (WARNING), green (OK). Click PDF → open PdfViewer.

9. **ExcelGrid** — Ant Design Table with tabs (Ho_so / Van_ban). Features: row numbers, cell highlighting (red for errors), hover tooltip for error message. Edit mode: click cell → inline edit, enum fields → dropdown. Virtual scrolling for 1000+ rows. Ref for scroll-to-cell.

10. **ErrorPanel** — List of validation errors. Each item: sheet, row, field, message, severity (tag color). Filter by severity (ERROR/WARNING). Click error → scroll ExcelGrid to that cell. Badge counts.

11. **AutoFixPanel** — List of suggestions from auto-fix. Each: field, current value, suggested value (highlighted diff). Buttons: "Apply All", individual "Apply" per suggestion. After apply → re-validate.

12. **WorkflowBar** — Shows current dossier state as Steps component. Action buttons: "Validate" (Operator), "Approve/Reject" (Approver), "Package" (after approve), "Sign" (Signer, V2 placeholder). Buttons conditionally rendered by role + state.

13. **PdfViewer** — Modal with iframe. Source: API endpoint for temp PDF (pre-APPROVED) or presigned URL (post-APPROVED). Fallback message when PDF missing.

14. **DossierPage** — Main workspace layout: UploadPanel (top) → WorkflowBar → Split pane: ExcelGrid (left) + ErrorPanel (right) → PdfViewer (modal).

15. **Routing** — `/login` → LoginPage. `/` → redirect to `/dossier` (authenticated). `/dossier` → DossierPage. Protected route wrapper checking auth.

## Completion Summary (2026-04-26)

### Delivered Components
- **Scaffold:** React 18 + Vite + Ant Design 5 SPA
- **Auth:** AuthContext with JWT decode + expiry check, ProtectedRoute wrapper
- **Config:** api-client.js with interceptors, theme-config.js (Navy/Teal)
- **Utils:** enum-labels.js (all TT05 enums), format-helpers.js (date/number formatting)
- **Hooks:** use-dossier, use-auth, use-validation
- **Layout:** AppLayout, AppHeader, AppSidebar (role-filtered navigation)
- **Pages:** LoginPage (email + password), DossierPage (full workspace with local edit buffering)
- **Components:**
  - UploadPanel (ZIP + folder support, decoupled from useDossier via callbacks)
  - FolderTreeView (color-coded status)
  - ExcelGrid (virtual scroll, forwardRef scrollToCell, tabs: Ho_so/Van_ban)
  - ExcelCell (sync draft on external value change)
  - EnumDropdown (TT05 enums)
  - ErrorPanel (filterable, click-to-scroll integration)
  - AutoFixPanel (before/after diff)
  - WorkflowBar (handles transient VALIDATING/PACKAGING states)
  - PdfViewer (iframe + presigned URLs)
- **Build:** Dockerfile multi-stage (node → nginx)

### Post-Review Fixes Applied
- onPackage handler wired in DossierPage
- validate/save clear error state before request
- JWT expiry check in decodeToken
- ExcelCell draft syncs with external value changes
- WorkflowBar transient state handling (VALIDATING, PACKAGING)
- Reject modal: empty reason guard, confirmLoading, double-submit prevention
- UploadPanel callback props architecture (no direct useDossier coupling)

## Todo

- [x] Scaffold React + Vite + Ant Design 5
- [x] Theme config (Navy/Teal)
- [x] Axios API client with JWT interceptor
- [x] Auth context + LoginPage
- [x] AppLayout (Header + Sidebar + Content)
- [x] UploadPanel with drag & drop
- [x] FolderTreeView
- [x] ExcelGrid (read + edit, virtual scrolling)
- [x] EnumDropdown for enum fields
- [x] ErrorPanel with filter + click-to-scroll
- [x] AutoFixPanel with diff + apply
- [x] WorkflowBar (state display + action buttons)
- [x] PdfViewer (modal iframe)
- [x] DossierPage layout
- [x] Routing + protected routes
- [x] Frontend Dockerfile (multi-stage build)

## Success Criteria

1. Login works with JWT from Phase 1
2. Upload folder triggers validation and shows results
3. ExcelGrid renders both sheets, highlights error cells
4. Click error in ErrorPanel scrolls to correct cell
5. Auto-fix panel shows suggestions, apply works
6. WorkflowBar shows correct state and role-based buttons
7. PDF viewer opens files from uploaded folder
8. Responsive layout works on 1280px+ screens
9. No console errors in production build

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| ExcelGrid perf with 1000+ rows | Ant Design Table virtual scroll or react-window |
| Folder upload browser compat | webkitdirectory + ZIP fallback |
| Complex state management | React Query for server state, Context for auth only |
| Ant Design theme customization | Use ConfigProvider algorithm, not CSS overrides |
