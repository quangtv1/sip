/**
 * Integration tests for /api/auth routes.
 * Uses real Express app + in-memory MongoDB (no mocking).
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { startDb, stopDb, clearDb } = require('../helpers/test-setup');
const { authHeader } = require('../helpers/test-auth-helper');
const User = require('../../src/models/user-model');
const app = require('../../src/app');

beforeAll(startDb);
afterEach(clearDb);
afterAll(stopDb);

async function seedUser(overrides = {}) {
  const hash = await bcrypt.hash('Password1!', 10);
  return User.create({
    email: 'user@test.com',
    passwordHash: hash,
    fullName: 'Test User',
    role: 'Admin',
    active: true,
    ...overrides,
  });
}

describe('POST /api/auth/login', () => {
  test('returns token on valid credentials', async () => {
    await seedUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'Password1!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('user@test.com');
    expect(res.body.data.user.role).toBe('Admin');
  });

  test('rejects invalid password', async () => {
    await seedUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('rejects unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'Password1!' });

    expect(res.status).toBe(401);
  });

  test('rejects locked account', async () => {
    await seedUser({ active: false });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'Password1!' });

    expect(res.status).toBe(401);
  });

  test('rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/logout', () => {
  test('succeeds with valid token', async () => {
    await seedUser();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'Password1!' });

    const token = loginRes.body.data.token;
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('rejects unauthenticated request', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/auth/password', () => {
  test('changes password successfully', async () => {
    await seedUser();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'Password1!' });

    const token = loginRes.body.data.token;
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: 'Password1!', newPassword: 'NewPassword2!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Old password should no longer work
    const again = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'Password1!' });
    expect(again.status).toBe(401);
  });

  test('rejects wrong old password', async () => {
    await seedUser();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'Password1!' });

    const token = loginRes.body.data.token;
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: 'WrongOld!', newPassword: 'NewPassword2!' });

    expect(res.status).toBe(401);
  });

  test('rejects new password shorter than 8 chars', async () => {
    await seedUser();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'Password1!' });

    const token = loginRes.body.data.token;
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: 'Password1!', newPassword: 'short' });

    expect(res.status).toBe(400);
  });
});
