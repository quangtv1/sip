/**
 * Dashboard stats service.
 * Provides aggregated metrics from Dossier and AuditLog collections.
 * Results cached in-memory for 30 seconds to reduce DB load.
 */
const Dossier = require('../models/dossier-model');
const AuditLog = require('../models/audit-log-model');

// Simple in-memory cache: key → { data, expiresAt }
const cache = new Map();
const CACHE_TTL_MS = 30_000;

function fromCache(key) {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  cache.delete(key);
  return null;
}

function toCache(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Return top-level KPIs.
 * @returns {{ total, done, pending, errorTotal, successRate }}
 */
async function getKpis() {
  const cacheKey = 'kpis';
  const cached = fromCache(cacheKey);
  if (cached) return cached;

  const [stateCounts, errorSum] = await Promise.all([
    Dossier.aggregate([
      { $group: { _id: '$state', count: { $sum: 1 } } },
    ]),
    Dossier.aggregate([
      { $group: { _id: null, total: { $sum: '$validationResult.errorCount' } } },
    ]),
  ]);

  const byState = {};
  for (const { _id, count } of stateCounts) byState[_id] = count;
  const total = Object.values(byState).reduce((a, b) => a + b, 0);
  const done = byState['DONE'] || 0;
  const pending = (byState['VALIDATED'] || 0) + (byState['APPROVED'] || 0);
  const errorTotal = errorSum[0]?.total || 0;
  const successRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const result = { total, done, pending, errorTotal, successRate, byState };
  toCache(cacheKey, result);
  return result;
}

/**
 * Return error count grouped by month for the last N months.
 * @param {number} months - lookback window (default 12)
 * @returns {Array<{ month: string, errorCount: number }>}
 */
async function getErrorTrend(months = 12) {
  const cacheKey = `trend:${months}`;
  const cached = fromCache(cacheKey);
  if (cached) return cached;

  // Set day-of-month to 1 BEFORE subtracting months to avoid overflow (e.g. Jan 31 - 1 month = Mar 2)
  const from = new Date();
  from.setDate(1);
  from.setMonth(from.getMonth() - months);
  from.setHours(0, 0, 0, 0);

  const rows = await AuditLog.aggregate([
    { $match: { action: 'UPLOAD', timestamp: { $gte: from } } },
    {
      $group: {
        _id: {
          year:  { $year:  '$timestamp' },
          month: { $month: '$timestamp' },
        },
        errorCount: { $sum: '$errorCount' },
        uploads:    { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const result = rows.map((r) => ({
    month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
    errorCount: r.errorCount,
    uploads: r.uploads,
  }));

  toCache(cacheKey, result);
  return result;
}

/**
 * Return top N fields by error frequency across all dossiers.
 * @param {number} limit
 * @returns {Array<{ field: string, count: number }>}
 */
async function getTopErrorFields(limit = 10) {
  const cacheKey = `topFields:${limit}`;
  const cached = fromCache(cacheKey);
  if (cached) return cached;

  const rows = await Dossier.aggregate([
    { $match: { 'validationResult.errors.0': { $exists: true } } },
    { $unwind: '$validationResult.errors' },
    { $match: { 'validationResult.errors.severity': 'ERROR' } },
    {
      $group: {
        _id: '$validationResult.errors.field',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  const result = rows.map((r) => ({ field: r._id || '(unknown)', count: r.count }));
  toCache(cacheKey, result);
  return result;
}

/**
 * Return dossier count broken down by state (for distribution chart).
 */
async function getStateDistribution() {
  const kpis = await getKpis();
  return kpis.byState;
}

module.exports = { getKpis, getErrorTrend, getTopErrorFields, getStateDistribution };
