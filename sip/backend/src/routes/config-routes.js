/**
 * Admin-only configuration routes:
 *   GET    /api/config/minio                  — MinIO config (secretKey masked)
 *   POST   /api/config/minio                  — update, test, hot-reload MinIO client
 *   GET    /api/config/enums                  — all 8 enum definitions
 *   GET    /api/config/enums/:name            — one enum
 *   PUT    /api/config/enums/:name            — update enum values, invalidate cache
 *   GET    /api/config/schema/:sheet          — field schema (Ho_so | Van_ban)
 *   PUT    /api/config/schema/:sheet          — update schema, invalidate cache
 *   POST   /api/config/schema/:sheet/reset    — revert to hardcoded
 *   GET    /api/config/profiles               — list all profiles
 *   POST   /api/config/profiles               — create profile
 *   GET    /api/config/profiles/:id           — get one profile
 *   PUT    /api/config/profiles/:id           — update profile
 *   DELETE /api/config/profiles/:id           — delete (reject if active)
 *   GET    /api/config/active-profile         — current active profile
 *   PUT    /api/config/active-profile         — set active profile
 */
const express = require('express');
const authMiddleware = require('../middleware/auth-middleware');
const { requireRole } = require('../middleware/rbac-middleware');
const { ROLES } = require('../utils/constants');
const { ValidationError } = require('../utils/app-error');
const AppConfig = require('../models/app-config-model');
const minioStorageService = require('../services/minio-storage-service');
const schemaCacheService = require('../services/schema-cache-service');
const { ENUM_NAMES, ENUM_DISPLAY_NAMES } = require('../validators/enum-definitions');
const { validateSchemaPayload } = require('../utils/schema-payload-validator');
const Minio = require('minio');
const config = require('../config/index');

const router = express.Router();
router.use(authMiddleware, requireRole(ROLES.ADMIN));

// ── MinIO ────────────────────────────────────────────────────────────────────

router.get('/minio', async (req, res, next) => {
  try {
    const stored = await AppConfig.findOne({ key: 'minio' }).lean();
    const v = stored?.value || {};
    res.json({
      success: true,
      data: {
        endpoint:  v.endpoint  || config.MINIO_ENDPOINT,
        port:      v.port      || config.MINIO_PORT,
        useSSL:    v.useSSL    ?? config.MINIO_USE_SSL,
        accessKey: v.accessKey || config.MINIO_ACCESS_KEY,
        secretKey: '***',
      },
    });
  } catch (err) { next(err); }
});

router.post('/minio', async (req, res, next) => {
  try {
    const { endpoint, port, useSSL, accessKey, secretKey } = req.body;
    if (!endpoint || !accessKey || !secretKey) {
      return next(new ValidationError('endpoint, accessKey, secretKey là bắt buộc'));
    }
    const testClient = new Minio.Client({
      endPoint: endpoint, port: parseInt(port, 10) || 9000,
      useSSL: !!useSSL, accessKey, secretKey,
    });
    try {
      await testClient.listBuckets();
    } catch (connErr) {
      return next(new ValidationError(`Không thể kết nối MinIO: ${connErr.message}`));
    }
    await AppConfig.findOneAndUpdate(
      { key: 'minio' },
      { $set: { value: { endpoint, port: parseInt(port, 10) || 9000, useSSL: !!useSSL, accessKey, secretKey } } },
      { upsert: true }
    );
    await minioStorageService.reloadConfig();
    await minioStorageService.ensureBuckets();
    res.json({ success: true, data: { message: 'Cấu hình MinIO đã được cập nhật và kết nối thành công' } });
  } catch (err) { next(err); }
});

// ── Enums ────────────────────────────────────────────────────────────────────

const CUSTOM_ENUM_NAME_RE = /^[A-Z][A-Z0-9_]{1,29}$/;

router.get('/enums', async (req, res, next) => {
  try {
    const data = {};
    // Hardcoded system enums
    for (const name of ENUM_NAMES) {
      data[name] = {
        displayName: ENUM_DISPLAY_NAMES[name],
        values: await schemaCacheService.getEnum(name),
        builtin: true,
      };
    }
    // Custom enums stored in DB
    const metas = await AppConfig.find({ key: /^enum-meta:/ }).lean();
    for (const meta of metas) {
      const name = meta.key.replace('enum-meta:', '');
      if (!data[name]) {
        data[name] = {
          displayName: meta.value?.displayName || name,
          values: await schemaCacheService.getEnum(name),
          builtin: false,
        };
      }
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/enums/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    const isBuiltin = ENUM_NAMES.includes(name);
    if (!isBuiltin) {
      const meta = await AppConfig.findOne({ key: `enum-meta:${name}` }).lean();
      if (!meta) return next(new ValidationError(`Enum "${name}" không tồn tại`));
    }
    const values      = await schemaCacheService.getEnum(name);
    const displayName = isBuiltin ? ENUM_DISPLAY_NAMES[name]
      : (await AppConfig.findOne({ key: `enum-meta:${name}` }).lean())?.value?.displayName || name;
    res.json({ success: true, data: { name, displayName, builtin: isBuiltin, values } });
  } catch (err) { next(err); }
});

router.post('/enums', async (req, res, next) => {
  try {
    const { name, displayName, values = [] } = req.body;
    if (!name || !CUSTOM_ENUM_NAME_RE.test(name))
      return next(new ValidationError('name phải IN_HOA, 2-30 ký tự, chỉ gồm A-Z, 0-9, _'));
    if (ENUM_NAMES.includes(name))
      return next(new ValidationError(`"${name}" là enum hệ thống, không thể tạo lại`));
    if (!displayName?.trim())
      return next(new ValidationError('displayName là bắt buộc'));
    const exists = await AppConfig.findOne({ key: `enum-meta:${name}` }).lean();
    if (exists) return next(new ValidationError(`Enum "${name}" đã tồn tại`));

    await AppConfig.findOneAndUpdate(
      { key: `enum-meta:${name}` },
      { $set: { value: { displayName: displayName.trim() } } },
      { upsert: true }
    );
    const validValues = Array.isArray(values) ? values.map(v => v.trim()).filter(Boolean) : [];
    if (validValues.length > 0) {
      await AppConfig.findOneAndUpdate(
        { key: `enum:${name}` }, { $set: { value: validValues } }, { upsert: true }
      );
    }
    schemaCacheService.invalidateAll();
    res.status(201).json({ success: true, data: { name, displayName: displayName.trim(), builtin: false, values: validValues } });
  } catch (err) { next(err); }
});

router.put('/enums/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    const isBuiltin = ENUM_NAMES.includes(name);
    if (!isBuiltin) {
      const meta = await AppConfig.findOne({ key: `enum-meta:${name}` }).lean();
      if (!meta) return next(new ValidationError(`Enum "${name}" không tồn tại`));
    }
    const { values, displayName } = req.body;
    if (!Array.isArray(values) || values.length === 0)
      return next(new ValidationError('values phải là mảng không rỗng'));
    if (values.some(v => typeof v !== 'string' || v.trim() === ''))
      return next(new ValidationError('Mỗi giá trị trong values phải là chuỗi không rỗng'));

    await AppConfig.findOneAndUpdate(
      { key: `enum:${name}` }, { $set: { value: values } }, { upsert: true }
    );
    // Update displayName for custom enums
    if (!isBuiltin && displayName?.trim()) {
      await AppConfig.findOneAndUpdate(
        { key: `enum-meta:${name}` },
        { $set: { value: { displayName: displayName.trim() } } },
        { upsert: true }
      );
    }
    schemaCacheService.invalidateAll();
    res.json({ success: true, data: { name, values } });
  } catch (err) { next(err); }
});

router.delete('/enums/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    if (ENUM_NAMES.includes(name))
      return next(new ValidationError(`Không thể xóa enum hệ thống "${name}"`));
    await AppConfig.deleteMany({ key: { $in: [`enum-meta:${name}`, `enum:${name}`] } });
    schemaCacheService.invalidateAll();
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Schemas (legacy routes — operate on active profile) ───────────────────────

router.get('/schema/:sheet', async (req, res, next) => {
  try {
    const { sheet } = req.params;
    if (!schemaCacheService.VALID_SHEETS.includes(sheet)) {
      return next(new ValidationError('sheet phải là "Ho_so" hoặc "Van_ban"'));
    }
    const profileId = await schemaCacheService.getActiveProfileId();
    const fields    = await schemaCacheService.getSchema(profileId, sheet);
    res.json({ success: true, data: { sheet, fields } });
  } catch (err) { next(err); }
});

router.put('/schema/:sheet', async (req, res, next) => {
  try {
    const { sheet } = req.params;
    if (!schemaCacheService.VALID_SHEETS.includes(sheet)) {
      return next(new ValidationError('sheet phải là "Ho_so" hoặc "Van_ban"'));
    }
    const { fields } = req.body;
    const errs = validateSchemaPayload(fields);
    if (errs.length > 0) {
      return next(new ValidationError(`Schema không hợp lệ: ${errs.join('; ')}`));
    }
    const profileId = await schemaCacheService.getActiveProfileId();
    // Strip enumValues and regex — these are derived at runtime
    const toStore = fields.map(({ enumValues, regex, ...rest }) => rest); // eslint-disable-line no-unused-vars
    await AppConfig.findOneAndUpdate(
      { key: `schema:${profileId}:${sheet}` },
      { $set: { value: toStore } },
      { upsert: true }
    );
    schemaCacheService.invalidateSchema(profileId, sheet);
    res.json({ success: true, data: { sheet, fields: toStore } });
  } catch (err) { next(err); }
});

router.post('/schema/:sheet/reset', async (req, res, next) => {
  try {
    const { sheet } = req.params;
    if (!schemaCacheService.VALID_SHEETS.includes(sheet)) {
      return next(new ValidationError('sheet phải là "Ho_so" hoặc "Van_ban"'));
    }
    const profileId = await schemaCacheService.getActiveProfileId();
    await AppConfig.deleteOne({ key: `schema:${profileId}:${sheet}` });
    schemaCacheService.invalidateSchema(profileId, sheet);
    res.json({ success: true, data: { sheet, message: 'Đã khôi phục cấu trúc mặc định' } });
  } catch (err) { next(err); }
});

// ── Profile-scoped schema routes ──────────────────────────────────────────────
// param: actual sheet name (e.g. "Ho_so") OR legacy type ("primary"/"secondary")

async function resolveSheetName(profileId, sheetNameOrType) {
  const profile = await schemaCacheService.getProfile(profileId);
  if (!profile) return null;
  // Legacy backward-compat: accept 'primary' / 'secondary'
  if (sheetNameOrType === 'primary')   return profile.sheets?.[0] || null;
  if (sheetNameOrType === 'secondary') return profile.sheets?.[1] || null;
  // New: actual sheet name — validate it belongs to this profile
  return profile.sheets?.includes(sheetNameOrType) ? sheetNameOrType : null;
}

router.get('/profiles/:id/schema/:sheetType', async (req, res, next) => {
  try {
    const { id, sheetType } = req.params;
    const sheet = await resolveSheetName(id, sheetType);
    if (!sheet) return next(new ValidationError(`Profile "${id}" không tồn tại`));
    const fields = await schemaCacheService.getSchema(id, sheet);
    res.json({ success: true, data: { profileId: id, sheetType, sheet, fields } });
  } catch (err) { next(err); }
});

router.put('/profiles/:id/schema/:sheetType', async (req, res, next) => {
  try {
    const { id, sheetType } = req.params;
    const sheet = await resolveSheetName(id, sheetType);
    if (!sheet) return next(new ValidationError(`Profile "${id}" không tồn tại`));
    const { fields } = req.body;
    const errs = validateSchemaPayload(fields);
    if (errs.length > 0) return next(new ValidationError(`Schema không hợp lệ: ${errs.join('; ')}`));
    const toStore = fields.map(({ enumValues, regex, ...rest }) => rest); // eslint-disable-line no-unused-vars
    await AppConfig.findOneAndUpdate(
      { key: `schema:${id}:${sheet}` },
      { $set: { value: toStore } },
      { upsert: true }
    );
    schemaCacheService.invalidateSchema(id, sheet);
    res.json({ success: true, data: { profileId: id, sheetType, sheet, fields: toStore } });
  } catch (err) { next(err); }
});

router.post('/profiles/:id/schema/:sheetType/reset', async (req, res, next) => {
  try {
    const { id, sheetType } = req.params;
    const sheet = await resolveSheetName(id, sheetType);
    if (!sheet) return next(new ValidationError(`Profile "${id}" không tồn tại`));
    await AppConfig.deleteOne({ key: `schema:${id}:${sheet}` });
    schemaCacheService.invalidateSchema(id, sheet);
    res.json({ success: true, data: { profileId: id, sheetType, sheet, message: 'Đã khôi phục cấu trúc mặc định' } });
  } catch (err) { next(err); }
});

// ── Profiles ──────────────────────────────────────────────────────────────────

const PROFILE_ID_RE = /^[A-Za-z0-9_-]{2,20}$/;

router.get('/profiles', async (req, res, next) => {
  try {
    const docs = await AppConfig.find({ key: /^profile:/ }).lean();
    // getProfile() applies inline migration (primarySheet→sheets[]) automatically
    const profileIds = docs.map(d => d.key.replace('profile:', ''));
    const profiles = await Promise.all(profileIds.map(async id => {
      const p = await schemaCacheService.getProfile(id);
      return { id, ...p };
    }));
    // Always include TT05 default even if not yet saved to DB
    if (!profiles.find(p => p.id === 'TT05')) {
      const def = await schemaCacheService.getProfile('TT05');
      profiles.unshift({ id: 'TT05', ...def });
    }
    res.json({ success: true, data: profiles });
  } catch (err) { next(err); }
});

/** Normalize incoming profile body: accept sheets[] OR legacy primarySheet+secondarySheet */
function normalizeSheets(body) {
  if (Array.isArray(body.sheets)) return body.sheets;  // allow empty array for PUT
  const fallback = [body.primarySheet, body.secondarySheet].filter(Boolean);
  return fallback;
}

router.post('/profiles', async (req, res, next) => {
  try {
    const { id, name, description = '' } = req.body;
    if (!id || !PROFILE_ID_RE.test(id))
      return next(new ValidationError('id phải gồm 2-20 ký tự: A-Z, a-z, 0-9, _, -'));
    if (!name?.trim()) return next(new ValidationError('name là bắt buộc'));
    const sheets = normalizeSheets(req.body);
    if (sheets.length === 0) return next(new ValidationError('Cần ít nhất 1 sheet'));
    const exists = await AppConfig.findOne({ key: `profile:${id}` }).lean();
    if (exists) return next(new ValidationError(`Profile "${id}" đã tồn tại`));
    await AppConfig.findOneAndUpdate(
      { key: `profile:${id}` },
      { $set: { value: { name, sheets, description } } },
      { upsert: true }
    );
    schemaCacheService.invalidateProfiles();
    res.status(201).json({ success: true, data: { id, name, sheets, description } });
  } catch (err) { next(err); }
});

router.get('/profiles/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const profile = await schemaCacheService.getProfile(id);
    if (!profile) return next(new ValidationError(`Profile "${id}" không tồn tại`));
    res.json({ success: true, data: { id, ...profile } });
  } catch (err) { next(err); }
});

router.put('/profiles/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description = '' } = req.body;
    if (!name?.trim()) return next(new ValidationError('name là bắt buộc'));
    const sheets = normalizeSheets(req.body);
    await AppConfig.findOneAndUpdate(
      { key: `profile:${id}` },
      { $set: { value: { name, sheets, description } } },
      { upsert: true }
    );
    schemaCacheService.invalidateProfiles();
    res.json({ success: true, data: { id, name, sheets, description } });
  } catch (err) { next(err); }
});

router.delete('/profiles/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const activeId = await schemaCacheService.getActiveProfileId();
    if (id === activeId) return next(new ValidationError('Không thể xóa profile đang được sử dụng'));
    await AppConfig.deleteOne({ key: `profile:${id}` });
    schemaCacheService.invalidateProfiles();
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/active-profile', async (req, res, next) => {
  try {
    const profileId = await schemaCacheService.getActiveProfileId();
    const profile   = await schemaCacheService.getProfile(profileId);
    res.json({ success: true, data: { profileId, ...profile } });
  } catch (err) { next(err); }
});

router.put('/active-profile', async (req, res, next) => {
  try {
    const { profileId } = req.body;
    if (!profileId) return next(new ValidationError('profileId là bắt buộc'));
    const profile = await schemaCacheService.getProfile(profileId);
    if (!profile) return next(new ValidationError(`Profile "${profileId}" không tồn tại`));
    await AppConfig.findOneAndUpdate(
      { key: 'active_profile' },
      { $set: { value: profileId } },
      { upsert: true }
    );
    schemaCacheService.invalidateAll(); // flush all caches — active profile changed
    res.json({ success: true, data: { profileId } });
  } catch (err) { next(err); }
});

// ── Per-standard enum overrides ───────────────────────────────────────────────

/** List all enums with per-standard override status for a given profile */
router.get('/profiles/:id/enums', async (req, res, next) => {
  try {
    const { id } = req.params;
    const profile = await schemaCacheService.getProfile(id);
    if (!profile) return next(new ValidationError(`Profile "${id}" không tồn tại`));

    // Build global enum map (hardcoded + custom)
    const globalMap = {};
    for (const name of ENUM_NAMES) {
      globalMap[name] = { displayName: ENUM_DISPLAY_NAMES[name], builtin: true };
    }
    const metas = await AppConfig.find({ key: /^enum-meta:/ }).lean();
    for (const m of metas) {
      const name = m.key.replace('enum-meta:', '');
      if (!globalMap[name]) globalMap[name] = { displayName: m.value?.displayName || name, builtin: false };
    }

    // Collect per-standard overrides
    const overrideDocs = await AppConfig.find({ key: new RegExp(`^enum:${id}:`) }).lean();
    const overriddenSet = new Set(overrideDocs.map(d => d.key.replace(`enum:${id}:`, '')));

    const result = {};
    for (const [name, info] of Object.entries(globalMap)) {
      const values = await schemaCacheService.getEnum(name, id);
      result[name] = { ...info, values, overridden: overriddenSet.has(name) };
    }
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** Clone global enum values into a per-standard override */
router.post('/profiles/:id/enums/:name/clone', async (req, res, next) => {
  try {
    const { id, name } = req.params;
    const profile = await schemaCacheService.getProfile(id);
    if (!profile) return next(new ValidationError(`Profile "${id}" không tồn tại`));
    const globalValues = await schemaCacheService.getEnum(name); // global only (no profileId)
    await AppConfig.findOneAndUpdate(
      { key: `enum:${id}:${name}` },
      { $set: { value: [...globalValues] } },
      { upsert: true }
    );
    schemaCacheService.invalidateAll();
    res.json({ success: true, data: { profileId: id, name, values: globalValues } });
  } catch (err) { next(err); }
});

/** Update per-standard enum values (must be cloned first) */
router.put('/profiles/:id/enums/:name', async (req, res, next) => {
  try {
    const { id, name } = req.params;
    const { values } = req.body;
    if (!Array.isArray(values) || values.length === 0)
      return next(new ValidationError('values phải là mảng không rỗng'));
    const profile = await schemaCacheService.getProfile(id);
    if (!profile) return next(new ValidationError(`Profile "${id}" không tồn tại`));
    await AppConfig.findOneAndUpdate(
      { key: `enum:${id}:${name}` },
      { $set: { value: values } },
      { upsert: true }
    );
    schemaCacheService.invalidateAll();
    res.json({ success: true, data: { profileId: id, name, values } });
  } catch (err) { next(err); }
});

/** Remove per-standard override — reverts to global values */
router.delete('/profiles/:id/enums/:name', async (req, res, next) => {
  try {
    const { id, name } = req.params;
    await AppConfig.deleteOne({ key: `enum:${id}:${name}` });
    schemaCacheService.invalidateAll();
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
