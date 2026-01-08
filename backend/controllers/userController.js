import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const registerUser = async (req, res) => {
    try {
        const { username, email, password, course, year } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: "User Already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            course, // Added missing required fields
            year
        });

        await newUser.save();
        res.json({ message: "User Registered Successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid Email" });

        // FIXED: Added await here
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ message: "Incorrect Password" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.json({
            token,
            user: { id: user._id, username: user.username, email: user.email, course: user.course, year: user.year, examDate: user.examDate, semEndDate: user.semEndDate, streak: user.streak }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password");
        if (!user) return res.status(404).json({ message: "User Not Found" }); // Fixed res typo
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: "Server error" }); // Fixed res typo
    }
};

export const updateMe = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User Not Found" });

        const { username, course, year, examDate, semEndDate } = req.body;

        if (username !== undefined) user.username = username;
        if (course !== undefined) user.course = course;
        if (year !== undefined) user.year = year;
        if (examDate !== undefined) user.examDate = examDate;
        if (semEndDate !== undefined) user.semEndDate = semEndDate;

        await user.save();

        const safeUser = user.toObject();
        delete safeUser.password;

        res.json(safeUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};