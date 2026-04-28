/**
 * Validates a schema payload before saving to DB.
 * Returns array of error strings. Empty array = valid.
 *
 * Rules:
 *  1. Non-empty array
 *  2. Each field: index (int>=0), name, label, type (see VALID_TYPES), severity, required
 *  3. No duplicate indices, no duplicate names
 *  4. Indices must be contiguous 0..N-1
 *  5. type=enum → valid enumKey
 *  6. type=regex → pattern required + valid regex (ReDoS check)
 *  7. type=range → min and max required, min <= max
 *  8. type=float → if both min/max set, min <= max
 *  9. type=dependent-enum → dependsOn.fieldIndex + dependsOn.valueMap required; no cycles
 * 10. required='conditional' → conditionalOn.fieldIndex must reference valid index
 */

const { ENUM_NAMES } = require('../validators/enum-definitions');

const VALID_TYPES = [
  'string', 'date', 'positiveInt', 'enum',              // Phase 2/3 original types
  'float', 'boolean', 'regex', 'email', 'url', 'range', // Phase 4c extended types
  'dependent-enum',                                       // Phase 4d cascading type
];
const VALID_SEVERITIES = ['ERROR', 'WARNING'];
const VALID_REQUIRED   = [true, false, 'conditional'];

function validateSchemaPayload(fields) {
  const errors = [];

  if (!Array.isArray(fields) || fields.length === 0) {
    errors.push('Schema phải là mảng không rỗng');
    return errors;
  }

  const indices = new Set();
  const names   = new Set();

  fields.forEach((f, i) => {
    const pos = `field[${i}]`;

    if (!Number.isInteger(f.index) || f.index < 0) {
      errors.push(`${pos}: index phải là số nguyên >= 0`);
    } else {
      if (indices.has(f.index)) errors.push(`${pos}: index ${f.index} bị trùng`);
      indices.add(f.index);
    }

    if (!f.name || typeof f.name !== 'string' || f.name.trim() === '') {
      errors.push(`${pos}: name là bắt buộc`);
    } else {
      if (names.has(f.name)) errors.push(`${pos}: name "${f.name}" bị trùng`);
      names.add(f.name);
    }

    if (!f.label || typeof f.label !== 'string') {
      errors.push(`${pos}: label là bắt buộc`);
    }

    if (!VALID_TYPES.includes(f.type)) {
      errors.push(`${pos}: type phải là một trong ${VALID_TYPES.join(', ')}`);
    }

    if (!VALID_SEVERITIES.includes(f.severity)) {
      errors.push(`${pos}: severity phải là ERROR hoặc WARNING`);
    }

    if (!VALID_REQUIRED.includes(f.required)) {
      errors.push(`${pos}: required phải là true, false hoặc "conditional"`);
    }

    // ── Type-specific param validation ─────────────────────────────────────────

    if (f.type === 'enum') {
      if (!f.enumKey || !ENUM_NAMES.includes(f.enumKey)) {
        errors.push(`${pos}: type=enum yêu cầu enumKey hợp lệ`);
      }
    }

    if (f.type === 'regex') {
      if (!f.pattern || typeof f.pattern !== 'string') {
        errors.push(`${pos}: type=regex yêu cầu field "pattern"`);
      } else {
        try {
          new RegExp(f.pattern);
          // Basic ReDoS heuristic: reject nested quantifiers e.g. (a+)+ or (a*)*
          if (/\([^)]*[*+][^)]*\)[*+]/.test(f.pattern)) {
            errors.push(`${pos}: pattern có dấu hiệu ReDoS (quantifier lồng nhau)`);
          }
        } catch {
          errors.push(`${pos}: pattern không phải regex hợp lệ`);
        }
      }
    }

    if (f.type === 'range') {
      if (f.min == null || f.max == null) {
        errors.push(`${pos}: type=range yêu cầu cả min và max`);
      } else if (f.min > f.max) {
        errors.push(`${pos}: range min phải <= max`);
      }
    }

    if (f.type === 'float') {
      if (f.min != null && f.max != null && f.min > f.max) {
        errors.push(`${pos}: float min phải <= max`);
      }
    }

    if (f.type === 'dependent-enum') {
      if (f.dependsOn?.fieldIndex == null || !Number.isInteger(f.dependsOn.fieldIndex)) {
        errors.push(`${pos}: dependent-enum yêu cầu dependsOn.fieldIndex (số nguyên)`);
      }
      if (!f.dependsOn?.valueMap || typeof f.dependsOn.valueMap !== 'object' || Array.isArray(f.dependsOn.valueMap)) {
        errors.push(`${pos}: dependent-enum yêu cầu dependsOn.valueMap (object)`);
      }
    }

    if (f.required === 'conditional') {
      if (!f.conditionalOn || !Number.isInteger(f.conditionalOn.fieldIndex)) {
        errors.push(`${pos}: required=conditional yêu cầu conditionalOn.fieldIndex`);
      }
    }
  });

  // Contiguous check: indices must be exactly 0..N-1
  const n = fields.length;
  const sortedIndices = [...indices].sort((a, b) => a - b);
  const expected = Array.from({ length: n }, (_, i) => i);
  const contiguous = sortedIndices.every((v, i) => v === expected[i]);
  if (!contiguous) {
    errors.push(`Indices phải liên tục từ 0 đến ${n - 1}`);
  }

  // Validate conditionalOn references
  fields.forEach((f, i) => {
    if (f.required === 'conditional' && f.conditionalOn?.fieldIndex !== undefined) {
      if (!indices.has(f.conditionalOn.fieldIndex)) {
        errors.push(`field[${i}]: conditionalOn.fieldIndex=${f.conditionalOn.fieldIndex} không tồn tại trong schema`);
      }
    }
  });

  // Cycle detection for dependent-enum chains (e.g. A→B→A)
  const depMap = new Map(); // fieldIndex → dependsOnFieldIndex
  fields.forEach(f => {
    if (f.type === 'dependent-enum' && f.dependsOn?.fieldIndex != null) {
      depMap.set(f.index, f.dependsOn.fieldIndex);
    }
  });
  for (const start of depMap.keys()) {
    let cur = start;
    const visited = new Set();
    while (depMap.has(cur)) {
      if (visited.has(cur)) {
        errors.push(`Phát hiện vòng lặp phụ thuộc (dependent-enum) tại field index ${start}`);
        break;
      }
      visited.add(cur);
      cur = depMap.get(cur);
    }
  }

  return errors;
}

module.exports = { validateSchemaPayload };
