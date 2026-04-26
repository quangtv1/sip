# Phase 1: Foundation & Infrastructure

## Context
- **Priority:** P1 — blocks all subsequent phases
- **Status:** Pending
- **Effort:** 80h
- **Docs:** `docs/system-architecture.md`, `docs/code-standards.md`

## Overview

Set up Docker Compose (5 services), Express backend skeleton, MongoDB connection, JWT auth with RBAC middleware, health check, and standard error handling framework.

## Key Insights

- 5 Docker services: nginx, backend, mongodb, redis, minio
- Stateless API — JWT in Authorization header, no sessions
- 5 RBAC roles: Admin, Operator, Approver, Signer, Auditor
- Audit log is append-only MongoDB collection
- Standard response format: `{ success, data/error }` pattern

## Files to Create

```
docker-compose.yml
.env.example
.dockerignore
.gitignore
nginx/
  nginx.conf
  Dockerfile
backend/
  Dockerfile
  package.json
  src/
    app.js                          # Express entry point
    config/
      index.js                      # ENV loader
      database.js                   # MongoDB connection
    middleware/
      auth-middleware.js             # JWT verify
      rbac-middleware.js             # Role check
      error-handler-middleware.js    # Centralized error handler
    routes/
      health-routes.js              # GET /api/health
      auth-routes.js                # POST /api/auth/login, logout, password
      user-routes.js                # CRUD /api/users (Admin only)
    models/
      user-model.js                 # email, passwordHash, role, active
      audit-log-model.js            # append-only audit log
    services/
      auth-service.js               # JWT issue/verify, bcrypt
      user-service.js               # CRUD users
      audit-log-service.js          # append log entries
    utils/
      app-error.js                  # Custom error classes
      constants.js                  # Roles, error codes
    scripts/
      seed-admin.js                 # Create default admin user
```

## Implementation Steps

1. **Docker Compose** — Create `docker-compose.yml` with 5 services (nginx:8080, backend:3000, mongodb:27017, redis:6379, minio:9000/9001). Add volumes for persistence. Create `.env.example` with all env vars.

2. **Nginx** — Reverse proxy config: `/api/*` → `backend:3000`, `/` → serve static. Create `nginx/Dockerfile` and `nginx.conf`.

3. **Express skeleton** — Init `package.json` with deps (express, cors, mongoose, jsonwebtoken, bcrypt, multer, morgan, dotenv, winston). Create `app.js` with middleware chain: cors → morgan → json → routes → error handler.

4. **MongoDB connection** — `database.js` with mongoose connect, retry logic, connection events. Create indexes on `audit-logs` collection.

5. **User model** — Schema: email (unique), passwordHash (bcrypt), role (enum), active (bool), fullName, createdAt, lastLogin. Index on email.

6. **Audit log model** — Schema: action, userID, dossierID, fileName, timestamp, resultStatus, errorCount, warningCount, details. Indexes: `{dossierID, timestamp}`, `{action, timestamp}`, `{timestamp}`.

7. **Auth service** — JWT sign/verify with `JWT_SECRET`, 8h expiry. Login: validate credentials → issue token. Logout: client-side only (stateless).

8. **Auth middleware** — Extract Bearer token → verify → attach `req.user = { id, email, role }`. RBAC middleware: `requireRole(...roles)` factory function.

9. **Auth routes** — `POST /api/auth/login` (public), `POST /api/auth/logout` (authenticated), `PUT /api/auth/password` (authenticated).

10. **User routes** — `GET /api/users`, `POST /api/users`, `PUT /api/users/:id`, `PUT /api/users/:id/lock` — all Admin only.

11. **Health route** — `GET /api/health` returns `{ status: "OK", services: { mongodb, redis, minio } }` with connectivity checks.

12. **Error handler** — Centralized middleware catching ValidationError, AuthError, etc. Returns standard `{ success: false, error: { code, message, details } }`.

13. **Seed script** — `seed-admin.js` creates default admin user (email from env, default password).

14. **Docker build & test** — `docker-compose up --build`, verify all 5 services healthy, test login endpoint.

## Todo

- [ ] docker-compose.yml with 5 services
- [ ] nginx reverse proxy config
- [ ] Express app.js with middleware chain
- [ ] MongoDB connection with retry
- [ ] User model + Audit log model
- [ ] JWT auth service + middleware
- [ ] RBAC middleware (requireRole)
- [ ] Auth routes (login, logout, password)
- [ ] User CRUD routes (Admin only)
- [ ] Health check endpoint
- [ ] Error handling middleware
- [ ] Seed admin script
- [ ] Docker build passes, all services healthy

## Success Criteria

1. `docker-compose up --build` starts all 5 services without errors
2. `GET /api/health` returns 200 with all services OK
3. `POST /api/auth/login` returns JWT token for seeded admin
4. RBAC blocks non-Admin from `/api/users` with 403
5. Audit log records login action
6. Error responses follow standard format

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Docker networking issues | Use explicit network, named services |
| MongoDB connection race | Retry with backoff in database.js |
| MinIO bucket auto-creation | Init script in docker-compose entrypoint |

## Failure Modes

- **MongoDB not ready on backend start** → mongoose retry with exponential backoff (max 5 attempts)
- **Redis connection refused** → graceful degradation; BullMQ used in Phase 5 only
- **MinIO buckets don't exist** → auto-create in health check / startup
