/**
 * importExport.js
 * Responsible for exporting a full JSON backup of the app's local state and
 * importing backups with a conservative hybrid merge strategy.
 *
 * Key design decisions:
 * - Backups are JSON files containing `tasks`, `settings`, `academicInfo`, and `streak`.
 * - Import uses a hybrid merge: local settings/academicInfo/streak are replaced
 *   if present in the backup and `tasks` are merged without duplicates.
 * - The module validates the backup shape before applying it.
 */

import { loadData, saveData } from "./storage.js";
import { validateBackupShape, safeParseJSON } from "./utils.js";

// App will attach this externally so import can trigger UI refresh
let onImportSuccess = () => {};

export function setImportCallback(cb) {
  onImportSuccess = cb;
}

// ===============================================
// EXPORT BACKUP
// ===============================================

export function exportBackup() {
  const data = loadData();
  const jsonStr = JSON.stringify(data, null, 2);

  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "study-tracker-backup.json";
  a.click();

  URL.revokeObjectURL(url);
}

// ===============================================
// IMPORT BACKUP (Hybrid)
// ===============================================

export function importBackup(file) {
  const reader = new FileReader();

  reader.onload = e => {
    const text = e.target.result;

    // SAFELY parse JSON
    const imported = safeParseJSON(text);
    if (!imported) {
      alert("Invalid JSON file.");
      return;
    }

    // Validate structure
    const check = validateBackupShape(imported);
    if (!check.ok) {
      alert("Invalid Backup File: " + check.reason);
      return;
    }

    // Load existing data
    let data = loadData();

    // ======================================================
    // HYBRID RESTORE BEHAVIOR (YOUR DESIGN)
    // ======================================================

    // 1️⃣ Replace settings if present
    if (imported.settings) {
      data.settings = imported.settings;
    }

    // 2️⃣ Replace academic info if present
    if (imported.academicInfo) {
      data.academicInfo = imported.academicInfo;
    }

    // 3️⃣ Replace streak
    if (imported.streak) {
      data.streak = imported.streak;
    }

    // 4️⃣ Merge tasks (NO duplicates)
    if (imported.tasks && Array.isArray(imported.tasks)) {
      data.tasks = mergeTasks(data.tasks, imported.tasks);
    }

    // Save new data
    saveData(data);

    // Notify app.js to refresh UI
    onImportSuccess();

    alert("Backup Imported Successfully!");
  };

  reader.readAsText(file);
}

// ===============================================
// INIT IMPORT HANDLER
// ===============================================

// Call this once in app.js
export function initImportSystem() {
  const importBtn = document.getElementById("import-data");
  const fileInput = document.getElementById("import-file-input");
  const exportBtn = document.getElementById("export-data");

  if (exportBtn) {
    exportBtn.addEventListener("click", exportBackup);
  }

  if (importBtn && fileInput) {
    importBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (file) importBackup(file);
    });
  }
}
