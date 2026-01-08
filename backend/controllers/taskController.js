import Task  from "../models/Task.js";
import User from "../models/User.js";

// Helper: compute the logical streak day string (YYYY-MM-DD) using a rollover hour
// Rollover hour means the day boundary is at HH:00 (e.g., 3 => 03:00). We subtract
// the rollover from the timestamp so that times between 00:00-02:59 become previous day.
function streakDayFromDate(input, rolloverHour = 3) {
    const d = new Date(input);
    d.setHours(d.getHours() - rolloverHour);
    return d.toISOString().split('T')[0];
}

// Create Task
export const createTask = async (req , res) => {
    try {
        const task = req.body;

        const newTask = new Task ({
            userId : req.userId,
            ...task
        });

        await newTask.save();
        res.json({ message : "Task Created", task : newTask });
    } catch (err) {
        res.status(500).json({ message : err.message });
    }
}

// GET All tasks of logged in User
export const getTasks = async (req,res) => {
    try {
        const tasks = await Task.find( { userId : req.userId } );
        res.json(tasks);

    } catch (err) {
        res.status(500).json( { message : err.message } );
    }
}

// Update Task
export const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        // Search existing task first to detect status change
        const task = await Task.findOne({ id: Number(id), userId: req.userId });
        if (!task) return res.status(404).json({ message: "Task not found" });

        const prevStatus = task.status;

        // Update task
        const updated = await Task.findOneAndUpdate(
            { id: Number(id), userId: req.userId },
            req.body,
            { new: true }
        );

        // Handle streak updates server-side
        let streak = null;

        const user = await User.findById(req.userId);
        if (user) {
            if (!user.streak) user.streak = { count: 0, lastStreakDay: null };

            const today = streakDayFromDate(Date.now(), 3);
            const yesterday = streakDayFromDate(Date.now() - 24 * 60 * 60 * 1000, 3);

            // Case A: task was just completed (prevStatus -> completed)
            if (req.body.status === "completed" && prevStatus !== "completed") {
                if (user.streak.lastStreakDay !== today) {
                    if (user.streak.lastStreakDay === yesterday) {
                        user.streak.count = (user.streak.count || 0) + 1;
                    } else {
                        // starting a new streak day after a gap: start at 1
                        user.streak.count = 1;
                    }
                    user.streak.lastStreakDay = today;
                    await user.save();
                }
                streak = user.streak;
            }

            // Case B: task was undone (completed -> pending)
            if ((req.body.status === "pending" || req.body.status === "undo" ) && prevStatus === "completed") {
                const completedAt = task.completedAt; // previous completedAt
                if (completedAt) {
                    const completedDay = streakDayFromDate(completedAt, 3);
                    // If this task's completion belonged to the user's lastStreakDay,
                    // and there are no other completed tasks on that day, decrement streak
                    if (user.streak.lastStreakDay === completedDay) {
                        const others = await Task.countDocuments({
                            userId: req.userId,
                            status: "completed",
                            completedAt: { $regex: `^${completedDay}` },
                            id: { $ne: task.id }
                        });

                        if (others === 0) {
                            // Streak break: reset to 0 (as requested)
                            user.streak.count = 0;
                            user.streak.lastStreakDay = null;
                            await user.save();
                            streak = user.streak;
                        }
                        // else: there are other completions today, streak remains unchanged
                    }
                }
            }
        }

        return res.json({ task: updated, streak });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Delete Task
export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        await Task.findOneAndDelete({
            id: Number(id),
            userId: req.userId     
        });
        res.json({ message: "Task Deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};