let studyTrackerData = JSON.parse(localStorage.getItem("studyTrackerData")); //For Handling all the User's data in one object

if(!studyTrackerData) {
  // Collecting Old data from storage
  const oldTasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const oldStreak = JSON.parse(localStorage.getItem("streak")) || 0;
  const oldLastStreakDay = JSON.parse(localStorage.getItem("lastStreakDay")) || null;

  // Creating the Structure to store all the User's data (Not the structure for storing the TASK's data that's different)

  studyTrackerData = {
    tasks : oldTasks,
    academicInfo : {
      institute : "Not Mentioned",
      examDate : "2025-12-08",
      semEndDate : "2025-12-08",
    },
    streak : {
      count : oldStreak,
      lastStreakDay : oldLastStreakDay
    },
    settings : {
      theme : "dark",
      username : "Prince",
      course : "BCA",
      year : "2nd Year"
    }
  };

  localStorage.setItem("studyTrackerData" , JSON.stringify(studyTrackerData));
}

// Variables to destroy the previous charts if existed before
let lineChart = null;
let pieChart = null;
let barChart = null;

// Accessing the Form Elements
const taskForm = document.querySelector(".task-form");
const taskType = document.getElementById("task-type");
const taskTitle = document.getElementById("detail-input");
const taskResources = document.getElementById("resources");
const taskTime = document.getElementById("amount");
const taskDate = document.getElementById("due-date");

// Accessing the Elements to update after form handling
const completedMeta = document.getElementById("completed-meta");
const totalMeta = document.getElementById("total-meta");
const effortScore = document.getElementById("effort-score");
const progressFill = document.getElementById("progress-fill");
const leftSideTotalMeta = document.getElementById("total-tasks");
const leftSideCompletedMeta = document.getElementById("completed-tasks");

// Accessing the Task which we want to edit

let editingTaskID = null;

// Accessing the Sort by value

let currentSort = "recent"; //By default it will show it in sequence

// Creating the Academic Info Object we need to show the countdown and details rergarding institution

let academicInfo = studyTrackerData.academicInfo;

//Creating the Variables for maintaining Streak and Last day streak to not over write one day streak twice
let streak = studyTrackerData.streak.count;
let lastStreakDay = studyTrackerData.streak.lastStreakDay;

// Loading Existing Files
let tasks = studyTrackerData.tasks;

// Accessing the task list Container
const taskListContainer = document.querySelector("#task-list");

// Render Function that will make our tasks go to our web page
function renderTasks() {
  taskListContainer.innerHTML = "";

  // If there are no tasks yet
  if (tasks.length === 0) {
    taskListContainer.innerHTML = `
            <div style = "color:var(--muted); font-size:14px; margin-top:10px">
                No Tasks added yet.
            </div>
        `;

    return;
  }

  const orderedMannerTasks = sortTasks(tasks.slice());

  // move completed tasks to bottom after sorting
  orderedMannerTasks.sort(
    (a, b) => (a.status === "completed") - (b.status === "completed")
  );

  // If there are Tasks exixts
  orderedMannerTasks.forEach((task) => {
    const isCompleted = task.status === "completed";

    const taskHTML = `
            <div class="task-item ${isCompleted ? "completed" : ""}">
                <div class="task-type type-${task.type}">
                    ${task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                </div>
                
                <div class="task-body">
                    <div class="task-title ${
                      isCompleted ? "title-completed" : ""
                    }">${task.title}</div>
                    <div class="task-meta">${task.timeRequired} ${task.timeUnit} • Due : ${task.date}</div>
                </div>

                <div class="task-actions">
                    <button class="btn-ghost" onclick="openResources(${task.id})">Resources</button>
                    ${isCompleted 
                        ? `<button class="btn-ghost undo" onclick="undoTask(${task.id})">Undo</button>`
                        : `<button class="btn-ghost" onclick="completeTask(${task.id})">Done</button>`
                    }
                    <button class="btn-ghost" onclick="editTask(${task.id})">Edit</button>
                    <button class="btn-ghost danger" onclick="deleteTask(${task.id})">Delete</button>
                </div>
            </div>
        `;

    taskListContainer.insertAdjacentHTML("beforeend", taskHTML);
    const inserted = taskListContainer.lastElementChild;
    setTimeout(() => inserted.classList.add("show"), 10);
  });

  updateStats();
  updateTodayStatsUI();
  updateStreak();
  updateAllCharts();
}

// Function for getting the difference between dates

function getDaysDifference (targetDateString) {
    const today = new Date();
    const target = new Date(targetDateString);

    today.setHours(0,0,0,0);
    target.setHours(0,0,0,0);

    const diffMs = target - today; //here we are getting our difference in Milliseconds

    return Math.floor(diffMs / (1000 * 60 * 60 * 24)); //Millisecond * minutes * hour * number of Hours in a day
}

// Function to return the message on the basis of the number of days left

function formatDaysText (daysLeft) {
    if (daysLeft < 0) return "Exam Passed";
    if(daysLeft === 0) return "Your Exam is Today";
    if (daysLeft === 1) return "Your Exam is Tomorrow";
    return `${daysLeft} days Left`;
}

// Function to update the UI of the Exam and Sem countdown

function updateAcademicUI () {

    // Accesing the elements for UOdating the UI
    const examSpan = document.querySelector(".days-left-exam");
    const semSpan = document.querySelector(".days-left-sem");

    // Calculating the difference of days we have
    const examDaysLeft = getDaysDifference(academicInfo.examDate);
    const semDaysLeft = getDaysDifference(academicInfo.semEndDate);

    // Updating the Difference calculated in our UI
    examSpan.textContent = formatDaysText(examDaysLeft);
    semSpan.textContent = formatDaysText(semDaysLeft);
}

// Function For getting the data for analysis like type of the task and the status and their counters to analyse
function getAnalysis() {
  const taskRecords = {
    skill: { completed: 0, incomplete: 0, percentage: 0 },
    study: { completed: 0, incomplete: 0, percentage: 0 },
    book: { completed: 0, incomplete: 0, percentage: 0 },
  };

  tasks.forEach((task) => {
    let type = task.type;

    if (!taskRecords[type]) return;

    if (task.status === "completed") {
      taskRecords[type].completed++;
    } else {
      taskRecords[type].incomplete++;
    }
  });

  Object.keys(taskRecords).forEach((type) => {
    //It provides us an array based on the keys -> types of tasks i.e -> study : {object which holds the key value pairs of completed, incomplete and percentage}
    const { completed, incomplete } = taskRecords[type]; // It is Destructuring, where we are creating 2 variables with this

    // completed = taskRecords[type]completed
    // incomplete = taskRecords[type]incomplete
    // It is same as what we wrote above

    const total = completed + incomplete;

    taskRecords[type].percentage =
      total === 0 ? 0 : Math.round((completed / total) * 100);
  });

  return taskRecords;
}

// Completed Task function after user completes the task
function completeTask(taskID) {
  const atIndex = tasks.findIndex((task) => task.id === taskID);

  if (atIndex === -1) return;

  if (tasks[atIndex].status === "completed") return;

  tasks[atIndex].status = "completed";
  tasks[atIndex].completedAt = new Date().toISOString();

  studyTrackerData.tasks = tasks;
  localStorage.setItem("studyTrackerData", JSON.stringify(studyTrackerData));


  renderTasks();
  updateStats();
  updateTodayStatsUI();
  updateStreak();
  updateAllCharts();
}

// Function for Undo Task 
function undoTask (taskID) {
    const task = tasks.find( t => t.id === taskID);

    if (!task) return;

    task.status = "pending";
    task.completedAt = null;

    studyTrackerData.tasks = tasks
    localStorage.setItem("studyTrackerData", JSON.stringify(studyTrackerData));

    renderTasks();
    updateStats();
    updateTodayStatsUI();
    updateStreak();
    updateAllCharts();
}

// Function for Deleting the Task
function deleteTask(taskID) {
  tasks = tasks.filter((t) => t.id !== taskID);

  studyTrackerData.tasks = tasks;
  localStorage.setItem("studyTrackerData", JSON.stringify(studyTrackerData));


  renderTasks();
  updateStats();
  updateTodayStatsUI();
  updateStreak();
  updateAllCharts();
}

// Update stats function where all the stats will be updated after form submit or task completion
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;

  // Updating the Text first from main section (Right)
  totalMeta.textContent = total;
  completedMeta.textContent = completed;

  // Updating the Text from the side bar section (Left)
  leftSideTotalMeta.textContent = total;
  leftSideCompletedMeta.textContent = completed;

  const effortPercent = total === 0 ? 0 : Math.round((completed / total) * 100); //For Avoiding Zero Division

  effortScore.textContent = effortPercent + "%"; //Adding The effort at the right side of the bar

  progressFill.style.width = effortPercent + "%"; //Updating the CSS for progress bar
}

// Function To get the Current day (if it's a new day or the current day)
function getCurrentDay() {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 3) {
    // Means it's the next day
    return now.toISOString().split("T")[0]; //It creates an array that is split by Time part and will send the date -> YYYY/MM/DD
  }

  // If it's still a current day
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

// Function that will count today's completion and today's total tasks
function getTodayStats() {
  const today = getCurrentDay();

  let completedToday = 0;
  let createdToday = 0;

  tasks.forEach((task) => {
    const createdDate = task.createdAt.split("T")[0];
    if (createdDate === today) {
      createdToday++;
    }

    if (task.completedAt) {
      const completedDate = task.completedAt.split("T")[0];
      if (completedDate === today) {
        completedToday++;
      }
    }
  });

  return {
    completedToday,
    createdToday,
  };
}

// Function for Displaying the Stats for this completion and Pending
function updateTodayStatsUI() {
  const { completedToday, createdToday } = getTodayStats();

  const todayBox = document.getElementById("today-progress-box");

  todayBox.innerHTML = `
        <div style="font-size:14px; line-height:1.6;">
            <strong>Completed Today:</strong> ${completedToday} <br>
            <strong>Created Today:</strong> ${createdToday} <br>
            <strong>Efficiency:</strong> ${
              createdToday === 0
                ? "0%"
                : Math.round((completedToday / createdToday) * 100) + "%"
            }
        </div>
    `;
}

// Function for Editing Task
function editTask(taskID) {
  editingTaskID = taskID;

  // Accessing the task from the tasks to edit
  const task = tasks.find((t) => t.id === taskID);

  if (!task) return;

  // Accessing all the elements and providing their previous values for user to change

  document.getElementById("edit-title").value = task.title;
  document.getElementById("edit-resources").value = task.resources.join(", ");
  document.getElementById("edit-time").value = task.timeRequired;
  document.getElementById("edit-date").value = task.date;

  const timeLabel = document.getElementById("edit-time-label");
  timeLabel.textContent = (task.type === "book") ? "Pages" : "Hours";

  // Making our pop up form appear and visible for our user

  document.getElementById("edit-modal").style.display = "flex";

  // Making it disapper if user enters cancel

  document.getElementById("edit-cancel").addEventListener("click", () => {
    document.getElementById("edit-modal").style.display = "none";
  });
  updateAllCharts();
}

// Making our changes saved as a new Task in our storage

document.getElementById("edit-save").addEventListener("click", () => {
  const saveBtn = document.getElementById("edit-save");

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";
  saveBtn.classList.add("saving");

  const task = tasks.find((t) => t.id === editingTaskID);
  if (!task) return;

  // Collecting the new data if task ID exists
  task.title = document.getElementById("edit-title").value.trim();
  task.resources = document
    .getElementById("edit-resources")
    .value.split(",")
    .map((r) => r.trim());
  task.timeRequired = parseInt(document.getElementById("edit-time").value);
  task.date = document.getElementById("edit-date").value;

  // Saving and rendering again to show the updated Task

  studyTrackerData.tasks = tasks;
  localStorage.setItem("studyTrackerData", JSON.stringify(studyTrackerData));

  setTimeout(() => {
        renderTasks();
        
        document.getElementById("edit-modal").style.display = "none";

        // reset button
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Changes";
        saveBtn.classList.remove("saving");
  }, 350);
});

// Sort button event Handler

document.getElementById("sort-select").addEventListener("change", (e) => {
  currentSort = e.target.value;
  renderTasks(); // re-render with new sort order
});

// Function for the sorting of our task in our right section

function sortTasks(taskArray) {
  if (currentSort === "recent") {
    return taskArray.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  if (currentSort === "oldest") {
    return taskArray.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  }

  if (currentSort === "duesoon") {
    return taskArray.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  if (currentSort === "dueLatest") {
    return taskArray.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  return taskArray;
}

// Function For Resources Opening Modal

function openResources(taskID) {
  const task = tasks.find((t) => t.id === taskID);
  if (!task) return; //Means Task did not found

  const listDiv = document.getElementById("resource-list");
  listDiv.innerHTML = "";

  if (task.resources.length === 0) {
    listDiv.innerHTML = `<div style="color:var(--muted);font-size:14px">No Resources Added</div>`;
  } else {
    task.resources.forEach((link) => {
      listDiv.innerHTML += `
                <a href="${link}" target="_blank" style="
                    color:var(--accent);
                    text-decoration:underline;
                    font-size:14px;
                    word-break:break-all;
                ">
                ${link} 
                </a> 
            `;
    });
  }

  document.getElementById("resource-modal").style.display = "flex";
}

// Function for Updating the streak and maintaining it

function updateStreak() {
  // We will use the getCurrentDay() to get today's day and if it is same as lastStreakDay then we won't change the consistency but if the day is another then we will change streak

  const today = getCurrentDay();

  if (today === lastStreakDay) return;

  const { completedToday, createdToday } = getTodayStats();

  const efforts =
    createdToday === 0 ? 0 : Math.floor((completedToday / createdToday) * 100);

  if (efforts >= 75) {
    streak++;
  } else {
    streak = 0;
  }

  lastStreakDay = today;

  studyTrackerData.streak.count = streak;
  studyTrackerData.streak.lastStreakDay = lastStreakDay;

  localStorage.setItem("studyTrackerData", JSON.stringify(studyTrackerData));

  updateStreakUI();
}

// Function to update the UI for the streak

function updateStreakUI() {
  const consistency = document.getElementById("consistency");
  consistency.textContent = streak;
}

// For Closing the Resource Modal

document.getElementById("resource-close").addEventListener("click", () => {
  document.getElementById("resource-modal").style.display = "none";
});

// Function to get the data for CHARTS
function getChartData() {
  const analysis = getAnalysis();

  // Modifying the data according to our uses :

  // 1st for Pie Chart of completion/Incompletion or Ratio of every task completion

  const categoryPerformance = {
    labels: ["Skill", "Study", "Book"],
    completed: [
      analysis.skill.completed,
      analysis.study.completed,
      analysis.book.completed,
    ],
    incomplete: [
      analysis.skill.incomplete,
      analysis.study.incomplete,
      analysis.book.incomplete,
    ],
    percentage: [
      analysis.skill.percentage,
      analysis.study.percentage,
      analysis.book.percentage,
    ],
  };

  // Data for Bar Chart

  const categoryDistribution = {
    labels: ["Skill", "Study", "Book"],
    totals: [
      categoryPerformance.completed[0] + categoryPerformance.incomplete[0],
      categoryPerformance.completed[1] + categoryPerformance.incomplete[1],
      categoryPerformance.completed[2] + categoryPerformance.incomplete[2],
    ],
  };

  // Data for the line chart to see the progress over 7 days or 30 days

  let dailyStats = {};

  // This loop is for getting all the dates from the data

  tasks.forEach((task) => {
    let createdDate = task.createdAt.split("T")[0];

    if (!dailyStats[createdDate]) {
      dailyStats[createdDate] = { created: 0, completed: 0 };
    }
    dailyStats[createdDate].created++;

    if (task.completedAt !== null) {
      let completedDate = task.completedAt.split("T")[0];

      if (!dailyStats[completedDate]) {
        dailyStats[completedDate] = { created: 0, completed: 0 };
      }
      dailyStats[completedDate].completed++;
    }
  });

  //  Now for Handling the Last 7 Days and 30 Days
  let last7 = {
    dates: [],
    created: [],
    completed: [],
  };

  let last30 = {
    dates: [],
    created: [],
    completed: [],
  };

  let today = new Date(getCurrentDay());

  // For 7 Days

  for (let i = 0; i < 7; i++) {
    let d = new Date(today);
    d.setDate(today.getDate() - i);

    let key = d.toISOString().split("T")[0]; //To get the date only for checking if the date exists in out dailyStats or not

    if (!dailyStats[key]) {
      dailyStats[key] = { created: 0, completed: 0 };
    }

    last7.dates.push(key);
    last7.created.push(dailyStats[key].created);
    last7.completed.push(dailyStats[key].completed);
  }

  // For 30 Days

  for (let i = 0; i < 30; i++) {
    let d = new Date(today);
    d.setDate(today.getDate() - i);

    let key = d.toISOString().split("T")[0];

    if (!dailyStats[key]) {
      dailyStats[key] = { created: 0, completed: 0 };
    }

    last30.dates.push(key);
    last30.created.push(dailyStats[key].created);
    last30.completed.push(dailyStats[key].completed);
  }

  return {
    categoryPerformance,
    categoryDistribution,
    last7,
    last30,
  };
}

// Charts Section Code using Chart.js

function renderPieChart(categoryPerformance) {
  const pieCanvas = document.getElementById("categoryPie");

  // destroy previous chart
  if (pieChart) pieChart.destroy();

  pieChart = new Chart(pieCanvas, {
    type: "doughnut",
    data: {
      labels: categoryPerformance.labels,
      datasets: [
        {
          data: categoryPerformance.percentage,
          backgroundColor: ["#4F46E5", "#22C55E", "#F97316"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });
}

function renderBarChart(categoryDistribution) {
  const barCanvas = document.getElementById("categoryBar");

  if (barChart) barChart.destroy();

  barChart = new Chart(barCanvas, {
    type: "bar",
    data: {
      labels: categoryDistribution.labels,
      datasets: [
        {
          label: "Total Tasks",
          data: categoryDistribution.totals,
          backgroundColor: "#4F46E5",
          borderRadius: 8,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
        },
      },
    },
  });
}

function renderLineChart(lastXDays) {
  const lineCanvas = document.getElementById("dailyLine");

  if (lineChart) lineChart.destroy();

  lineChart = new Chart(lineCanvas, {
    type: "line",
    data: {
      labels: lastXDays.dates.slice().reverse(), // FIXED
      datasets: [
        {
          label: "Created",
          data: lastXDays.created.slice().reverse(), // FIXED
          borderColor: "#3B82F6",
          tension: 0.3,
        },
        {
          label: "Completed",
          data: lastXDays.completed.slice().reverse(), // FIXED
          borderColor: "#22C55E",
          tension: 0.3,
        },
      ],
    },
    options: {
      plugins: { legend: { position: "bottom" } },
    },
  });
}

// Function to update ALl chart at Once

function updateAllCharts() {
  const data = getChartData();

  renderLineChart(data.last7);
  renderPieChart(data.categoryPerformance);
  renderBarChart(data.categoryDistribution);
}

// Event Listener for the option of 7 days and 30 days in Line Chart

document.getElementById("chart-period").addEventListener("change", function () {
  const allData = getChartData();

  if (this.value === "7") {
    renderLineChart(allData.last7);
  } else {
    renderLineChart(allData.last30);
  }
});

// Form Submit Handling
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // Collect values
  const type = taskType.value;
  const title = taskTitle.value.trim();
  const resourcesLink = taskResources.value
    .split(",")
    .map((link) => link.trim());
  const timeValue = parseInt(taskTime.value);
  const dateValue = taskDate.value;

  const timeUnit = type === "book" ? "pages" : "hours";

  //  Task object
  const newTask = {
    id: Date.now(),
    type: type,
    title: title,
    resources: resourcesLink,
    timeRequired: timeValue,
    timeUnit: timeUnit,
    date: dateValue,
    status: "pending",
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  // Saving the task in our storage
  tasks.push(newTask);
  studyTrackerData.tasks = tasks;
  localStorage.setItem("studyTrackerData", JSON.stringify(studyTrackerData));


  taskForm.reset();

  renderTasks(); // UI update
  updateStats(); // For The Update in the task counters
  updateTodayStatsUI(); //For Showing the tasks stats
  updateStreak();
  updateAllCharts(); //For Updating the chart at every new task arrival
});

// Initial Rendering if the user reload the webpage

renderTasks();
updateStreakUI();
updateAllCharts();
updateAcademicUI();