import express from "express";
import {
  createOrUpdateProjects,
  getProjectsByUserId,
} from "../../controllers/Placement/ProjectController.js";

const router = express.Router();

// Route to create or update projects
router.post("/", createOrUpdateProjects);

// Route to get projects by user ID
router.get("/projects/:menteeId", getProjectsByUserId);

export default router;
