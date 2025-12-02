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

// Accessing the Task which we want to edit

let editingTaskID = null

// Accessing the Sort by value

let currentSort = "recent" //By default it will show it in sequence

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

    const orderedMannerTasks = sortTasks(tasks.slice());

    // move completed tasks to bottom after sorting
    orderedMannerTasks.sort((a, b) => (a.status === "completed") - (b.status === "completed"));


    // If there are Tasks exixts
    orderedMannerTasks.forEach(task => {

        const isCompleted = task.status === "completed";

        const taskHTML = `
            <div class="task-item ${isCompleted ? "completed" : ""}">
                <div class="task-type type-${task.type}">
                    ${task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                </div>
                
                <div class="task-body">
                    <div class="task-title ${isCompleted ? "title-completed" : ""}">${task.title}</div>
                    <div class="task-meta">${task.timeRequired} ${task.timeUnit} • Due : ${task.date}</div>
                </div>

                <div class="task-actions">
                    <button class="btn-ghost" onclick="openResources(${task.id})">Resources</button>
                    <button class="btn-ghost" ${isCompleted ? "disabled" : `onclick="completeTask(${task.id})"`}>${isCompleted ? "Completed" : "Done"}</button>
                    <button class="btn-ghost" onclick="editTask(${task.id})">Edit</button>
                </div>
            </div>
        `

        taskListContainer.insertAdjacentHTML("beforeend" , taskHTML);
        const inserted = taskListContainer.lastElementChild;
        setTimeout(() => inserted.classList.add("show"), 10);
    });

    updateStats();
    updateTodayStatsUI();
}

// Completed Task function after user completes the task
function completeTask (taskID) {
    const atIndex = tasks.findIndex(task => task.id === taskID);

    if (atIndex === -1) return;

    if (tasks[atIndex].status === "completed") return;

    tasks[atIndex].status = "completed";
    tasks[atIndex].completedAt = new Date().toISOString();

    localStorage.setItem("tasks", JSON.stringify(tasks));

    renderTasks();
    updateStats();
    updateTodayStatsUI();
}

// Update stats function where all the stats will be updated after form submit or task completion
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

    progressFill.style.width = effortPercent + "%" //Updating the CSS for progress bar

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
    yesterday.setDate(now.getDate()-1);
    return yesterday.toISOString().split("T")[0];
}

// Function that will count today's completion and today's total tasks
function getTodayStats () {
    const today = getCurrentDay();

    let completedToday = 0;
    let createdToday = 0;

    tasks.forEach (task => {

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
        createdToday
    };
}

// Function for Displaying the Stats for this completion and Pending
function updateTodayStatsUI (){
    const {completedToday , createdToday} =getTodayStats();

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
    `
}

// Function for Editing Task 
function editTask (taskID) {
    editingTaskID = taskID;

    // Accessing the task from the tasks to edit
    const task = tasks.find( t => t.id === taskID) 

    if(!task) return; 

    // Accessing all the elements and providing their previous values for user to change

    document.getElementById("edit-title").value = task.title ; 
    document.getElementById("edit-resources").value = task.resources.join(", ");
    document.getElementById("edit-time").value = task.timeRequired;
    document.getElementById("edit-date").value = task.date;

    // Making our pop up form appear and visible for our user

    document.getElementById("edit-modal").style.display = "flex";

    // Making it disapper if user enters cancel

    document.getElementById("edit-cancel").addEventListener("click", () => {
        document.getElementById("edit-modal").style.display = "none"; 
    })

}

 // Making our changes saved as a new Task in our storage

document.getElementById("edit-save").addEventListener("click", () => {
    const task = tasks.find(t => t.id === editingTaskID)
    if(!task) return ;

    // Collecting the new data if task ID exists
    task.title = document.getElementById("edit-title").value.trim();
    task.resources = document.getElementById("edit-resources").value.split(",").map(r => r.trim());
    task.timeRequired = parseInt(document.getElementById("edit-time").value);
    task.date = document.getElementById("edit-date").value;

    // Saving and rendering again to show the updated Task

    localStorage.setItem("tasks", JSON.stringify(tasks));
    renderTasks();

    document.getElementById("edit-modal").style.display = "none"; // Making it Hidden again
})

// Sort button event Handler

document.getElementById("sort-select").addEventListener("change", (e) => {
  currentSort = e.target.value;
  renderTasks();  // re-render with new sort order
});


// Function for the sorting of our task in our right section

function sortTasks(taskArray) {
    if (currentSort === "recent") {
        return taskArray.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    if (currentSort === "oldest") {
        return taskArray.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))
    }

    if (currentSort === "duesoon") {
        return taskArray.sort((a,b) => new Date(a.date) - new Date(b.date));
    }

    if (currentSort === "dueLatest") {
        return taskArray.sort((a,b) => new Date(b.date) - new Date(a.date))
    }

    return taskArray
}

// Function For Resources Opening Modal

function openResources(taskID) {
    const task = tasks.find (t => t.id === taskID)
    if(!task) return ; //Means Task did not found

    const listDiv = document.getElementById("resource-list");
    listDiv.innerHTML = "";

    if (task.resources.length === 0) {
        listDiv.innerHTML = `<div style="color:var(--muted);font-size:14px">No Resources Added</div>`;
    } else {
        task.resources.forEach( link => {
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
        })
    }

    document.getElementById("resource-modal").style.display = "flex";
}

// For Closing the Resource Modal

document.getElementById("resource-close").addEventListener("click", () => {
    document.getElementById("resource-modal").style.display = "none";
});


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
    updateTodayStatsUI(); //For Showing the tasks stats
});


// Initial Rendering if the user reload the webpage

renderTasks();
