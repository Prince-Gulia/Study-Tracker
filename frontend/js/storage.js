/**
 * storage.js
 * Module responsible for client-side persistence of app preferences and
 * lightweight non-sensitive data: `academicInfo`, `streak`, and `settings`.
 *
 * Implementation notes:
 * - Uses `localStorage` under the key `studyTrackerData` with a simple
 *   `schemaVersion` for forward-compatibility and migrations.
 * - All `localStorage` access is wrapped to guard against exceptions
 *   (e.g., private browsing or storage being disabled). In such cases
 *   an in-memory fallback is used to avoid runtime errors.
 * - `loadData()` returns a validated object with defaults merged in.
 * - `saveData()` writes `schemaVersion` and persists the provided object.
 *
 * Keep this module focused on small, non-sensitive state only. For
 * identity or cross-device sync, use the backend API.
 */

const STORAGE_KEY = "studyTrackerData";
const CURRENT_SCHEMA_VERSION = 1;

const DEFAULT_DATA = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  academicInfo: {
    institute: "Not Mentioned",
    examDate: "2025-12-08",
    semEndDate: "2025-12-28",
  },
  streak: {
    count: 0,
    lastStreakDay: null,
  },
  settings: {
    theme: "dark", // ✅ preferences only
  }
};

let inMemoryFallback = null;

/**
 * Safe clone helper: uses structuredClone when available, falls back to
 * a JSON-based deep copy for older browsers.
 * @param {*} v
 * @returns {*}
 */
function safeClone(v) {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(v);
    } catch (e) {
      // fall through to JSON fallback
    }
  }
  return JSON.parse(JSON.stringify(v));
}

/**
 * Read a key from `localStorage` but guard against exceptions (private mode, quota errors).
 * If reading fails we fall back to `inMemoryFallback` which preserves recent writes
 * within the same page session.
 * @param {string} key
 * @returns {string|null}
 */
function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return inMemoryFallback;
  }
}

/**
 * Write a key to `localStorage` with a fallback to in-memory storage when write
 * fails (e.g., storage disabled). Returns true when persisted to localStorage.
 * @param {string} key
 * @param {string} value
 * @returns {boolean}
 */
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    inMemoryFallback = value;
    return false;
  }
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function isValidData(obj) {
  if (!obj || typeof obj !== "object") return false;
  if (!obj.academicInfo || typeof obj.academicInfo !== "object") return false;
  if (!obj.streak || typeof obj.streak !== "object") return false;
  if (!obj.settings || typeof obj.settings !== "object") return false;
  return true;
}

function migrateIfNeeded(obj) {
  if (!obj || typeof obj !== "object") return safeClone(DEFAULT_DATA);
  if (obj.schemaVersion === CURRENT_SCHEMA_VERSION) return obj;

  // basic migration: merge nested objects with defaults
  const migrated = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    academicInfo: { ...DEFAULT_DATA.academicInfo, ...(obj.academicInfo || {}) },
    streak: { ...DEFAULT_DATA.streak, ...(obj.streak || {}) },
    settings: { ...DEFAULT_DATA.settings, ...(obj.settings || {}) }
  };

  return migrated;
}

export function loadData() {
  const raw = safeGetItem(STORAGE_KEY);

  if (!raw) {
    const fresh = safeClone(DEFAULT_DATA);
    safeSetItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  const parsed = safeParse(raw);
  if (!parsed || !isValidData(parsed)) {
    const fresh = safeClone(DEFAULT_DATA);
    safeSetItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    const migrated = migrateIfNeeded(parsed);
    saveData(migrated);
    return migrated;
  }

  return parsed;
}

export function saveData(data) {
  const copy = {
    ...data,
    schemaVersion: CURRENT_SCHEMA_VERSION
  };
  safeSetItem(STORAGE_KEY, JSON.stringify(copy));
}

// SETTINGS (preferences only)
export function updateSettings(data, newSettings) {
  data.settings = { ...data.settings, ...newSettings };
  saveData(data);
}

// ACADEMIC INFO (non-identity)
export function updateAcademicInfo(data, newInfo) {
  data.academicInfo = { ...data.academicInfo, ...newInfo };
  saveData(data);
}

// STREAK
export function updateStreakData(data, newData) {
  data.streak = { ...data.streak, ...newData };
  saveData(data);
}
