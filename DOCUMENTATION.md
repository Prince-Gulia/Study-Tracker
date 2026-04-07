# Study Tracker - Complete Project Documentation

## 📋 Project Overview

**Study Tracker** is a full-stack web application designed to help students track, manage, and monitor their study tasks and academic progress. It provides features like task management, statistics tracking, streak counting, theme customization, and data import/export capabilities.

- **Frontend**: Vanilla JavaScript with modular architecture and local storage persistence
- **Backend**: Node.js with Express, MongoDB for data persistence
- **Authentication**: JWT-based token authentication
- **Deployment**: Production-ready with CORS, security headers, rate limiting

---

## 🏗️ Project Structure

```
Study_Tracker/
├── backend/
│   ├── package.json                 # Backend dependencies & scripts
│   ├── server.js                    # Express server configuration
│   ├── config/
│   │   └── db.js                    # MongoDB connection setup
│   ├── middleware/
│   │   └── authMiddleware.js        # JWT authentication middleware
│   ├── models/
│   │   ├── User.js                  # User schema (MongoDB)
│   │   └── Task.js                  # Task schema (MongoDB)
│   ├── controllers/
│   │   ├── userController.js        # User CRUD operations
│   │   └── taskController.js        # Task CRUD + streak logic
│   └── routes/
│       ├── userRoutes.js            # User API endpoints
│       └── taskRoutes.js            # Task API endpoints
└── frontend/
    ├── package.json                 # Frontend dependencies
    ├── auth.js                      # Authentication form handlers
    ├── index.html                   # Main dashboard page
    ├── login.html                   # Login page
    ├── signup.html                  # Signup page
    ├── style.css                    # Dashboard styles
    ├── login_style.css              # Auth pages styles
    └── js/
        ├── app.js                   # Main app orchestrator
        ├── storage.js               # localStorage management
        ├── tasks.js                 # Task CRUD operations
        ├── stats.js                 # Statistics calculations
        ├── settings.js              # User settings & themes
        ├── charts.js                # Chart rendering (Chart.js)
        ├── importExport.js          # Backup/restore functionality
        └── utils.js                 # Utility functions
```

---

## 🔧 Backend Implementation

### 1. **server.js** - Express Server Setup

**Purpose**: Initializes and configures the Express server with security, middleware, and routing.

**Key Features**:
- CORS configuration with allowlist for secure cross-origin requests
- Security middleware: `helmet` (headers), `hpp` (HTTP parameter pollution), `compression`
- Rate limiting on `/api` endpoints (15 min window, 300 requests max)
- Body parser with 1mb limit
- Health check endpoint: `GET /health`

**Environment Variables Used**:
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT signing
- `PORT`: Server port (default: 5000)
- `CORS_ORIGINS`: Comma-separated list of allowed origins
- `TRUST_PROXY`: Set to "1" if behind a proxy
- `NODE_ENV`: Environment mode (production/development)

---

### 2. **config/db.js** - Database Connection

**Purpose**: Establishes connection to MongoDB.

```javascript
async function connectDB()
```
- Connects using `process.env.MONGO_URI`
- Logs "MongoDB Connected" on success
- Exits process on connection failure

---

### 3. **models/User.js** - User Schema

**MongoDB Schema Structure**:

```
User {
  username: String (unique, required)
  email: String (unique, required)
  password: String (hashed, required)
  course: String (e.g., "B.Tech CS")
  year: String (e.g., "2nd Year")
  examDate: String (ISO date)
  semEndDate: String (ISO date)
  institute: String (educational institution)
  streak: {
    count: Number (default: 0)
    lastStreakDay: String (ISO date or null)
  }
}
```

**Fields**:
- **username/email**: Unique identifiers for login
- **password**: Bcrypt-hashed for security
- **Academic Info**: course, year, institute, examDate, semEndDate
- **Streak**: Server-authoritative streak tracking with day-based rollover (3 AM cutoff)

---

### 4. **models/Task.js** - Task Schema

**MongoDB Schema Structure**:

```
Task {
  userId: ObjectId (ref to User, required)
  id: Number (timestamp-based ID)
  type: String (required) - "study", "skill", "book"
  title: String (required)
  resources: Array (URLs/links)
  timeRequired: Number (hours or pages)
  timeUnit: String - "hours" or "pages"
  date: String (due date, ISO format)
  status: String (default: "pending") - "pending" or "completed"
  createdAt: String (ISO timestamp)
  completedAt: String (ISO timestamp or null)
}
```

**Fields**:
- **userId**: Links task to authenticated user
- **type**: Task category (study/skill/book)
- **timeUnit**: Determined by task type (book = pages, others = hours)
- **Status Tracking**: pending → completed transitions
- **Timestamps**: Track creation and completion times for stats

---

### 5. **middleware/authMiddleware.js** - JWT Authentication

**Function**: `authMiddleware(req, res, next)`

**Flow**:
1. Extracts `Bearer <token>` from `Authorization` header
2. Verifies token using `process.env.JWT_SECRET`
3. Attaches `req.userId` (from decoded token's `id` field)
4. Calls `next()` on success
5. Returns 401 error if token missing, invalid, or expired

**Token Expiry**: 7 days

---

### 6. **controllers/userController.js** - User Operations

#### **registerUser(req, res)** - User Registration
- **Input**: `{ username, email, password, course, year }`
- **Process**:
  1. Check if email already exists
  2. Hash password with bcrypt (10 salt rounds)
  3. Create new user document
  4. Save to MongoDB
- **Output**: Success message or error
- **Error Handling**: Duplicate key error (11000) → 409 Conflict

#### **loginUser(req, res)** - User Login
- **Input**: `{ email, password }`
- **Process**:
  1. Find user by email
  2. Compare password with bcrypt hash
  3. If match: generate JWT token (expires in 7 days)
  4. Return token + user details (excluding password)
- **User Details Returned**: id, username, email, course, year, institute, examDate, semEndDate, streak

#### **getMe(req, res)** - Get Current User Profile
- **Auth**: Required (uses `authMiddleware`)
- **Input**: JWT token in Authorization header
- **Output**: Full user object (excluding password)
- **Purpose**: Fetch user profile for display/validation

#### **updateMe(req, res)** - Update User Profile
- **Auth**: Required
- **Input**: `{ username?, course?, year?, institute?, examDate?, semEndDate? }`
- **Process**:
  1. Find user by `req.userId`
  2. Update provided fields only
  3. Save updated document
  4. Return updated user (no password)
- **Purpose**: Allow users to modify academic/profile information

---

### 7. **controllers/taskController.js** - Task Operations & Streak Logic

#### **Helper: streakDayFromDate(input, rolloverHour = 3)**
- Computes logical "day" string (YYYY-MM-DD) with 3 AM rollover
- Subtracts rollover hour before formatting: times 00:00-02:59 belong to previous day
- Used for consistent streak day calculations

#### **createTask(req, res)** - Create New Task
- **Auth**: Required
- **Input**: Complete task object with form data
- **Process**:
  1. Attach `userId` from request
  2. Create Task document with auto-generated `id: Date.now()`
  3. Save to MongoDB
  4. Return created task
- **Note**: Streak not updated on creation

#### **getTasks(req, res)** - Fetch All User Tasks
- **Auth**: Required
- **Query**: `{ userId: req.userId }`
- **Output**: Array of all user's tasks
- **Sorting**: Done client-side by frontend

#### **updateTask(req, res)** - Update Task & Handle Streak
- **Auth**: Required
- **Key Logic**:
  1. Find existing task and detect status change
  2. Update task with new values
  3. **Streak Calculation** (server-authoritative):
     - **Case A: Task Completed** (any → completed)
       - If not already completed today:
         - If yesterday completed: `count++`
         - Else: `count = 1` (new streak)
       - Set `lastStreakDay = today`
     - **Case B: Task Undone** (completed → pending)
       - Check if this task's `completedAt` was the user's `lastStreakDay`
       - If no other completions that day: `count = 0, lastStreakDay = null` (streak break)
       - Else: streak unchanged
4. Return updated task + new streak (if changed)

**Output**: `{ task: {...}, streak?: {...} }`

#### **deleteTask(req, res)** - Delete Task
- **Auth**: Required
- **Query**: Delete where `id: taskId AND userId: req.userId`
- **Note**: No automatic streak adjustment on deletion

---

## 🎨 Frontend Implementation

### 1. **auth.js** - Authentication & Form Handling

**Purpose**: Manages signup/login forms and JWT token persistence.

**Configuration**:
```javascript
const backendURL = window.ENV?.API_BASE_URL || "http://localhost:5000/api"
```

#### **Signup Form Handler**
- **Endpoint**: `POST /api/register`
- **Fields Collected**: username, email, password, course, year
- **Success**: Redirect to login.html
- **Error**: Alert with error message

#### **Login Form Handler**
- **Endpoint**: `POST /api/login`
- **Fields Collected**: email, password
- **Success**:
  1. Store JWT token in `localStorage.token`
  2. Redirect to index.html (dashboard)
- **Error**: Alert with error message
- **Note**: Full user object NOT stored in localStorage (server is authoritative)

---

### 2. **storage.js** - Local Storage Management

**Purpose**: Persistent client-side storage for preferences and non-sensitive data.

**Storage Structure** (key: `"studyTrackerData"`):
```javascript
{
  schemaVersion: 1,
  academicInfo: {
    institute: String,
    examDate: String (ISO),
    semEndDate: String (ISO)
  },
  streak: {
    count: Number,
    lastStreakDay: String or null
  },
  settings: {
    theme: "dark" | "light" | "neon"
  }
}
```

**Key Functions**:

#### **loadData()**
- Reads from localStorage with fallback to in-memory storage
- Validates structure; returns defaults if corrupt
- Performs schema migrations automatically
- **Returns**: Valid data object with all required fields

#### **saveData(data)**
- Safely writes to localStorage
- Handles storage disabled (private mode) via in-memory fallback
- Returns boolean indicating success

#### **safeGetItem(key) / safeSetItem(key, value)**
- Wrapped localStorage access guarding against exceptions
- Maintains `inMemoryFallback` for offline/disabled storage

**Migration Strategy**:
- If schema version mismatch: merge with defaults
- Preserves unknown fields (forward-compatible)

---

### 3. **app.js** - Main Application Orchestrator

**Purpose**: Central hub coordinating all modules, user loading, and UI refresh.

**Initialization Flow**:
1. Check JWT token; redirect to login if missing
2. Load authenticated user from backend (`GET /api/me`)
3. Render user info (username, avatar, course/year)
4. Load all tasks from backend
5. Calculate and display stats
6. Render charts
7. Apply saved theme

**Key Functions**:

#### **async loadCurrentUser()**
- **Endpoint**: `GET /api/me`
- **Returns**: User object with normalized fields (all fields defaulted to "")
- **Error Handling**: Logs warning; returns null (allows app to continue)

#### **renderUser(user)**
- Updates DOM elements with user information:
  - **#navbar-username**: Display username
  - **.avatar**: First letter of username
  - **#navbar-user-details**: "Course • Year" format
  - **Sidebar info**: Institute, exam date, semester date
- Uses server data with fallback to localStorage

#### **refreshAllUI()**
- Central entry point for all UI updates
- Calls:
  1. `Tasks.renderTasks()` - Refresh task list
  2. `Stats.refreshStatsData/updateStatsUI()` - Update aggregate stats
  3. `Stats.updateTodayStatsUI()` - Refresh today-specific stats
  4. `Stats.updateStreakUI()` - Update streak display
  5. `Charts.updateAllCharts()` - Redraw all charts
  6. `Settings.updateAcademicUI()` - Refresh academic info display

#### **Global Window Functions** (for inline HTML event handlers):
- `completeTask(id)` → mark task done
- `undoTask(id)` → revert completion
- `deleteTask(id)` → delete with confirmation
- `editTask(id)` → open edit modal
- `openResources(id)` → show resource links

**Modal Handlers**:
- **Edit Modal**: Collect title, resources, time, date; call `Tasks.updateTask()`
- **Resource Modal**: Display task resource links in modal
- **Settings Modal**: Open/close settings form
- **Theme Selection**: Apply theme on click

**Sort Selection**: Delegate to `Tasks.setSort()` for task reordering

**Navigation Toggle**: Mobile hamburger menu with ARIA attributes

**User Dropdown**: Toggle on user card click; close on outside click or Escape key

**Logout**: Clear token and redirect to login

---

### 4. **storage.js** - Data Persistence

*See detailed section above*

---

### 5. **tasks.js** - Task Management

**Purpose**: Client-side task CRUD wrapper around backend API.

**Internal State**:
```javascript
let tasks = [];           // All user tasks fetched from backend
let currentSort = "recent";
let onTasksUpdated = () => {}; // Callback when tasks change
```

**Key Functions**:

#### **async loadTasks()**
- **Endpoint**: `GET /api/tasks`
- **Process**:
  1. Fetch all tasks from backend
  2. Normalize `id` field (handle both `id` and `_id`)
  3. Store in local `tasks` array
  4. Call `renderTasks()`
  5. Trigger `onTasksUpdated()` callback

#### **setSort(type)**
- Updates `currentSort`: "recent", "oldest", "duesoon", "dueLatest"
- Re-renders tasks with new sort order

#### **sortTasks(arr)**
- **recent**: Sort by creation date (newest first)
- **oldest**: Sort by creation date (oldest first)
- **duesoon**: Sort by due date (soonest first)
- **dueLatest**: Sort by due date (latest first)

#### **renderTasks()**
- Clears task container
- Sorts tasks + separates completed (to bottom)
- For each task, generate HTML:
  - Task type badge (color-coded)
  - Title + metadata (time + due date)
  - Action buttons: Resources, Done/Undo, Edit, Delete
- Adds animation class on insert

#### **async addTask(formValues)**
- **Input**: `{ type, title, resources[], timeValue, dateValue }`
- **Process**:
  1. Create task object with `id: Date.now()`
  2. Set `status: "pending"`, `createdAt: now()`
  3. Determine `timeUnit` (book → "pages", else → "hours")
  4. POST to backend
  5. Call `loadTasks()` to refresh
- **Endpoint**: `POST /api/tasks`

#### **async completeTask(id)**
- **Process**:
  1. PUT task with `status: "completed", completedAt: now()`
  2. If response contains streak: update `window.currentUser.streak`
  3. Reload tasks
- **Endpoint**: `PUT /api/tasks/{id}`

#### **async undoTask(id)**
- **Process**: Same as complete but `status: "pending", completedAt: null`
- **Endpoint**: `PUT /api/tasks/{id}`

#### **async deleteTask(id)**
- **Endpoint**: `DELETE /api/tasks/{id}`
- **Confirm**: Ask user before deletion
- **Process**: Delete from backend, reload tasks

#### **async updateTask(id, updatedValues)**
- **Input**: Partial update object
- **Process**:
  1. Find existing task locally
  2. Merge old + new values
  3. PUT merged object to backend
  4. If response contains streak: update `window.currentUser.streak`
  5. Reload tasks
- **Note**: Type and timeUnit must be preserved

#### **getTaskById(id)** / **getAllTasks()**
- Helpers for other modules to access task data

#### **authHeader()**
- Returns `{ Authorization: "Bearer <token>", "Content-Type": "application/json" }`

---

### 6. **stats.js** - Statistics & Analytics

**Purpose**: Compute stats from tasks and display in UI.

**Key Functions**:

#### **updateStatsUI()**
- Reads task list from `Tasks.getAllTasks()`
- Computes:
  - `total`: Task count
  - `completed`: Count of completed tasks
  - `percent`: (completed / total) * 100
- Updates DOM:
  - **#total-tasks**, **#total-meta**
  - **#completed-tasks**, **#completed-meta**
  - **#effort-score**: Percentage string
  - **#progress-fill**: Width percentage

#### **getTodayStats()**
- Uses `getCurrentDay()` from utils
- Counts:
  - `createdToday`: Tasks with `createdAt` starting with today's date
  - `completedToday`: Tasks with `completedAt` starting with today's date
- **Returns**: `{ createdToday, completedToday }`

#### **updateTodayStatsUI()**
- Calls `getTodayStats()`
- Displays in **#today-progress-box**:
  - Completed Today: count
  - Created Today: count
  - Efficiency: (completedToday / createdToday) * 100%

#### **updateStreakUI()**
- Reads streak from `window.currentUser?.streak` (server-authoritative)
- Falls back to `localStorage` streak
- Displays count in **#consistency** element

#### **updateStreak()**
- Triggered when user completes task
- Syncs server streak to localStorage
- Calls `updateStreakUI()`

#### **refreshStatsData()**
- Called by app.js before UI refresh
- Reloads local data from storage

---

### 7. **settings.js** - User Settings & Theme Management

**Purpose**: Manage app themes, user profile, and academic information display.

**Themes Available**:
```javascript
const themes = {
  dark: { bg, card, text, muted, accent, accent_2, glass, glass_2 },
  light: { ... },
  neon: { ... }
}
```

**Key Functions**:

#### **applyTheme(themeName)**
- Applies CSS variables to document root:
  - `--bg`, `--card`, `--text`, `--muted`, `--accent`, etc.
- Updates visual appearance globally

#### **updateAcademicUI()**
- Populates academic date/info elements:
  - **Days Left (Exam)**: `getDaysDifference(examDate)`
  - **Days Left (Semester)**: `getDaysDifference(semEndDate)`
  - **Exam Date**: Display date string
  - **Semester Date**: Display date string
  - **Institute**: Display institute name
- Priority: `window.currentUser` > `localStorage` fallback

#### **openSettings()**
- Opens settings modal with current values:
  - Username, course, year, institute (from server)
  - Dates (exam, semester) from server or localStorage
- Highlights current theme button
- Note: Does NOT persist full user object to localStorage

#### **closeSettings()**
- Closes settings modal

#### **async saveSettingsChanges()**
- **Process**:
  1. Collect form values
  2. PUT to `PUT /api/me` with profile update
  3. If success:
     - Refresh user object from response
     - Update `window.currentUser`
     - Call `renderUser()` to refresh UI
     - Save academic info locally (fallback)
     - Close modal
  4. If failure:
     - Show error alert
     - Offer helpful message for duplicate username
- **Returns**: boolean (success/failure)

#### **initThemeButtons()**
- Attach click handlers to `.theme-btn` elements
- On click:
  1. Remove "active" from all buttons
  2. Add "active" to clicked button
  3. Load data, update settings, apply theme
  4. Save to localStorage

---

### 8. **charts.js** - Data Visualization

**Purpose**: Render interactive charts using Chart.js library.

**Chart Types**:
1. **Line Chart**: Created vs Completed tasks over time
2. **Pie Chart**: Task type distribution
3. **Bar Chart**: Task count by type

**Key Functions**:

#### **getLineChartData(days = 7)**
- Iterates over tasks, groups by creation and completion dates
- For each day in range (past N days):
  - Count tasks created that day
  - Count tasks completed that day
- **Returns**: `{ dates: [...], created: [...], completed: [...] }`

#### **getPieChartData()**
- Groups tasks by `type` field
- **Returns**: `{ labels: [types...], values: [counts...] }`

#### **getBarChartData()**
- Groups tasks by `type` field
- **Returns**: `{ labels: [types...], totals: [counts...] }`

#### **renderLineChart(data)**
- Destroys existing chart instance (if any)
- Creates new Chart.js line chart:
  - X-axis: Dates
  - Y-axis: Task count
  - Series: "Created" (blue), "Completed" (green)
  - Tension: 0.3 (smooth curves)
  - Legend: Bottom position

#### **renderPieChart(data)**
- Creates doughnut chart (cutout 65%):
  - Dynamic color palette (8 colors, cycles if more types)
  - No borders
  - Legend at bottom
  - Displays task type distribution

#### **renderBarChart(data)**
- Creates bar chart:
  - X-axis: Task types
  - Y-axis: Task count
  - Grouped by type

#### **updateAllCharts()**
- Re-renders all three charts with latest data

#### **getChartData()**
- Returns both 7-day and 30-day line chart datasets
- Used by chart period selector

---

### 9. **importExport.js** - Backup & Restore

**Purpose**: Allow users to export app state and import previous backups.

**Backup Format**:
```json
{
  "schemaVersion": 1,
  "academicInfo": { ... },
  "streak": { ... },
  "settings": { theme: "..." },
  "tasks": [ ... ]
}
```

**Key Functions**:

#### **exportBackup()**
- Loads current data from `loadData()`
- Converts to JSON with 2-space indent
- Creates Blob and downloads as "study-tracker-backup.json"
- Cleans up object URL

#### **importBackup(file)**
- Reads file as text
- Parses JSON (safe parse with error handling)
- Validates backup structure:
  - Must have `tasks` array
  - Must have `settings` object (or allowed to skip)
  - Tasks must have `id`, `title`, `createdAt` fields
- **Hybrid Restore**:
  1. Replace `settings` if present
  2. Replace `academicInfo` if present
  3. Replace `streak` if present
  4. Merge `tasks` (avoiding duplicates using `mergeTasks()`)
- Saves merged data, alerts user, triggers `onImportSuccess()` callback

#### **initImportSystem()**
- Wires up export button → `exportBackup()`
- Wires up import button → hidden file input
- On file selection → call `importBackup()`

#### **setImportCallback(cb)**
- Register callback to trigger on successful import (UI refresh)

---

### 10. **utils.js** - Utility Functions

**Purpose**: Reusable helper functions for date/time, validation, and parsing.

#### **getCurrentDay()**
- Returns today's date as ISO string (YYYY-MM-DD)
- Business rule: if hour >= 3 AM → same day, else → previous day
- **Returns**: String (YYYY-MM-DD)

#### **getDaysDifference(targetDateString)**
- Calculates days between target date and today (midnight to midnight)
- Normalizes both dates to midnight before computing
- **Returns**: Number (positive if future, negative if past)

#### **formatDaysText(daysLeft)**
- Converts days-left number to user-friendly text:
  - Negative: "Exam Passed"
  - 0: "Your Exam is Today"
  - 1: "Your Exam is Tomorrow"
  - Else: "N days Left"

#### **safeParseJSON(jsonString, defaultValue = null)**
- Safely parses JSON
- Returns `defaultValue` on error (prevents exceptions)

#### **validateBackupShape(obj)**
- Validates backup structure:
  - Must be object
  - Must have `tasks` array
  - Must have `settings` object
  - First task (if exists) must have `id`, `title`, `createdAt`
- **Returns**: `{ ok: boolean, reason?: string }`

---

### 11. **HTML Pages**

#### **index.html** - Main Dashboard
- **Structure**:
  - Navbar with user info, settings, logout
  - Sidebar: Add task form, quick stats, sorting
  - Main content: Task list
  - Secondary panels: Today stats, streak, charts, academic dates
- **Modals**:
  - Edit task modal
  - Resource viewer modal
  - Settings modal
- **Mobile**: Hamburger menu with navigation toggle

#### **login.html** - Login Page
- Login form with email/password
- Link to signup page
- Loads `auth.js` for form handling
- API endpoint configuration via `window.ENV.API_BASE_URL`

#### **signup.html** - Signup Page
- Registration form with username, email, password, course, year
- Link to login page
- Loads `auth.js` for form handling

---

## 🔄 Data Flow Architecture

### Authentication Flow
```
User visits app.js
  → Check localStorage for JWT token
    → If missing: Redirect to login.html
    → If present: Continue to dashboard

Login Form → POST /api/login
  ← { token, user }
  → Store token in localStorage
  → Redirect to index.html (app.js)

app.js init()
  → Load currentUser: GET /api/me (with JWT header)
  ← { id, username, email, course, ... }
  → Store in window.currentUser
  → Render navbar with user info
```

### Task CRUD Flow
```
User submits Add Task form
  → Collect: type, title, resources, time, date
  → POST /api/tasks { ...taskData }
  ← { task }
  → Call loadTasks() to refresh
  → refreshAllUI() to update stats/charts

User clicks "Done" on task
  → PUT /api/tasks/{id} { status: "completed", completedAt: now() }
  ← { task, streak? }
  → If streak in response: Update window.currentUser.streak
  → Call loadTasks() + refreshAllUI()

User clicks "Edit"
  → Open modal with task fields
  → Save changes
  → PUT /api/tasks/{id} { ...updates }
  ← { task, streak? }
  → Reload and refresh UI
```

### Streak Calculation Flow (Server-Authoritative)
```
User completes first task today (time: 10:45 AM, after 3 AM rollover)
  → POST task mark as completed
  → Backend: streakDay = today (e.g., 2025-01-22)
    - If user.streak.lastStreakDay === yesterday:
      - count++ (e.g., 1 → 2)
    - Else:
      - count = 1 (new streak)
    - lastStreakDay = today
  → Response includes updated streak: { count: 2, lastStreakDay: "2025-01-22" }
  → Frontend updates: window.currentUser.streak = { count: 2, ... }
  → updateStreakUI() displays "2"

User undoes task (or task from today)
  → PUT task mark as pending
  → Backend: Check if this task's completedAt was lastStreakDay
    - If YES and no other completions today:
      - count = 0 (streak break)
      - lastStreakDay = null
    - Else: no change
  → Response includes streak update
  → Frontend refreshes display
```

### Settings Update Flow
```
User opens settings modal
  → Populate from window.currentUser (server data)
  → Show localStorage fallback for academic info

User changes settings + clicks Save
  → Collect form values
  → PUT /api/me { username, course, year, institute, examDate, semEndDate }
  ← { user } (updated user from server)
  → Update window.currentUser
  → Save academic info to localStorage (fallback)
  → renderUser() to update navbar
  → updateAcademicUI() to refresh dates/institute display
```

### Theme Application Flow
```
app.js init()
  → loadData() from localStorage
  → Get data.settings.theme (e.g., "dark")
  → applyTheme("dark")
    → Set all CSS variables (--bg, --card, --text, etc.)

User clicks theme button
  → Add "active" class to button
  → applyTheme(themeName)
  → updateSettings(data, { theme: themeName })
  → saveData(data) to localStorage
```

### Statistics Refresh Flow
```
Every time task list changes or refreshUI is called:
  → Tasks.renderTasks()       # Update task DOM
  → Stats.refreshStatsData()  # Reload storage data
  → Stats.updateStatsUI()     # Compute + display total/completed/percent
  → Stats.updateTodayStatsUI() # Today's created/completed/efficiency
  → Stats.updateStreakUI()    # Display streak from window.currentUser
  → Charts.updateAllCharts()  # Redraw all 3 charts
```

---

## 🔐 Security Features

### Backend Security
1. **JWT Authentication**: All task/me endpoints require valid Bearer token
2. **Password Hashing**: Bcrypt with 10 salt rounds
3. **Helmet.js**: Security headers (CSP, X-Frame-Options, etc.)
4. **CORS Whitelist**: Only approved origins can make requests
5. **Rate Limiting**: 300 requests per 15 minutes on `/api`
6. **HPP Protection**: HTTP parameter pollution prevention
7. **Compression**: Gzip reduces payload size
8. **Body Size Limit**: 1MB max to prevent large payloads

### Frontend Security
1. **Token-Only Storage**: JWT stored in localStorage, full user object in memory only
2. **No Sensitive Data in localStorage**: Only preferences and non-sensitive state
3. **CSRF**: Token passed in header (not cookie), safe from CSRF
4. **XSS Mitigation**: No dangerous `innerHTML` with user input (mostly using textContent)
5. **Input Validation**: Form fields validated before sending to backend

---

## 📱 Client Architecture

### Module Independence
- **tasks.js**: No knowledge of stats, charts, or settings
- **stats.js**: Reads from tasks.js, independent of settings
- **charts.js**: Uses tasks.js data, independent of stats/settings
- **settings.js**: Only manages theme/academic UI display
- **storage.js**: Pure data layer, no business logic

### Callback System
- `Tasks.setUpdateCallback()`: Modules subscribe to task changes
- `Stats.setStatsCallback()`: Modules subscribe to stat updates
- `ImportExport.setImportCallback()`: Trigger UI refresh on import

### Error Handling
- **Network Errors**: Logged to console, user alerted if critical
- **localStorage Access**: Graceful degradation with in-memory fallback
- **Missing Backend**: App continues with cached data
- **Invalid JWT**: Redirect to login.html

---

## 🚀 Deployment Notes

### Environment Variables (Backend)
```bash
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
JWT_SECRET=your-secret-key
PORT=5000
CORS_ORIGINS=https://frontend.com,http://localhost:3000
TRUST_PROXY=1 (if behind nginx/reverse proxy)
NODE_ENV=production
```

### Frontend Configuration
- Set `window.ENV.API_BASE_URL` in HTML for different environments
- Build uses imported modules (ES6)
- Requires modern browser (async/await, fetch, localStorage)

### Production Checklist
- [ ] Enable HTTPS on both frontend and backend
- [ ] Set secure CORS_ORIGINS
- [ ] Use strong JWT_SECRET
- [ ] Enable rate limiting
- [ ] Monitor error logs
- [ ] Backup MongoDB regularly
- [ ] Set NODE_ENV=production
- [ ] Configure TRUST_PROXY if behind load balancer

---

## 📊 Database Relationships

```
User (1) ──────→ (Many) Task
  _id              userId
  email            
  username         
  streak           
  ...              
```

- **User**: Single document per registered user
- **Task**: Multiple documents per user (indexed by userId for fast queries)
- **Cascade**: Deleting user doesn't auto-delete tasks (optional: add cascade delete)

---

## 🎯 Key Design Decisions

1. **Server-Authoritative Streak**: Prevents client-side manipulation
2. **3 AM Rollover**: Accommodates students studying late at night
3. **No Full User localStorage**: Token is sufficient; server is authoritative
4. **Hybrid Import**: Merge tasks, replace settings (conflict-free)
5. **Modular Frontend**: Each module can be tested independently
6. **Callback Pattern**: Loose coupling between modules
7. **Safe localStorage**: In-memory fallback for private browsing
8. **UTC Dates**: Consistent across timezones

---

## 🛠️ Development Tips

### Adding New Task Property
1. Update `Task.js` schema
2. Update `addTask()` in `tasks.js` to include new property
3. Update `renderTasks()` to display it
4. Update edit modal if needed

### Adding New User Property
1. Update `User.js` schema
2. Update `registerUser()` and `updateMe()` in userController
3. Update `renderUser()` in app.js to display it
4. Update settings form and `saveSettingsChanges()` if user-editable

### Adding New Stats
1. Add calculation function in `stats.js`
2. Add DOM element in `index.html`
3. Call from `updateStatsUI()` or `refreshStatsData()`
4. Include in `refreshAllUI()` if needed

### Adding New Theme
1. Add color object to `themes` in `settings.js`
2. Add theme button in HTML (optional)
3. Update `initThemeButtons()` if needed

---

## 📝 Code Quality Notes

- **Comments**: Extensive JSDoc comments on functions
- **Error Handling**: Try-catch blocks on network requests
- **Validation**: Schema validation on both frontend and backend
- **Performance**: Task list renders only visible items (not paginated but could be optimized)
- **Accessibility**: ARIA labels on buttons, semantic HTML, skip links

---

## 🐛 Known Issues & Limitations

1. **No Real-Time Sync**: Changes only reflected when refreshing
2. **Pagination**: No pagination on task list (could slow down with 1000+ tasks)
3. **Offline Mode**: Limited offline capability (could use Service Workers)
4. **Timezone**: All dates treated as local timezone
5. **Mobile**: Mobile UI could be further optimized

---

## 📚 Learning Resources

- **Express.js**: Backend routing and middleware
- **MongoDB/Mongoose**: Database schema and queries
- **JWT**: Stateless authentication
- **Chart.js**: Data visualization
- **localStorage API**: Client-side persistence
- **ES6 Modules**: Frontend architecture

---

**Generated**: January 22, 2026
**Version**: 1.0
**Status**: Production Ready

