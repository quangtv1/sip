---
title: "SIP Full-Stack Implementation"
description: "8-phase sequential plan to build Vietnamese archival SIP web app from docs to production"
status: pending
priority: P1
effort: 850h
branch: main
tags: [sip, full-stack, archival, tt05, oais]
created: 2026-04-26
---

# SIP Full-Stack Implementation Plan

## Overview

Build a Vietnamese archival web app (TT05 compliance) from scratch. 8 sequential phases, no file overlap between phases. Each phase is self-contained and implementable independently.

## Tech Stack

React 18 + Ant Design 5 | Node.js + Express 4 | MongoDB | BullMQ + Redis | MinIO | Nginx | Docker Compose

## Phases

| # | Phase | Est. | Status | Files |
|---|-------|------|--------|-------|
| 1 | [Foundation & Infrastructure](phase-01-foundation-infrastructure.md) | 80h | Pending | Docker, Express skeleton, MongoDB, JWT, RBAC |
| 2 | [Validation Engine](phase-02-validation-engine.md) | 120h | Complete (2026-04-26) | SheetJS parser, AJV validators, cross-validation |
| 3 | [Frontend UI](phase-03-frontend-ui.md) | 100h | Complete (2026-04-26) | React scaffold, Upload, ExcelGrid, ErrorPanel |
| 4 | [Workflow & RBAC](phase-04-workflow-rbac.md) | 80h | Complete (2026-04-26) | State machine, approval, audit log integration |
| 5 | [SIP Packaging](phase-05-sip-packaging.md) | 120h | Complete (2026-04-26) | METS/EAD/PREMIS XML, checksums, BullMQ jobs |
| 6 | [Storage & UX Polish](phase-06-storage-ux-polish.md) | 80h | Complete (2026-04-26) | MinIO integration, SSE progress, notifications |
| 7 | [Dashboard & Admin](phase-07-dashboard-admin.md) | 100h | Complete (2026-04-26) | Stats, SIP viewer, user mgmt, audit viewer |
| 8 | [Testing & Hardening](phase-08-testing-hardening.md) | 80h | Pending | Unit, integration, E2E, security audit |

## Dependency Chain

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
```

Strictly sequential. No phase starts until prior phase passes its success criteria.

## Key Decisions

- **Monolith for MVP**: Single Express API, split later if needed
- **Digital Signature (V2)**: SIGNED state is a placeholder pass-through in MVP
- **State mgmt**: React Context + React Query (no Redux — YAGNI)
- **Auth storage**: JWT in localStorage, 8h expiry
- **Enum validation**: Exact string match per TT05, no fuzzy in validation

## Risk Register

| Risk | L x I | Mitigation |
|------|-------|-----------|
| TT05 spec ambiguity | M x H | Sample Excel in `tmp/` as ground truth |
| Large Excel (1000+ rows) perf | M x M | Virtual scrolling, debounced validation |
| XML standard compliance | M x H | Validate generated XML against official XSD |
| MinIO connectivity in Docker | L x M | Health checks, retry logic |

## Rollback Strategy

Each phase commits to a tagged branch (`phase-N-complete`). Rollback = `git reset` to prior tag.
