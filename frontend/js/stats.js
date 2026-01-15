/**
 * stats.js
 * Computes and updates application statistics derived from tasks and local
 * non-task data (streaks, settings). This module expects tasks to be provided
 * by the backend via `tasks.js` and focuses on transforming that data into
 * values shown in the UI (totals, percentages, today-stats, streaks, etc.).
 */

import * as Tasks from "./tasks.js";
import { saveData, loadData } from "./storage.js";
import { getCurrentDay } from "./utils.js";

// Only NON-task data lives in localStorage
let data = loadData();

// App callback invoked when stats change (UI or other modules can subscribe)
let onStatsUpdated = () => {};
export function setStatsCallback(fn) {
  onStatsUpdated = fn;
}

// ================================
// SAFE TASK ACCESS (IMPORTANT)
// ================================
function getTasks() {
  const tasks = Tasks.getAllTasks();
  return Array.isArray(tasks) ? tasks : [];
}

// ================================
// BASIC STATS
// ================================

/**
 * Update various DOM elements that display aggregate stats (total, completed, effort).
 * This function reads current tasks from `tasks.js` and writes computed values
 * to the DOM. Keep DOM updates idempotent so calling repeatedly is cheap.
 */
export function updateStatsUI() {
  const tasks = getTasks();

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "completed").length;

  document.getElementById("total-meta").textContent = total;
  document.getElementById("completed-meta").textContent = completed;

  document.getElementById("total-tasks").textContent = total;
  document.getElementById("completed-tasks").textContent = completed;

  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  document.getElementById("effort-score").textContent = percent + "%";
  document.getElementById("progress-fill").style.width = percent + "%";
}

// ================================
// TODAY STATS
// ================================

/**
 * Compute today's stats from the current tasks list.
 * Returns an object with counts for createdToday and completedToday.
 */
export function getTodayStats() {
  const tasks = getTasks();
  const today = getCurrentDay();

  let createdToday = 0;
  let completedToday = 0;

  tasks.forEach(task => {
    if (task.createdAt?.startsWith(today)) createdToday++;
    if (task.completedAt?.startsWith(today)) completedToday++;
  });

  return { createdToday, completedToday };
}

export function updateTodayStatsUI() {
  const { createdToday, completedToday } = getTodayStats();

  const box = document.getElementById("today-progress-box");
  if (!box) return;

  box.innerHTML = `
    <div style="font-size:14px; line-height:1.6;">
      <strong>Completed Today:</strong> ${completedToday}<br>
      <strong>Created Today:</strong> ${createdToday}<br>
      <strong>Efficiency:</strong> ${
        createdToday === 0
          ? "0%"
          : Math.round((completedToday / createdToday) * 100) + "%"
      }
    </div>
  `;
}

// ================================
// STREAK SYSTEM (localStorage only)
// ================================

export function updateStreak() {
  // Server-authoritative streak: frontend should not compute streak locally.
  // This function kept for compatibility but will trigger a refresh from currentUser if available.
  if (window.currentUser && window.currentUser.streak) {
    data.streak = window.currentUser.streak;
    saveData(data);
    updateStreakUI();
    onStatsUpdated();
  }
}

export function updateStreakUI() {
  const el = document.getElementById("consistency");
  const streak = window.currentUser?.streak || data.streak || { count: 0 };
  if (el) el.textContent = streak.count || 0;
}

// ================================
// REFRESH (called by app.js)
// ================================

export function refreshStatsData() {
  data = loadData(); // streak + settings only
}
