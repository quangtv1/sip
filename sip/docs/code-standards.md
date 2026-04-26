# Code Standards & Conventions

**Version:** 1.0  
**Last Updated:** 2026-04-25

---

## File & Directory Naming

### Backend (Node.js)
- **Files:** kebab-case, descriptive names
  - `excel-parser.js` ✅
  - `validation-engine.js` ✅
  - `sip-packager.js` ✅
  - `auditLog.js` ❌ (use kebab-case)
- **Directories:** plural kebab-case
  - `services/` (validation, packaging, storage)
  - `routes/` (API endpoints)
  - `models/` (MongoDB schemas)
  - `middleware/` (auth, error handling)
  - `utils/` (helpers, constants)

### Frontend (React)
- **Components:** PascalCase
  - `UploadPanel.jsx` ✅
  - `ExcelGrid.jsx` ✅
  - `ErrorPanel.jsx` ✅
- **Hooks:** camelCase with `use` prefix
  - `useValidation.js` ✅
  - `useWorkflow.js` ✅
- **Utilities:** camelCase
  - `dateFormatter.js` ✅
  - `errorMapper.js` ✅
- **Directories:** kebab-case
  - `components/`
  - `hooks/`
  - `utils/`
  - `services/`

---

## Code Structure & Patterns

### Backend API Response Format

All API responses follow this structure:

**Success (2xx):**
```json
{
  "success": true,
  "data": { /* payload */ },
  "meta": { /* optional: pagination, timestamps */ }
}
```

**Error (4xx/5xx):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid",
    "details": [
      {
        "field": "Mã hồ sơ",
        "message": "Required field cannot be empty",
        "row": 2,
        "severity": "ERROR"
      }
    ]
  }
}
```

### Validation Error Codes

| Code | Meaning | HTTP Status |
|------|---------|-------------|
| `REQUIRED_FIELD` | Field is mandatory | 400 |
| `INVALID_FORMAT` | Field format incorrect | 400 |
| `ENUM_MISMATCH` | Value not in allowed list | 400 |
| `CROSS_VALIDATION_FAIL` | Cross-sheet constraint violated | 400 |
| `FILE_NOT_FOUND` | Referenced PDF missing | 400 |
| `UNAUTHORIZED` | JWT invalid/expired | 401 |
| `FORBIDDEN` | User lacks permission | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `INTERNAL_ERROR` | Server error | 500 |

### Error Handling Pattern

```javascript
// Backend: throw with structured error
class ValidationError extends Error {
  constructor(code, message, details = []) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// Middleware: catch and format
app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details }
    });
  }
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
});
```

### Validation Engine Pattern

```javascript
// validators/field-validator.js
class FieldValidator {
  validateRequired(value, field) {
    if (!value || value.trim() === '') {
      return { valid: false, code: 'REQUIRED_FIELD', message: `${field} cannot be empty` };
    }
    return { valid: true };
  }

  validateEnum(value, allowedValues, field) {
    if (!allowedValues.includes(value)) {
      return { valid: false, code: 'ENUM_MISMATCH', message: `${field} must be one of: ${allowedValues.join(', ')}` };
    }
    return { valid: true };
  }

  validateDate(value, format = 'DD/MM/YYYY', field) {
    // Parse and validate, return { valid: true/false, ... }
  }
}

module.exports = FieldValidator;
```

### Authentication & RBAC Pattern

```javascript
// middleware/auth.js
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
  } catch (err) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  next();
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
    next();
  };
};

// Usage:
router.post('/approve', authMiddleware, requireRole('Admin', 'Approver'), approveHandler);
```

### Workflow State Machine Pattern

```javascript
// services/workflow-engine.js
class WorkflowEngine {
  constructor() {
    this.states = {
      'UPLOAD': { allowedTransitions: ['VALIDATING'] },
      'VALIDATING': { allowedTransitions: ['VALIDATED', 'UPLOAD'] },
      'VALIDATED': { allowedTransitions: ['APPROVED', 'UPLOAD'] },
      'APPROVED': { allowedTransitions: ['PACKAGING'] },
      'PACKAGING': { allowedTransitions: ['SIGNED', 'VALIDATED'] },
      'SIGNED': { allowedTransitions: ['DONE'] },
      'DONE': { allowedTransitions: [] }
    };
  }

  canTransition(from, to) {
    return this.states[from]?.allowedTransitions.includes(to) ?? false;
  }

  async transition(dossierID, from, to, actor) {
    if (!this.canTransition(from, to)) {
      throw new Error(`Cannot transition from ${from} to ${to}`);
    }
    // Update DB, log audit
    await auditLog.append({ dossierID, from, to, actor, timestamp: Date.now() });
  }
}
```

---

## Testing Strategy

### Unit Tests (Jest)
- **Coverage target:** >80% for business logic
- **Pattern:** One test file per module
  - `excel-parser.js` → `excel-parser.test.js`
  - `validation-engine.js` → `validation-engine.test.js`
- **Example:**

```javascript
describe('FieldValidator', () => {
  const validator = new FieldValidator();

  test('validateRequired rejects empty string', () => {
    const result = validator.validateRequired('', 'Mã hồ sơ');
    expect(result.valid).toBe(false);
    expect(result.code).toBe('REQUIRED_FIELD');
  });

  test('validateEnum rejects mismatched value', () => {
    const result = validator.validateEnum('invalid', ['01: Nghị quyết', '02: Quyết định'], 'Tên loại văn bản');
    expect(result.valid).toBe(false);
    expect(result.code).toBe('ENUM_MISMATCH');
  });
});
```

### Integration Tests (Jest + Supertest)
- **Coverage:** API endpoints, end-to-end workflows
- **Pattern:** Test HTTP requests and responses

```javascript
describe('POST /api/validate', () => {
  test('returns validation errors for invalid data', async () => {
    const response = await request(app)
      .post('/api/validate')
      .send({ excelData: { /* invalid */ } });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });
});
```

### Test Data
- Store sample Excel files in `tests/fixtures/`
- Store expected validation results in `tests/fixtures/expected-errors.json`
- Use real archive data (sanitized) for integration tests

---

## Git & Commit Standards

### Branch Naming
- **Feature:** `feature/upload-validator`
- **Bug:** `fix/excel-parse-edge-case`
- **Chore:** `chore/update-dependencies`
- **Docs:** `docs/add-architecture-guide`

### Commit Messages (Conventional Commits)

Format: `<type>(<scope>): <subject>`

```
feat(validation): add cross-sheet document count validation
fix(excel-parser): handle Excel serial dates correctly
docs(readme): add quick start Docker instructions
refactor(workflow): extract state machine into separate service
test(validator): add enum matching edge cases
chore(deps): upgrade mongoose to 8.0
```

**Rules:**
- 50 chars or less for subject
- No period at end of subject
- Use imperative mood ("add" not "added" or "adds")
- Reference issues: `fix(parser): handle null values (closes #42)`

### Pre-Commit Checklist
- [ ] Code compiles without errors
- [ ] Unit tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] No console.log() in production code
- [ ] No secrets in commit (API keys, tokens)

---

## Security Standards

### Input Validation
- **All user input** validated before processing
- **No hardcoded secrets** — use `.env` file (excluded from git)
- **SQL injection prevention:** Mongoose ODM (parameterized queries by default)
- **XSS prevention:** React escapes by default; use `dangerouslySetInnerHTML` only after sanitization (DOMPurify)
- **CORS:** Whitelist trusted origins in `.env`

### Authentication & Authorization
- **JWT:** Signed with secret, 8-hour expiry
- **Password:** Bcrypt with salt rounds 10
- **RBAC:** Enforced on every endpoint before logic execution
- **No role in URL:** Role checked from JWT only, never from query params

### Sensitive Data Handling
- **Logging:** Never log passwords, PII, tokens
- **Storage:** MinIO buckets (not filesystem)
- **Transmission:** HTTPS only (configured in nginx)
- **Audit trail:** Immutable; no PII in logs

---

## Naming Conventions for Domain Terms

Always use Vietnamese archival terminology as-is:
- `hồ sơ` (dossier) → field name: `hoSo`, variable: `hoSoData`
- `văn bản` (document) → field name: `vanBan`, variable: `vanBanList`
- `Mã hồ sơ` → DB field: `maHoSo`
- `Mã lưu trữ` → DB field: `maLuuTru`
- `Tên loại văn bản` → DB field: `tenLoaiVanBan`
- Enum values: **exact strings as per TT05**, e.g., `"01: Nghị quyết"`

---

## Code Comments

### When to Comment
- **Why** (not what) — explain design decisions, edge cases, non-obvious logic
- **Domain knowledge** — reference TT05 rules, archival standards
- **TODO/FIXME:** `// TODO: support multi-version TT05 schemas`
- **Complex algorithms:** step-by-step walkthrough

### Example
```javascript
// TT05 requires EXACT enum string match (no trim, no diacritics folding).
// "01: Nghị quyết" ≠ "01-Nghị quyết" ≠ "01: Nghị quyết " (note space)
function validateEnumStrict(value, allowedValues) {
  return allowedValues.includes(value);
}
```

---

## Database (MongoDB) Conventions

### Collection Names
- Plural, lowercase, kebab-case: `audit-logs`, `dossiers`, `users`

### Document Field Names
- camelCase: `maHoSo`, `tenLoaiVanBan`, `createdAt`
- Reserved fields: `_id`, `createdAt`, `updatedAt` (Mongoose default)

### Indexes
```javascript
// Create indexes for frequent queries
auditLogSchema.index({ dossierID: 1, timestamp: -1 });
userSchema.index({ email: 1 }, { unique: true });
```

### Validation Schema Example
```javascript
const hoSoSchema = new Schema({
  maHoSo: { type: String, required: true, unique: true },
  tieuDe: { type: String, required: true },
  thoiHanBaoQuan: { type: String, required: true, enum: ['Vĩnh viễn', '10 năm', ...] },
  thoiGianBatDau: { type: Date, required: true },
  thoiGianKetThuc: { type: Date, required: true },
  tongSoTaiLieu: { type: Number, required: true, min: 1 },
  mucDoTinCay: { type: String, required: true, enum: ['01', '02', '03'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

---

## Performance & Scalability

### API Response Time Targets
- Validate 1000-row Excel: <2 seconds
- Generate SIP (100 pages): <30 seconds
- Dashboard load: <1 second
- File upload (50MB): <5 seconds

### Database Query Optimization
- Index all frequently queried fields
- Use MongoDB aggregation pipeline for stats
- Pagination for large result sets (limit 100 per page)
- Avoid N+1 queries; batch operations where possible

### Frontend Performance
- Code split React components (lazy load routes)
- Memoize expensive computations
- Virtual scrolling for large Excel grids (>1000 rows)
- Debounce real-time validation (300ms delay)

---

## Logging

### Log Levels
- **DEBUG:** Development only; detailed variable state
- **INFO:** Normal operations; state transitions, user actions
- **WARN:** Recoverable issues; missing optional fields, retries
- **ERROR:** Actionable issues; validation failures, failed uploads
- **FATAL:** System failure; database down, unhandled exception

### Logging Framework (Planned: Winston)
```javascript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Usage:
logger.info('Validation started', { dossierID, userId });
logger.error('Validation failed', { dossierID, error: err.message });
```

### No Sensitive Data in Logs
- ❌ `logger.info('User password:', password)`
- ✅ `logger.info('User authenticated', { userID })`
- ❌ `logger.info('MinIO key:', process.env.MINIO_ACCESS_KEY)`
- ✅ `logger.info('MinIO connected')`

---

## Documentation

### Code Documentation
- **README.md:** Project overview + quick start (300 LOC max)
- **API.md:** Endpoint specs, request/response examples
- **ARCHITECTURE.md:** Diagrams, component interaction
- **DEPLOYMENT.md:** Docker, environment setup

### JSDoc Comments (for exported functions)
```javascript
/**
 * Validates Excel data against TT05 standard.
 * @param {Object} excelData - Parsed Excel sheets { HoSo, VanBan }
 * @param {string} tt05Version - Schema version e.g., '2025'
 * @returns {Object} { valid: boolean, errors: Array }
 * @throws {ValidationError} if schema not found
 */
function validateExcel(excelData, tt05Version = '2025') { ... }
```

---

## See Also

- **Requirements:** `/docs/requirements.md` (source of truth for features)
- **Architecture:** `/docs/system-architecture.md` (system design)
- **Roadmap:** `/docs/project-roadmap.md` (phases and timeline)
