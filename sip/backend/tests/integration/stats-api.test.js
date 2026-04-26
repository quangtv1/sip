/**
 * Integration tests for /api/stats (dashboard) routes.
 * Verifies aggregation returns correct counts after seeding test data.
 */
const request = require('supertest');
const { startDb, stopDb, clearDb } = require('../helpers/test-setup');
const { makeToken } = require('../helpers/test-auth-helper');
const Dossier = require('../../src/models/dossier-model');
const { DOSSIER_STATES } = require('../../src/utils/constants');
const app = require('../../src/app');

beforeAll(startDb);
afterEach(clearDb);
afterAll(stopDb);

function auth(role = 'Admin') {
  return { Authorization: `Bearer ${makeToken({ role })}` };
}

async function seedDossiers() {
  await Dossier.insertMany([
    { state: DOSSIER_STATES.DONE,      uploadedBy: 'op@test.com', maHoSo: 'HS001' },
    { state: DOSSIER_STATES.DONE,      uploadedBy: 'op@test.com', maHoSo: 'HS002' },
    { state: DOSSIER_STATES.APPROVED,  uploadedBy: 'op@test.com', maHoSo: 'HS003' },
    { state: DOSSIER_STATES.VALIDATED, uploadedBy: 'op@test.com', maHoSo: 'HS004' },
    { state: DOSSIER_STATES.UPLOAD,    uploadedBy: 'op@test.com', maHoSo: 'HS005' },
  ]);
}

describe('GET /api/stats', () => {
  test('Admin receives KPIs with correct total count', async () => {
    await seedDossiers();
    const res = await request(app)
      .get('/api/stats')
      .set(auth('Admin'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.kpis.total).toBe(5);
    expect(res.body.data.kpis.done).toBe(2);
    expect(Array.isArray(res.body.data.errorTrend)).toBe(true);
    // stateDistribution is a { STATE: count } object (not array)
    expect(typeof res.body.data.stateDistribution).toBe('object');
  });

  test('Auditor can access stats', async () => {
    const res = await request(app)
      .get('/api/stats')
      .set(auth('Auditor'));

    expect(res.status).toBe(200);
  });

  test('Operator can access stats', async () => {
    const res = await request(app)
      .get('/api/stats')
      .set(auth('Operator'));

    expect(res.status).toBe(200);
  });

  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(401);
  });

  test('response contains stateDistribution entries', async () => {
    await seedDossiers();
    const res = await request(app)
      .get('/api/stats')
      .set(auth('Admin'));

    expect(res.status).toBe(200);
    // stateDistribution = { DONE: 2, UPLOAD: 1, ... }
    const dist = res.body.data.stateDistribution;
    expect(dist[DOSSIER_STATES.DONE]).toBe(2);
    expect(dist[DOSSIER_STATES.UPLOAD]).toBe(1);
  });
});

describe('GET /api/stats/sip/tree — path traversal guard', () => {
  test('rejects path traversal in objectPath', async () => {
    const res = await request(app)
      .get('/api/stats/sip/tree?path=../../etc/passwd')
      .set(auth('Admin'));

    expect(res.status).toBe(400);
  });

  test('rejects missing path param', async () => {
    const res = await request(app)
      .get('/api/stats/sip/tree')
      .set(auth('Admin'));

    expect(res.status).toBe(400);
  });

  test('Operator cannot access SIP tree (RBAC)', async () => {
    const res = await request(app)
      .get('/api/stats/sip/tree?path=sip/test.zip')
      .set(auth('Operator'));

    expect(res.status).toBe(403);
  });
});
