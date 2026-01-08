/**
 * utils.js
 * Small reusable helpers used across the frontend. These are intentionally
 * lightweight and pure where possible to make unit testing straightforward.
 */

/**
 * Return the app's "current day" string (YYYY-MM-DD).
 * Business rule: if hour >= 3 => it's the same day, otherwise treat as previous day.
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
export function getCurrentDay() {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 3) {
    return now.toISOString().split("T")[0];
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

/**
 * Calculate whole-day difference between a target date and today.
 * Normalizes both dates to local midnight before computing.
 * @param {string} targetDateString - ISO date (YYYY-MM-DD) or other parseable date
 * @returns {number} Number of days (positive if in future)
 */
export function getDaysDifference(targetDateString) {
  const today = new Date();
  const target = new Date(targetDateString);

  // normalize to midnight
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffMs = target - today;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Convert days-left number into a user-friendly string used in the UI.
 * @param {number} daysLeft
 * @returns {string}
 */
export function formatDaysText(daysLeft) {
  if (daysLeft < 0) return "Exam Passed";
  if (daysLeft === 0) return "Your Exam is Today";
  if (daysLeft === 1) return "Your Exam is Tomorrow";
  return `${daysLeft} days Left`;
}

/**
 * Parse JSON safely and return `defaultValue` on error.
 * This prevents runtime exceptions when reading user-provided files.
 * @param {string} jsonString
 * @param {*} defaultValue
 * @returns {*}
 */
export function safeParseJSON(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Validate the basic backup shape used by import/export logic.
 * This is intentionally non-exhaustive but helps catch common problems.
 * @param {*} obj
 * @returns {{ok:boolean, reason?:string}}
 */
export function validateBackupShape(obj) {
  if (!obj || typeof obj !== "object") return { ok: false, reason: "Not an object" };

  if (!("tasks" in obj) || !Array.isArray(obj.tasks)) {
    return { ok: false, reason: "Missing tasks array" };
  }

  if (!("settings" in obj) || typeof obj.settings !== "object") {
    // allow but warn — some older backups may not have settings
    return { ok: true, reason: "No settings block (allowed)" };
  }

  // basic tasks shape check (not exhaustive): check first item if exists
  if (obj.tasks.length > 0) {
    const t = obj.tasks[0];
    if (!("id" in t) || !("title" in t) || !("createdAt" in t)) {
      return { ok: false, reason: "Tasks missing required fields (id/title/createdAt)" };
    }
  }

  return { ok: true };
}
