/**
 * Row ↔ document mapping for the MongoDB → Supabase migration.
 *
 * Postgres columns are snake_case; the app and frontend were written against
 * Mongo's camelCase documents with `_id`. `fromRow` maps a Postgres row back
 * to that shape so consuming code and API responses stay unchanged:
 *   - top-level snake_case keys → camelCase
 *   - `id` is exposed as both `id` and `_id`
 *   - JSONB column VALUES pass through untouched (their internal keys were
 *     stored verbatim from Mongo and are already camelCase)
 *
 * Writes are authored directly in snake_case in the rewritten handlers, so
 * only the read direction needs mapping. `toSnake` is provided for the rare
 * case of translating a camelCase patch object.
 */

export function snakeToCamel(str) {
  return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

export function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}

/** Map a single Postgres row to a Mongo-style document (shallow). */
export function fromRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[snakeToCamel(key)] = value;
  }
  // Preserve Mongo-style _id alongside the uuid id.
  if ('id' in row) out._id = row.id;
  return out;
}

/** Map an array of rows. Accepts null/undefined → []. */
export function fromRows(rows) {
  return (rows || []).map(fromRow);
}

/** Shallow camelCase→snake_case for a patch object (top-level keys only). */
export function toSnake(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_id') continue; // never write the alias
    out[camelToSnake(key)] = value;
  }
  return out;
}
