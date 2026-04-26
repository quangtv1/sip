/**
 * Integration tests for dossier workflow transitions via API.
 * Tests: approve, reject, RBAC enforcement.
 * Uses real Express app + in-memory MongoDB.
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { startDb, stopDb, clearDb } = require('../helpers/test-setup');
const { makeToken } = require('../helpers/test-auth-helper');
const User = require('../../src/models/user-model');
const Dossier = require('../../src/models/dossier-model');
const { DOSSIER_STATES } = require('../../src/utils/constants');
const app = require('../../src/app');

beforeAll(startDb);
afterEach(clearDb);
afterAll(stopDb);

async function seedUser(role = 'Admin', email = null) {
  const hash = await bcrypt.hash('Password1!', 10);
  const e = email || `${role.toLowerCase()}@test.com`;
  return User.create({ email: e, passwordHash: hash, fullName: role, role, active: true });
}

async function makeDossier(state = DOSSIER_STATES.UPLOAD, extra = {}) {
  return Dossier.create({
    state,
    uploadedBy: 'operator@test.com',
    maHoSo: 'H49.61.8.2017',
    ...extra,
  });
}

function auth(role) {
  return { Authorization: `Bearer ${makeToken({ role, email: `${role.toLowerCase()}@test.com` })}` };
}

describe('POST /api/dossiers/:id/approve', () => {
  test('approver can approve VALIDATED dossier with no errors', async () => {
    const d = await makeDossier(DOSSIER_STATES.VALIDATED, {
      validationResult: { errorCount: 0, valid: true },
    });
    await seedUser('Approver');

    const res = await request(app)
      .post(`/api/dossiers/${d._id}/approve`)
      .set(auth('Approver'));

    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe(DOSSIER_STATES.APPROVED);
  });

  test('blocks approval when dossier has errors', async () => {
    const d = await makeDossier(DOSSIER_STATES.VALIDATED, {
      validationResult: { errorCount: 5, valid: false },
    });

    const res = await request(app)
      .post(`/api/dossiers/${d._id}/approve`)
      .set(auth('Approver'));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('Operator cannot approve (RBAC)', async () => {
    const d = await makeDossier(DOSSIER_STATES.VALIDATED, {
      validationResult: { errorCount: 0, valid: true },
    });

    const res = await request(app)
      .post(`/api/dossiers/${d._id}/approve`)
      .set(auth('Operator'));

    expect(res.status).toBe(403);
  });

  test('Auditor cannot approve (RBAC)', async () => {
    const d = await makeDossier(DOSSIER_STATES.VALIDATED, {
      validationResult: { errorCount: 0, valid: true },
    });

    const res = await request(app)
      .post(`/api/dossiers/${d._id}/approve`)
      .set(auth('Auditor'));

    expect(res.status).toBe(403);
  });

  test('returns 404 for nonexistent dossier', async () => {
    const fakeId = '000000000000000000000001';
    const res = await request(app)
      .post(`/api/dossiers/${fakeId}/approve`)
      .set(auth('Approver'));

    expect(res.status).toBe(404);
  });

  test('blocks approval when dossier is not in VALIDATED state', async () => {
    const d = await makeDossier(DOSSIER_STATES.UPLOAD);

    const res = await request(app)
      .post(`/api/dossiers/${d._id}/approve`)
      .set(auth('Approver'));

    expect(res.status).toBe(400);
  });

  test('unauthenticated request returns 401', async () => {
    const d = await makeDossier(DOSSIER_STATES.VALIDATED);
    const res = await request(app).post(`/api/dossiers/${d._id}/approve`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/dossiers/:id/reject', () => {
  test('approver can reject VALIDATED dossier with reason', async () => {
    const d = await makeDossier(DOSSIER_STATES.VALIDATED, {
      validationResult: { errorCount: 0, valid: true },
    });

    const res = await request(app)
      .post(`/api/dossiers/${d._id}/reject`)
      .set(auth('Approver'))
      .send({ reason: 'Hồ sơ thiếu tài liệu bắt buộc' });

    expect(res.status).toBe(200);
    // Auto-reverts back to UPLOAD
    expect(res.body.data.state).toBe(DOSSIER_STATES.UPLOAD);
  });

  test('rejects with reason shorter than 10 chars', async () => {
    const d = await makeDossier(DOSSIER_STATES.VALIDATED);

    const res = await request(app)
      .post(`/api/dossiers/${d._id}/reject`)
      .set(auth('Approver'))
      .send({ reason: 'short' });

    expect(res.status).toBe(400);
  });

  test('rejects without reason body', async () => {
    const d = await makeDossier(DOSSIER_STATES.VALIDATED);

    const res = await request(app)
      .post(`/api/dossiers/${d._id}/reject`)
      .set(auth('Approver'))
      .send({});

    expect(res.status).toBe(400);
  });

  test('Operator cannot reject (RBAC)', async () => {
    const d = await makeDossier(DOSSIER_STATES.VALIDATED);

    const res = await request(app)
      .post(`/api/dossiers/${d._id}/reject`)
      .set(auth('Operator'))
      .send({ reason: 'Lý do từ chối hồ sơ đầy đủ' });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/dossiers', () => {
  test('Admin sees all dossiers', async () => {
    await makeDossier(DOSSIER_STATES.UPLOAD, { uploadedBy: 'op1@test.com' });
    await makeDossier(DOSSIER_STATES.VALIDATED, { uploadedBy: 'op2@test.com' });

    const res = await request(app)
      .get('/api/dossiers')
      .set(auth('Admin'));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
  });

  test('Operator sees only own dossiers', async () => {
    await makeDossier(DOSSIER_STATES.UPLOAD, { uploadedBy: 'operator@test.com' });
    await makeDossier(DOSSIER_STATES.UPLOAD, { uploadedBy: 'other@test.com' });

    const res = await request(app)
      .get('/api/dossiers')
      .set(auth('Operator'));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].uploadedBy).toBe('operator@test.com');
  });

  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/dossiers');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/dossiers/:id', () => {
  test('returns full dossier detail for Admin', async () => {
    const d = await makeDossier(DOSSIER_STATES.VALIDATED, {
      hoSoRow: { maHoSo: 'H49.61.8.2017' },
    });

    const res = await request(app)
      .get(`/api/dossiers/${d._id}`)
      .set(auth('Admin'));

    expect(res.status).toBe(200);
    expect(res.body.data.dossierId).toBe(String(d._id));
    expect(res.body.data.state).toBe(DOSSIER_STATES.VALIDATED);
  });

  test('Operator cannot access other user dossier', async () => {
    const d = await makeDossier(DOSSIER_STATES.UPLOAD, { uploadedBy: 'other@test.com' });

    const res = await request(app)
      .get(`/api/dossiers/${d._id}`)
      .set(auth('Operator'));

    expect(res.status).toBe(404);
  });

  test('returns 404 for nonexistent dossier', async () => {
    const res = await request(app)
      .get('/api/dossiers/000000000000000000000001')
      .set(auth('Admin'));

    expect(res.status).toBe(404);
  });
});
