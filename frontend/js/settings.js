/**
 * settings.js
 * Manages the application-level user settings (theme, academic info UI) and
 * exposes helpers to open/close the settings modal and persist changes.
 *
 * Important:
 * - Identity/profile updates are performed against the backend
 *   (`/api/me`) and the server remains the authority for personal data.
 * - This module persists non-identity UI preferences locally using `storage.js`.
 */

import { loadData, saveData, updateSettings, updateAcademicInfo } from "./storage.js";
import { getDaysDifference, formatDaysText } from "./utils.js";

let data = loadData();

// ========================================
// APPLY THEME
// ========================================

const themes = {
  dark: {
    bg: "#0f172a",
    card: "#1e293b",
    text: "#ffffff",
    muted: "#94a3b8",
    accent: "#7c3aed",
    accent_2: "#06b6d4",
    glass: "rgba(255,255,255,0.05)",
    glass_2: "rgba(255,255,255,0.08)"
  },
  light: {
    bg: "#f8f3e8",
    card: "#ffffff",
    text: "#1f1b17",
    muted: "#7e736a",
    accent: "#b79bff",
    accent_2: "#7fe1d6",
    glass: "rgba(0,0,0,0.04)",
    glass_2: "rgba(0,0,0,0.07)"
  },
  neon: {
    bg: "#0b0a16",
    card: "#141225",
    text: "#e9e4ff",
    muted: "#a08bd3",
    accent: "#a855f7",
    accent_2: "#06b6d4",
    glass: "rgba(168,85,247,0.08)",
    glass_2: "rgba(168,85,247,0.15)"
  }
};

export function applyTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) return;

  Object.keys(theme).forEach(key => {
    document.documentElement.style.setProperty("--" + key, theme[key]);
  });
}

// ========================================
// ACADEMIC UI UPDATES (NO IDENTITY)
// ========================================

/**
 * Update academic-related UI elements (days left, exam/sem dates, institute).
 * Falls back to locally stored `academicInfo` when `window.currentUser` doesn't provide values.
 */
export function updateAcademicUI() {
  data = loadData();
  const academic = data.academicInfo;
  const user = window.currentUser;

  const examDate = user?.examDate || academic.examDate;
  const semDate = user?.semEndDate || academic.semEndDate;
  const institute = user?.institute || academic.institute;

  const daysExamEl = document.querySelector(".days-left-exam");
  if (daysExamEl) daysExamEl.textContent = formatDaysText(getDaysDifference(examDate));

  const daysSemEl = document.querySelector(".days-left-sem");
  if (daysSemEl) daysSemEl.textContent = formatDaysText(getDaysDifference(semDate));

  const examDateEl = document.querySelector(".exam-info-date");
  if (examDateEl) examDateEl.textContent = examDate;

  const semDateEl = document.querySelector(".sem-info-date");
  if (semDateEl) semDateEl.textContent = semDate;

  const instituteEl = document.querySelector(".sidebar-info .info-item .info-value");
  if (instituteEl) instituteEl.textContent = institute;
}

// ========================================
// OPEN SETTINGS MODAL (NO IDENTITY)
// ========================================

/**
 * Open the settings modal and populate fields from server user and local data.
 * This function intentionally does not overwrite server-side identity fields;
 * it uses backend values when available and local fallback otherwise.
 */
export function openSettings() {
  data = loadData();
  const user = window.currentUser;

  document.getElementById("settings-modal").style.display = "flex";

  document.getElementById("settings-username").value = user?.username || "";
  // `course` is the user's course (e.g., B.Tech CS). Do not fallback to institute here.
  document.getElementById("settings-course").value = user?.course || "";
  document.getElementById("settings-year").value = user?.year || "";

  // Institute field comes from local academicInfo if backend user doesn't provide it
  document.getElementById("settings-institute").value = user?.institute || data.academicInfo.institute || "";
  document.getElementById("settings-examdate").value = user?.examDate || data.academicInfo.examDate || "";
  document.getElementById("settings-semend").value = user?.semEndDate || data.academicInfo.semEndDate || "";

  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.dataset.theme === data.settings.theme) {
      btn.classList.add("active");
    }
  });
}

// ========================================
// CLOSE MODAL
// ========================================

/** Close the settings modal. */
export function closeSettings() {
  document.getElementById("settings-modal").style.display = "none";
}

// ========================================
// SAVE SETTINGS (NO IDENTITY)
// ========================================

/**
 * Persist changes from the settings modal.
 * Workflow:
 * 1. Sync editable profile fields to backend (`PUT /api/me`).
 * 2. Update local academic info fallback via `updateAcademicInfo`.
 * 3. Refresh UI on success.
 * @returns {Promise<boolean>} true when successfully saved on server
 */
export async function saveSettingsChanges() {
  const token = localStorage.getItem("token");
  const updatedProfile = {
    username: document.getElementById("settings-username").value.trim(),
    course: document.getElementById("settings-course").value.trim(),
    year: document.getElementById("settings-year").value.trim(),
    institute: document.getElementById("settings-institute").value.trim(),
    examDate: document.getElementById("settings-examdate").value,
    semEndDate: document.getElementById("settings-semend").value
  };

  try {
    // 1. Sync to Backend
    const base = (window.ENV && window.ENV.API_BASE_URL)
      ? window.ENV.API_BASE_URL.replace(/\/$/, "")
      : (location.hostname === "localhost" || location.hostname === "127.0.0.1")
        ? "http://localhost:5000/api"
        : (location.origin + "/api");

    const res = await fetch(`${base}/me`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updatedProfile)
    });
    if (res.ok) {
      // Refresh user from backend (expect API to return updated user or allow GET)
      let updatedUser = null;
      try {
        updatedUser = await res.json();
      } catch (e) {
        // Some backends return empty body on success; fall back to a GET
        console.warn("PUT /api/me returned non-JSON; attempting GET to refresh user");
        try {
          const r2 = await fetch(`${base}/me`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (r2.ok) updatedUser = await r2.json();
        } catch (err) {
          console.error("Failed to refresh user after settings save:", err);
        }
      }

      if (updatedUser) {
        window.currentUser = updatedUser;
        if (window.renderUser) window.renderUser(updatedUser);
        // Do not persist full user object in localStorage; token is enough.
      }

      // Persist academic info locally as well (backend may not store `institute`)
      try {
        const local = loadData();
        if (!local || typeof local !== "object") throw new Error("Local data invalid");

        updateAcademicInfo(local, {
          institute: document.getElementById("settings-institute").value.trim(),
          examDate: document.getElementById("settings-examdate").value,
          semEndDate: document.getElementById("settings-semend").value
        });
      } catch (err) {
        console.error("Failed to persist academic info locally:", err);
        // Do not treat as fatal for server save; continue to update UI
      }

      document.getElementById("settings-modal").style.display = "none";
      // Update academic UI from backend-driven user / local fallback
      updateAcademicUI();
      return true;
    }
    // Try to extract a helpful message from the server response and show it to the user.
    try {
      const bodyText = await res.text();
      let parsed = null;
      try {
        parsed = JSON.parse(bodyText);
      } catch (e) {
        // not JSON
      }

      const message = parsed?.message || parsed?.error || bodyText || `Server responded ${res.status}`;
      console.error("Failed to save settings; server responded:", res.status, message);
      // Friendly alert for common duplicate key errors
      if (message && /duplicate key/i.test(message)) {
        alert("Failed to save settings: that username is already taken. Please choose another username.");
      } else {
        alert("Failed to save settings: " + message);
      }
    } catch (err) {
      console.error("Failed to save settings; unknown server error", err);
      alert("Failed to save settings due to server error. See console for details.");
    }

    return false;
  } catch (err) {
    console.error("Failed to sync settings:", err);
    return false;
  }
}

// ========================================
// THEME BUTTON HANDLERS
// ========================================

/**
 * Attach click handlers to `.theme-btn` elements to change theme and persist the choice.
 */
export function initThemeButtons() {
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const theme = btn.dataset.theme;
      const fresh = loadData();
      updateSettings(fresh, { theme });
      applyTheme(theme);
    });
  });
}
