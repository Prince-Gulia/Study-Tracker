/**
 * app.js — Main controller
 * Orchestrates the frontend application by wiring data, UI updates and
 * coordinating modules: `tasks.js`, `stats.js`, `settings.js`, `charts.js`, and `importExport.js`.
 *
 * Responsibilities:
 * - Ensure authenticated access (redirect to login when no token)
 * - Load current user and expose `renderUser` for other modules
 * - Provide a single `refreshAllUI()` entry to update all views
 * - Expose a small set of global wrappers used by inline HTML event handlers
 */

import { loadData } from "./storage.js";
import * as Tasks from "./tasks.js";
import * as Stats from "./stats.js";
import * as Settings from "./settings.js";
import * as Charts from "./charts.js";
import * as ImportExport from "./importExport.js";

// Checking if user have a token or not, if not then sending the user to login page 

const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "login.html";
}

/**
 * Load the current authenticated user from backend.
 * Returns the parsed JSON user object or `null` when no token present.
 * Throws if the network request fails with a non-OK response.
 * @returns {Promise<Object|null>}
 */
async function loadCurrentUser() {
  const token = localStorage.getItem("token");

  if (!token) return null;

  const res = await fetch("http://localhost:5000/api/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to load user");
  }

  return await res.json();
}

/**
 * Populate user-related UI elements (navbar, avatar, academic info) using
 * server-provided `user` object with fallbacks to local data.
 * @param {Object} user
 */
function renderUser(user) {
  // Navbar username
  const nameEl = document.getElementById("navbar-username");
  if (nameEl) nameEl.textContent = user.username || "Username";

  // Avatar letter
  const avatarEl = document.querySelector(".avatar");
  if (avatarEl && user.username) {
    avatarEl.textContent = user.username.charAt(0).toUpperCase();
  }

  // Navbar user details (course • year)
  const detailsEl = document.getElementById("navbar-user-details");
  if (detailsEl) {
    detailsEl.textContent = `${user.course || "-"} • ${user.year || "-"}`;
  }

  // Academic info (in sidebar) — prefer course for institute label
  const instituteEl = document.querySelector(".sidebar-info .info-item .info-value");
  if (instituteEl) {
    const local = loadData();
    const inst = user.institute || local.academicInfo.institute || user.course || "Not Mentioned";
    instituteEl.textContent = inst;
  }

  const semDateEl = document.querySelector(".sem-info-date");
  if (semDateEl && user.semEndDate) semDateEl.textContent = user.semEndDate;
  const examDateEl = document.querySelector(".exam-info-date");
  if (examDateEl && user.examDate) examDateEl.textContent = user.examDate;
}

// Expose render and currentUser reference for other modules (settings)
// e.g., `settings.js` calls `window.renderUser` when profile updates arrive.
window.renderUser = renderUser;

//Refresh Whole UI after every Change 

/**
 * Centralized UI refresh entry point. Calling this re-renders tasks, stats,
 * charts and reapplies any local settings (theme/academic UI).
 */
function refreshAllUI() {

  // Re-render tasks
  Tasks.renderTasks();

  // Stats Updation
  Stats.refreshStatsData(); 
  Stats.updateStatsUI();
  Stats.updateTodayStatsUI();
  Stats.updateStreakUI();

  // Charts Updation
  Charts.updateAllCharts();

  // Apply settings visuals
  Settings.updateAcademicUI();
}


// Register refresh callback with tasks module so UI updates after backend mutations
Tasks.setUpdateCallback(() => {
  refreshAllUI();
});

// ----------------------------------------
// GLOBAL WRAPPERS (used by inline HTML attributes)
// These small wrappers delegate to `tasks.js` so HTML can call them directly.
// Prefer module-based event listeners in new code, but keep wrappers for legacy markup.
// ----------------------------------------
window.completeTask = (id) => Tasks.completeTask(id);
window.undoTask = (id) => Tasks.undoTask(id);
window.deleteTask = (id) => {
  if (confirm("Delete this task?")) {
    Tasks.deleteTask(id);
  }
};

window.editTask = (id) => {
  const t = Tasks.getTaskById(id);
  if (!t) return;

  document.getElementById("edit-title").value = t.title;
  document.getElementById("edit-resources").value = t.resources.join(", ");
  document.getElementById("edit-time").value = t.timeRequired;
  document.getElementById("edit-date").value = t.date;
  document.getElementById("edit-time-label").textContent = t.type === "book" ? "Pages" : "Hours";

  window.__EDITING_TASK_ID = id;
  document.getElementById("edit-modal").style.display = "flex";
};

/**
 * Show a modal listing resource links for a task.
 * `id` may be a number or string depending on backend.
 * @param {string|number} id
 */
window.openResources = (id) => {
  const t = Tasks.getTaskById(id);
  const container = document.getElementById("resource-list");
  container.innerHTML = "";

  if (!t.resources.length) {
    container.innerHTML = `<div style="color:var(--muted);font-size:14px">No Resources Added</div>`;
  } else {
    t.resources.forEach(link => {
      container.innerHTML += `
        <a href="${link}" target="_blank" style="
          color:var(--accent);
          text-decoration:underline;
          font-size:14px;
          word-break:break-all;
        ">${link}</a>
      `;
    });
  }

  document.getElementById("resource-modal").style.display = "flex";
};

// ----------------------------------------
// Add Task Form
// ----------------------------------------
document.querySelector(".task-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const type = document.getElementById("task-type").value;
  const title = document.getElementById("detail-input").value.trim();
  const resources = document.getElementById("resources").value
    .split(",").map(x => x.trim()).filter(Boolean);
  const timeValue = parseInt(document.getElementById("amount").value || "0", 10);
  const dateValue = document.getElementById("due-date").value;

  if (!type || !title) {
    alert("Please fill task type and title.");
    return;
  }

  Tasks.addTask({ type, title, resources, timeValue, dateValue });
  e.target.reset();
});

// ----------------------------------------
// NAVIGATION TOGGLE (accessibility + mobile)
// ----------------------------------------
const navToggle = document.getElementById("navToggle");
const primaryNav = document.getElementById("primaryNav");
if (navToggle && primaryNav) {
  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    // toggle aria-hidden on the nav container for screen readers
    const nowHidden = expanded;
    primaryNav.setAttribute("aria-hidden", String(nowHidden));
  });

  // Close menu with Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      navToggle.setAttribute("aria-expanded", "false");
      primaryNav.setAttribute("aria-hidden", "true");
    }
  });
}

// ----------------------------------------
// Sort Select
// ----------------------------------------
document.getElementById("sort-select").addEventListener("change", (e) => {
  Tasks.setSort(e.target.value);
});

// ----------------------------------------
// Edit Modal
// ----------------------------------------
document.getElementById("edit-cancel").addEventListener("click", () => {
  document.getElementById("edit-modal").style.display = "none";
});

document.getElementById("edit-save").addEventListener("click", () => {
  const id = window.__EDITING_TASK_ID;
  if (!id) return;

  const updated = {
    title: document.getElementById("edit-title").value.trim(),
    resources: document.getElementById("edit-resources").value.split(",").map(x => x.trim()).filter(Boolean),
    timeRequired: parseInt(document.getElementById("edit-time").value || "0", 10),
    date: document.getElementById("edit-date").value,
    
    // EXTRA FIELDS WE MUST KEEP
    type: Tasks.getTaskById(id).type,
    timeUnit: Tasks.getTaskById(id).timeUnit
};


  Tasks.updateTask(id, updated);

  document.getElementById("edit-modal").style.display = "none";
  window.__EDITING_TASK_ID = null;
});

// ----------------------------------------
// Resource Modal Close
// ----------------------------------------
document.getElementById("resource-close").addEventListener("click", () => {
  document.getElementById("resource-modal").style.display = "none";
});

// ----------------------------------------
// Settings modal open/close/save
// ----------------------------------------
document.querySelector(".setting").addEventListener("click", () => {
  Settings.openSettings();
});

document.getElementById("settings-close").addEventListener("click", () => {
  Settings.closeSettings();
});

document.getElementById("save-settings").addEventListener("click", async () => {
  // Await save and only refresh UI if successful; show simple feedback
  try {
    const ok = await Settings.saveSettingsChanges();
    if (ok) {
      refreshAllUI();
      alert("Settings saved successfully");
    } else {
      alert("Failed to save settings. Check console for errors.");
    }
  } catch (e) {
    console.error("Save settings failed:", e);
    alert("Failed to save settings. See console.");
  }
});

// Theme Buttons
Settings.initThemeButtons();

// ----------------------------------------
// Import / Export
// ----------------------------------------
ImportExport.initImportSystem();

ImportExport.setImportCallback(() => {
  // Instead of old __reload(), use backend reload
  Tasks.loadTasks();
  refreshAllUI();
});

// ----------------------------------------
// Chart Period Select
// ----------------------------------------
document.getElementById("chart-period").addEventListener("change", function () {
  const data = Charts.getChartData();
  if (this.value === "7") Charts.renderLineChart(data.last7);
  else Charts.renderLineChart(data.last30);
});

const userCard = document.getElementById("userCard");
const dropdown = document.getElementById("userDropdown");
const logoutBtn = document.getElementById("logout-btn");

// Toggle dropdown
userCard.addEventListener("click", (e) => {
  e.stopPropagation(); // important
  dropdown.classList.toggle("hidden");
});

// Close on outside click
document.addEventListener("click", () => {
  dropdown.classList.add("hidden");
});

// Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "/login.html";
});

// ----------------------------------------
// INITIAL BOOTSTRAP
// ----------------------------------------
async function init() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Apply local theme immediately for speed
  const localData = loadData();
  Settings.applyTheme(localData.settings.theme);

  try {
    // 1. Load User First
    const user = await loadCurrentUser();
    if (user) {
      window.currentUser = user;
      renderUser(user);
    }

    // 2. Await Tasks before rendering Stats
    await Tasks.loadTasks();  

    // 3. Now update UI components that depend on tasks
    Stats.refreshStatsData();
    Stats.updateStatsUI();
    Stats.updateTodayStatsUI();
    Stats.updateStreakUI();
    Charts.updateAllCharts();
    
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("token");
  // Do not store/remove full user object in localStorage; server is authoritative
  window.location.href = "login.html";
});

init();
