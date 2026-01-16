import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username : {
        type : String,
        required : true,
        unique : true
    },
    email : {
        type: String,
        required: true,
        unique: true
    },
    password : {
        type: String,
        required: true,
    },
    course : {
        type : String,
        required : false,
    },
    year : {
        type : String,
        required : false,
    },
    examDate: {
        type: String,
        required: false
    },
    semEndDate: {
        type: String,
        required: false
    },
    institute: {
        type: String,
        required: false
    },
    streak: {
        count: { type: Number, default: 0 },
        lastStreakDay: { type: String, default: null }
    }
});

export default mongoose.model("User",userSchema);