import express from "express";
import {registerUser , loginUser, getMe, updateMe} from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register" , registerUser);
router.post("/login" , loginUser);
router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);

export default router;