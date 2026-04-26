/**
 * Generates signed JWT tokens for use in integration tests.
 * Uses the same JWT_SECRET and payload shape as auth-service.js.
 */
const jwt = require('jsonwebtoken');

const TEST_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-tests-only';

function makeToken(payload = {}) {
  return jwt.sign(
    {
      email: 'test@example.com',
      role: 'Admin',
      fullName: 'Test User',
      ...payload,
    },
    TEST_SECRET,
    { expiresIn: '1h' }
  );
}

const tokens = {
  admin:    makeToken({ email: 'admin@test.com',    role: 'Admin' }),
  operator: makeToken({ email: 'operator@test.com', role: 'Operator' }),
  approver: makeToken({ email: 'approver@test.com', role: 'Approver' }),
  auditor:  makeToken({ email: 'auditor@test.com',  role: 'Auditor' }),
};

function authHeader(role = 'admin') {
  return { Authorization: `Bearer ${tokens[role] || tokens.admin}` };
}

module.exports = { makeToken, tokens, authHeader };
