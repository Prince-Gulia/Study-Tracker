// ==============================================
// charts.js (Backend Version — FIXED)
// ==============================================

import * as Tasks from "./tasks.js";
import { getCurrentDay } from "./utils.js";

// Chart instances
let lineChart = null;
let pieChart = null;
let barChart = null;

// ----------------------------------------------
// SAFE TASK ACCESS
// ----------------------------------------------
function getTasks() {
  const tasks = Tasks.getAllTasks();
  return Array.isArray(tasks) ? tasks : [];
}

// ==============================================
// LINE CHART DATA (Created vs Completed)
// ==============================================
function getLineChartData(days = 7) {
  const tasks = getTasks();
  const stats = {};

  tasks.forEach(task => {
    if (!task.createdAt) return;

    const created = task.createdAt.split("T")[0];
    if (!stats[created]) stats[created] = { created: 0, completed: 0 };
    stats[created].created++;

    if (task.completedAt) {
      const done = task.completedAt.split("T")[0];
      if (!stats[done]) stats[done] = { created: 0, completed: 0 };
      stats[done].completed++;
    }
  });

  const today = new Date(getCurrentDay());
  const result = { dates: [], created: [], completed: [] };

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split("T")[0];

    const dayStat = stats[key] || { created: 0, completed: 0 };

    result.dates.push(key);
    result.created.push(dayStat.created);
    result.completed.push(dayStat.completed);
  }

  return result;
}

// ==============================================
// PIE CHART DATA (Completed vs Pending)
// ==============================================
function getPieChartData() {
  const tasks = Tasks.getAllTasks();
  const map = {};

  tasks.forEach(task => {
    if (!task.type) return;
    map[task.type] = (map[task.type] || 0) + 1;
  });

  return {
    labels: Object.keys(map),
    values: Object.values(map)
  };
}

// ==============================================
// BAR CHART DATA (Task Type Distribution)
// ==============================================
function getBarChartData() {
  const tasks = getTasks();
  const map = {};

  tasks.forEach(t => {
    map[t.type] = (map[t.type] || 0) + 1;
  });

  return {
    labels: Object.keys(map),
    totals: Object.values(map)
  };
}

// ----------------------------------------------
// Public helper: return last7 and last30 line chart datasets
// ----------------------------------------------
export function getChartData() {
  return {
    last7: getLineChartData(7),
    last30: getLineChartData(30)
  };
}

// ==============================================
// RENDER LINE CHART
// ==============================================
export function renderLineChart(data) {
  const canvas = document.getElementById("dailyLine");
  if (!canvas || !data.dates.length) return;

  if (lineChart) lineChart.destroy();

  lineChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: data.dates,
      datasets: [
        {
          label: "Created",
          data: data.created,
          borderColor: "#3B82F6",
          tension: 0.3
        },
        {
          label: "Completed",
          data: data.completed,
          borderColor: "#22C55E",
          tension: 0.3
        }
      ]
    },
    options: {
      plugins: { legend: { position: "bottom" } }
    }
  });
}

// ==============================================
// RENDER PIE CHART
// ==============================================
export function renderPieChart(data) {
  const canvas = document.getElementById("categoryPie");
  if (!canvas || !data.labels.length) return;

  if (pieChart) pieChart.destroy();

  // 🎨 dynamic color palette
  const COLORS = [
    "#6366F1", // indigo
    "#22C55E", // green
    "#F97316", // orange
    "#EF4444", // red
    "#0EA5E9", // blue
    "#A855F7", // purple
    "#14B8A6", // teal
    "#FACC15"  // yellow
  ];

  const backgroundColors = data.labels.map(
    (_, i) => COLORS[i % COLORS.length]
  );

  pieChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: data.labels,
      datasets: [
        {
          data: data.values,
          backgroundColor: backgroundColors,
          borderWidth: 0
        }
      ]
    },
    options: {
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#9aa4b2",
            boxWidth: 12
          }
        }
      }
    }
  });
}

// ==============================================
// RENDER BAR CHART
// ==============================================
export function renderBarChart(data) {
  const canvas = document.getElementById("categoryBar");
  if (!canvas || !data.labels.length) return;

  if (barChart) barChart.destroy();

  barChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "Tasks",
          data: data.totals,
          backgroundColor: "#4F46E5",
          borderRadius: 8
        }
      ]
    },
    options: {
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

// ==============================================
// Render Donut Chart
// ==============================================
// ==============================================
// TODAY DONUT CHART (Completed vs Pending Today)
// ==============================================

export function renderTodayDonut() {
  const canvas = document.getElementById("todayDonut");
  if (!canvas) return;

  const tasks = Tasks.getAllTasks();
  if (!tasks || tasks.length === 0) return;

  const today = new Date().toISOString().split("T")[0];

  let createdToday = 0;
  let completedToday = 0;

  tasks.forEach(task => {
    if (task.createdAt?.startsWith(today)) createdToday++;
    if (task.completedAt?.startsWith(today)) completedToday++;
  });

  const pendingToday = Math.max(createdToday - completedToday, 0);

  // destroy previous instance
  if (window.todayDonutChart) {
    window.todayDonutChart.destroy();
  }

  window.todayDonutChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Completed", "Pending"],
      datasets: [
        {
          data: [completedToday, pendingToday],
          backgroundColor: ["#22C55E", "#EF4444"],
          borderWidth: 0
        }
      ]
    },
    options: {
      cutout: "70%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#9aa4b2" }
        }
      }
    }
  });
}

// ==============================================
// UPDATE ALL CHARTS (CALLED FROM app.js)
// ==============================================
export function updateAllCharts() {
  renderTodayDonut();
  renderLineChart(getLineChartData(7));
  renderPieChart(getPieChartData());
  renderBarChart(getBarChartData());
}
