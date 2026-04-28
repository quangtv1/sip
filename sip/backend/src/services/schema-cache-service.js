/**
 * In-memory cache for dynamic enums, field schemas, and validation profiles.
 * Cache miss → AppConfig DB lookup → fallback to hardcoded defaults.
 * Explicit invalidation only — no TTL.
 *
 * Exports: getEnum, getSchema, invalidateAll, invalidateSchema, VALID_SHEETS,
 *          getActiveProfileId, getActiveProfile, getProfile, invalidateProfiles
 */

const mongoose = require('mongoose');
const AppConfig = require('../models/app-config-model');
const { HARDCODED_ENUMS, ENUM_NAMES } = require('../validators/enum-definitions');
const { HO_SO_SCHEMA } = require('../validators/ho-so-schema');
const { VAN_BAN_SCHEMA } = require('../validators/van-ban-schema');

/** Skip DB when not connected — avoids 10 s buffer timeout in tests / offline environments */
function isDbConnected() {
  return mongoose.connection.readyState === 1; // 1 = connected
}

const VALID_SHEETS = Object.freeze(['Ho_so', 'Van_ban']);

// Separate caches so schema invalidation doesn't flush enum cache and vice-versa
const enumCache   = new Map(); // enumName  → string[]
const schemaCache = new Map(); // sheet     → resolvedField[]
const profileCache = new Map(); // profileId → profileData
let   activeProfileId = null;   // string | null

// ── Profile ───────────────────────────────────────────────────────────────────

/** Built-in fallback so TT05 works with zero DB config */
function defaultProfile(profileId) {
  if (profileId === 'TT05') {
    return { name: 'Thông tư 05', primarySheet: 'Ho_so', secondarySheet: 'Van_ban', description: '' };
  }
  return null;
}

async function getActiveProfileId() {
  if (activeProfileId) return activeProfileId;
  if (!isDbConnected()) return 'TT05';
  try {
    const stored = await AppConfig.findOne({ key: 'active_profile' }).lean();
    activeProfileId = stored?.value || 'TT05';
  } catch (err) {
    console.error('[schema-cache] DB error for active_profile, using TT05:', err.message);
    activeProfileId = 'TT05';
  }
  return activeProfileId;
}

async function getActiveProfile() {
  const id = await getActiveProfileId();
  return getProfile(id);
}

async function getProfile(profileId) {
  if (profileCache.has(profileId)) return profileCache.get(profileId);
  let data = defaultProfile(profileId);
  if (isDbConnected()) {
    try {
      const stored = await AppConfig.findOne({ key: `profile:${profileId}` }).lean();
      if (stored?.value) data = stored.value;
    } catch (err) {
      console.error(`[schema-cache] DB error for profile:${profileId}:`, err.message);
    }
  }
  if (data) profileCache.set(profileId, data);
  return data;
}

function invalidateProfiles() {
  profileCache.clear();
  activeProfileId = null;
}

// ── Enum ──────────────────────────────────────────────────────────────────────

async function getEnum(name) {
  if (enumCache.has(name)) return enumCache.get(name);

  let values = HARDCODED_ENUMS[name] || [];
  if (isDbConnected()) {
    try {
      const stored = await AppConfig.findOne({ key: `enum:${name}` }).lean();
      if (stored?.value?.length > 0) values = stored.value;
    } catch (err) {
      console.error(`[schema-cache] DB error for enum:${name}, using hardcoded:`, err.message);
    }
  }
  enumCache.set(name, values);
  return values;
}

// ── Schema ────────────────────────────────────────────────────────────────────

function getHardcodedSchema(sheet) {
  return sheet === 'Ho_so' ? Array.from(HO_SO_SCHEMA) : Array.from(VAN_BAN_SCHEMA);
}

/** Resolve enumKey → enumValues in-place on a copy of the schema fields */
async function resolveSchemaEnums(fields) {
  const out = [];
  for (const field of fields) {
    if (field.type === 'enum' && field.enumKey) {
      const enumValues = await getEnum(field.enumKey);
      out.push({ ...field, enumValues });
    } else {
      out.push({ ...field });
    }
  }
  return out;
}

/** Derive enumKey from hardcoded enumValues by reference comparison */
function findEnumKey(enumValuesRef) {
  return ENUM_NAMES.find(k => HARDCODED_ENUMS[k] === enumValuesRef) || null;
}

/**
 * Load field schema for a given profile + sheet.
 * Cache key: `${profileId}:${sheet}`.
 * DB lookup order: profile-scoped key → legacy key (backward compat) → hardcoded.
 */
async function getSchema(profileId, sheet) {
  const cacheKey = `${profileId}:${sheet}`;
  if (schemaCache.has(cacheKey)) return schemaCache.get(cacheKey);

  let baseFields;
  const hardcodedWithKey = () => getHardcodedSchema(sheet).map(f => {
    if (f.type === 'enum' && f.enumValues) return { ...f, enumKey: findEnumKey(f.enumValues) };
    return { ...f };
  });

  if (!isDbConnected()) {
    baseFields = hardcodedWithKey();
  } else {
    try {
      // Try profile-scoped key first, then legacy key (lazy migration)
      let stored = await AppConfig.findOne({ key: `schema:${profileId}:${sheet}` }).lean();
      if (!stored?.value?.length) {
        stored = await AppConfig.findOne({ key: `schema:${sheet}` }).lean();
      }
      if (stored?.value?.length > 0) {
        // DB schema: has enumKey, no regex. Restore regex from hardcoded by field name.
        const hardcoded = getHardcodedSchema(sheet);
        const byName = new Map(hardcoded.map(f => [f.name, f]));
        baseFields = stored.value.map(f => {
          const hf = byName.get(f.name);
          return hf?.regex ? { ...f, regex: hf.regex } : { ...f };
        });
      } else {
        baseFields = hardcodedWithKey();
      }
    } catch (err) {
      console.error(`[schema-cache] DB error for schema:${profileId}:${sheet}, using hardcoded:`, err.message);
      baseFields = hardcodedWithKey();
    }
  }

  const resolved = await resolveSchemaEnums(baseFields);
  schemaCache.set(cacheKey, resolved);
  return resolved;
}

// ── Invalidation ──────────────────────────────────────────────────────────────

/** Clear everything — call after any enum, schema, or profile update */
function invalidateAll() {
  enumCache.clear();
  schemaCache.clear();
  invalidateProfiles();
}

/** Clear one schema — profileId:sheet key */
function invalidateSchema(profileId, sheet) {
  schemaCache.delete(`${profileId}:${sheet}`);
}

module.exports = {
  getEnum, getSchema, invalidateAll, invalidateSchema, VALID_SHEETS,
  getActiveProfileId, getActiveProfile, getProfile, invalidateProfiles,
};
