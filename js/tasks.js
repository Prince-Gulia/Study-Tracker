/**
 * tasks.js
 * Client-side wrapper around backend tasks. Responsible for:
 * - Fetching and normalizing tasks from the backend
 * - Rendering tasks into the DOM
 * - Sending create/update requests to the backend
 *
 * The module exposes a small set of functions (loadTasks, addTask, completeTask, etc.)
 * and a callback `setUpdateCallback` so other modules can be notified after changes.
 */

// UI update callback invoked after task state changes (backend or local)
let onTasksUpdated = () => {};
export function setUpdateCallback(fn) {
  onTasksUpdated = fn;
}

// Internal task state — filled after backend fetch
let tasks = [];
let currentSort = "recent";

// -------------------------------
// Backend Fetch Helper
// -------------------------------
const backendURL = "http://localhost:5000/api";

/**
 * Build authorization headers for backend requests.
 * Centralizing this helps future changes (e.g., token refresh) in one place.
 * @returns {{Authorization: string, 'Content-Type': string}}
 */
function authHeader() {
  return {
    "Authorization": "Bearer " + localStorage.getItem("token"),
    "Content-Type": "application/json"
  };
}

// ================================
// LOAD TASKS FROM BACKEND
// ================================
export async function loadTasks() {
  const res = await fetch(`${backendURL}/tasks`, {
    method: "GET",
    headers: authHeader()
  });

  const rawTasks = await res.json();
  
  // FIXED: Map MongoDB _id or custom id to a consistent 'id' for the UI
  tasks = rawTasks.map(t => ({
    ...t,
    id: t.id || t._id 
  }));

  renderTasks();
  onTasksUpdated(); 
}

// ================================
// Sorting logic
// ================================
export function setSort(type) {
  currentSort = type;
  renderTasks();
}

function sortTasks(arr) {
  if (currentSort === "recent") {
    return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  if (currentSort === "oldest") {
    return arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }
  if (currentSort === "duesoon") {
    return arr.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  if (currentSort === "dueLatest") {
    return arr.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  return arr;
}

// ================================
// Render Tasks
// ================================
export function renderTasks() {
  const container = document.querySelector("#task-list");
  if (!container) return;

  container.innerHTML = "";

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div style="color:var(--muted); font-size:14px; margin-top:10px">
        No Tasks added yet.
      </div>`;
    return;
  }

  const sorted = sortTasks([...tasks]);
  sorted.sort((a, b) => (a.status === "completed") - (b.status === "completed"));

  sorted.forEach(task => {
    const isCompleted = task.status === "completed";

    const html = `
      <div class="task-item ${isCompleted ? "completed" : ""}">
        <div class="task-type type-${task.type}">
            ${task.type.charAt(0).toUpperCase() + task.type.slice(1)}
        </div>
        
        <div class="task-body">
            <div class="task-title ${isCompleted ? "title-completed" : ""}">
              ${task.title}
            </div>
            <div class="task-meta">
              ${task.timeRequired} ${task.timeUnit} • Due: ${task.date}
            </div>
        </div>

        <div class="task-actions">
            <button class="btn-ghost" onclick="openResources(${JSON.stringify(task.id)})">Resources</button>

            ${
              isCompleted 
              ? `<button class="btn-ghost undo" onclick="undoTask(${JSON.stringify(task.id)})">Undo</button>`
              : `<button class="btn-ghost" onclick="completeTask(${JSON.stringify(task.id)})">Done</button>`
            }

            <button class="btn-ghost" onclick="editTask(${JSON.stringify(task.id)})">Edit</button>
            <button class="btn-ghost danger" onclick="deleteTask(${JSON.stringify(task.id)})">Delete</button>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", html);
    const inserted = container.lastElementChild;
    setTimeout(() => inserted.classList.add("show"), 10);

  });
}

// ================================
// Add Task (BACKEND)
// ================================
export async function addTask(formValues) {
  const newTask = {
    id: Date.now(),
    type: formValues.type,
    title: formValues.title,
    resources: formValues.resources,
    timeRequired: formValues.timeValue,
    timeUnit: formValues.type === "book" ? "pages" : "hours",
    date: formValues.dateValue,
    status: "pending",
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  await fetch(`${backendURL}/tasks`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify(newTask)
  });

  loadTasks();
}

// ================================
// Complete Task (BACKEND)
// ================================
export async function completeTask(id) {
  const res = await fetch(`${backendURL}/tasks/${id}`, {
    method: "PUT",
    headers: authHeader(),
    body: JSON.stringify({
      status: "completed",
      completedAt: new Date().toISOString()
    })
  });

  // server returns updated task and optionally updated streak
  try {
    const json = await res.json();
    if (json.streak) {
      window.currentUser = { ...(window.currentUser || {}), streak: json.streak };
    }
  } catch (e) {}

  loadTasks();
}

// ================================
// Undo Task (BACKEND)
// ================================
export async function undoTask(id) {
  const res = await fetch(`${backendURL}/tasks/${id}`, {
    method: "PUT",
    headers: authHeader(),
    body: JSON.stringify({
      status: "pending",
      completedAt: null
    })
  });

  try {
    const json = await res.json();
    if (json.streak) {
      window.currentUser = { ...(window.currentUser || {}), streak: json.streak };
    }
  } catch (e) {}

  loadTasks();
}

// ================================
// Delete Task (BACKEND)
// ================================
export async function deleteTask(id) {
  await fetch(`${backendURL}/tasks/${id}`, {
    method: "DELETE",
    headers: authHeader()
  });

  loadTasks();
}

// ================================
// Edit Task (BACKEND)
// ================================
export async function updateTask(id, updatedValues) {

  const existing = tasks.find(t => t.id === id);
  if (!existing) return;

  // Merge old data + new values
  const finalTask = {
    ...existing,
    ...updatedValues
  };

  const res = await fetch(`${backendURL}/tasks/${id}`, {
    method: "PUT",
    headers: authHeader(),
    body: JSON.stringify(finalTask)
  });

  try {
    const json = await res.json();
    if (json.streak) {
      window.currentUser = { ...(window.currentUser || {}), streak: json.streak };
    }
  } catch (e) {}

  loadTasks();
}

// ================================
// Helpers
// ================================
export function getTaskById(id) {
  return tasks.find(t => t.id === id);
}

export function getAllTasks() {
  return tasks;
}

// ================================
// Expose needed functions to global window (HTML onclick)
// ================================
window.addTask = addTask;
window.deleteTask = deleteTask;
window.completeTask = completeTask;
window.undoTask = undoTask;
window.updateTask = updateTask;
window.getTaskById = getTaskById;

