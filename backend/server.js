import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";

//Getting My Hidden url for connection
dotenv.config();

//Connecting my database
connectDB();

// Getting the instance of express
const app = express();

//Using cors to allow communication between 2 different Domains
app.use(cors());

//Allowing the backend to read JSON format
app.use(express.json());

app.get("/" , (req,res) => {
    res.send("Backend Is running");
})

// For User Login and register
app.use("/api", userRoutes);

// For Tasks CRUD (Create, Read, Update, Delete)
app.use("/api", taskRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT , () => {
    console.log(`Server is live at : ${PORT}`);
})