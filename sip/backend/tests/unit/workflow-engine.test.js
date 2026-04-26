/**
 * Unit tests for workflow-engine.js state machine.
 * Uses in-memory MongoDB — no mocking.
 */
const { startDb, stopDb, clearDb } = require('../helpers/test-setup');
const Dossier = require('../../src/models/dossier-model');
const { transition, canTransition } = require('../../src/services/workflow-engine');
const { DOSSIER_STATES } = require('../../src/utils/constants');

beforeAll(startDb);
afterEach(clearDb);
afterAll(stopDb);

async function makeDossier(state = DOSSIER_STATES.UPLOAD, extra = {}) {
  return Dossier.create({
    state,
    uploadedBy: 'test@test.com',
    ...extra,
  });
}

describe('canTransition', () => {
  test('allows UPLOAD → VALIDATING', () => {
    expect(canTransition(DOSSIER_STATES.UPLOAD, DOSSIER_STATES.VALIDATING)).toBe(true);
  });

  test('allows PACKAGING → DONE', () => {
    expect(canTransition(DOSSIER_STATES.PACKAGING, DOSSIER_STATES.DONE)).toBe(true);
  });

  test('allows PACKAGING → APPROVED (revert on failure)', () => {
    expect(canTransition(DOSSIER_STATES.PACKAGING, DOSSIER_STATES.APPROVED)).toBe(true);
  });

  test('rejects skipping states UPLOAD → APPROVED', () => {
    expect(canTransition(DOSSIER_STATES.UPLOAD, DOSSIER_STATES.APPROVED)).toBe(false);
  });

  test('rejects transitions from terminal DONE', () => {
    expect(canTransition(DOSSIER_STATES.DONE, DOSSIER_STATES.UPLOAD)).toBe(false);
  });
});

describe('transition()', () => {
  test('transitions UPLOAD → VALIDATING atomically', async () => {
    const d = await makeDossier(DOSSIER_STATES.UPLOAD);
    const updated = await transition(d._id, DOSSIER_STATES.VALIDATING, null);
    expect(updated.state).toBe(DOSSIER_STATES.VALIDATING);

    const fresh = await Dossier.findById(d._id);
    expect(fresh.state).toBe(DOSSIER_STATES.VALIDATING);
  });

  test('transitions VALIDATED → APPROVED when no errors', async () => {
    const d = await makeDossier(DOSSIER_STATES.VALIDATED, {
      validationResult: { errorCount: 0, valid: true },
    });
    const updated = await transition(d._id, DOSSIER_STATES.APPROVED, { email: 'approver@test.com', role: 'Approver' });
    expect(updated.state).toBe(DOSSIER_STATES.APPROVED);
  });

  test('blocks VALIDATED → APPROVED when errors exist', async () => {
    const d = await makeDossier(DOSSIER_STATES.VALIDATED, {
      validationResult: { errorCount: 3, valid: false },
    });
    await expect(
      transition(d._id, DOSSIER_STATES.APPROVED, { email: 'approver@test.com', role: 'Approver' })
    ).rejects.toThrow(/lỗi nghiêm trọng/);
  });

  test('blocks transition with wrong role', async () => {
    const d = await makeDossier(DOSSIER_STATES.VALIDATED, {
      validationResult: { errorCount: 0, valid: true },
    });
    await expect(
      transition(d._id, DOSSIER_STATES.APPROVED, { email: 'op@test.com', role: 'Auditor' })
    ).rejects.toThrow(/quyền/);
  });

  test('blocks invalid transition DONE → UPLOAD', async () => {
    const d = await makeDossier(DOSSIER_STATES.DONE);
    await expect(
      transition(d._id, DOSSIER_STATES.UPLOAD, null)
    ).rejects.toThrow(/Không thể chuyển/);
  });

  test('handles race condition — concurrent transitions, loser gets race error', async () => {
    const d = await makeDossier(DOSSIER_STATES.UPLOAD);
    // Fire two concurrent transitions: both read UPLOAD, only one atomic write wins
    const [r1, r2] = await Promise.allSettled([
      transition(d._id, DOSSIER_STATES.VALIDATING, null),
      transition(d._id, DOSSIER_STATES.VALIDATING, null),
    ]);

    const successes = [r1, r2].filter((r) => r.status === 'fulfilled');
    const failures  = [r1, r2].filter((r) => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].reason.message).toMatch(/Trạng thái hồ sơ vừa thay đổi/);
  });

  test('sets extra fields on transition', async () => {
    const d = await makeDossier(DOSSIER_STATES.VALIDATED, {
      validationResult: { errorCount: 0 },
    });
    const updated = await transition(d._id, DOSSIER_STATES.APPROVED, { email: 'a@a.com', role: 'Approver' }, {
      approvedBy: 'a@a.com',
      approvedAt: new Date('2026-01-01'),
    });
    expect(updated.approvedBy).toBe('a@a.com');
  });
});
