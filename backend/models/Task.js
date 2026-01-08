import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  id: {
    type: Number, // Date.now()
    required: true,
  },

  type: {
    type: String,
    required: true,
  },

  title: {
    type: String,
    required: true,
  },

  resources: {
    type: Array,
    default: [],
  },

  timeRequired: {
    type: Number,
    required: true,
  },

  timeUnit: {
    type: String,
    required: true,
  },

  date: {
    type: String,
    required: true,
  },

  status: {
    type: String,
    default: "pending",
  },

  createdAt: {
    type: String,
    required: true,
  },

  completedAt: {
    type: String,
    default: null,
  }
});

export default mongoose.model("Task", taskSchema);