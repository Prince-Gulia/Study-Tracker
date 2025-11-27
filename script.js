// Accessing the Form Elements
const taskForm = document.querySelector(".task-form");
const taskType = document.getElementById("task-type");
const taskTitle = document.getElementById("detail-input");
const taskResources = document.getElementById("resources");
const taskTime = document.getElementById("amount");
const taskDate = document.getElementById("due-date");

// Accessing the Elements to update after form handling
const completedMeta = document.getElementById("completed-meta")
const totalMeta = document.getElementById("total-meta")
const effortScore = document.getElementById("effort-score")
const progressFill = document.getElementById("progress-fill")
const leftSideTotalMeta = document.getElementById("total-tasks")
const leftSideCompletedMeta = document.getElementById("completed-tasks")


// Loading Existing Files
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

// Accessing the task list Container
const taskListContainer = document.querySelector("#task-list");

// Render Function that will make our tasks go to our web page
function renderTasks() {
    taskListContainer.innerHTML = '';

    // If there are no tasks yet
    if (tasks.length === 0){
        taskListContainer.innerHTML = `
            <div style = "color:var(--muted); font-size:14px; margin-top:10px">
                No Tasks added yet.
            </div>
        `;

        return;
    }

    // If there are Tasks exixts
    tasks.forEach(task => {
        const taskHTML = `
            <div class="task-item">
                <div class="task-type type-${task.type}">
                    ${task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                </div>
                
                <div class="task-body">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">${task.timeRequired} ${task.timeUnit} • Due : ${task.date}</div>
                </div>

                <div class="task-actions">
                    <button class="btn-ghost" onclick="completeTask(${task.id})">Done</button>
                    <button class="btn-ghost" onclick="editTask(${task.id})">Edit</button>
                </div>
            </div>
        `

        taskListContainer.insertAdjacentHTML("beforeend" , taskHTML);
    });

    updateStats();
}

// Completed Task function after user completes the task
function completeTask (taskID) {
    const atIndex = tasks.findIndex(task => task.id === taskID);

    if (atIndex === -1) return;

    if (tasks[atIndex].status === "completed") return;

    tasks[atIndex].status = "completed";
    tasks[atIndex].completedAt = new Date().toISOString()

    localStorage.setItem("tasks", JSON.stringify(tasks));

    renderTasks();
    updateStats();
}

// Update stats function where all the stats will be updated afyter form submit or task completion
function updateStats () {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "completed").length;

    // Updating the Text first from main section (Right)
    totalMeta.textContent = total;
    completedMeta.textContent = completed;

    // Updating the Text from the side bar section (Left)
    leftSideTotalMeta.textContent = total;
    leftSideCompletedMeta.textContent = completed;

    const effortPercent = total === 0 ? 0 : Math.round(completed/total * 100); //For Avoiding Zero Division

    effortScore.textContent = effortPercent + "%"; //Adding The effort at the right side of the bar

    progressFill.style.width = effortPercent + "%"

}


// Form Submit Handling
taskForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Collect values
    const type = taskType.value;
    const title = taskTitle.value.trim();
    const resourcesLink = taskResources.value.split(",").map(link => link.trim());
    const timeValue = parseInt(taskTime.value);
    const dateValue = taskDate.value;

    const timeUnit = (type === "book") ? "pages" : "hours";

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
        completedAt: null
    };

    // Saving the task in our storage
    tasks.push(newTask);
    localStorage.setItem("tasks", JSON.stringify(tasks));

    taskForm.reset();

    renderTasks();  // UI update
    updateStats();  // For The Update in the task counters
});


// Initial Rendering if the user reload the webpage

renderTasks();
updateStats();
