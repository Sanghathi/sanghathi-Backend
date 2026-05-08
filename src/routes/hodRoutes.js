import { Router } from "express";
import { protect, restrictTo } from "../controllers/authController.js";
import {
  getDepartmentMentors,
  getMentorById,
} from "../controllers/HODController.js";

const router = Router();

// Protect all routes - require authentication
router.use(protect);

// Restrict all routes to HOD role
router.use(restrictTo("hod"));

/**
 * @swagger
 * /api/hod/mentors:
 *   get:
 *     summary: Get all mentors in HOD's department
 *     description: Returns all faculty members (mentors) belonging to the same department as the HOD. Only accessible by HOD users.
 *     tags: [HOD]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved mentors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     mentors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                           department:
 *                             type: string
 *                     count:
 *                       type: number
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an HOD
 *       400:
 *         description: HOD profile missing department assignment
 */
router.get("/mentors", getDepartmentMentors);

/**
 * @swagger
 * /api/hod/mentors/:mentorId:
 *   get:
 *     summary: Get a specific mentor's details by ID
 *     description: Returns details of a specific faculty member if they belong to the HOD's department. Only accessible by HOD users.
 *     tags: [HOD]
 *     parameters:
 *       - in: path
 *         name: mentorId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the mentor to retrieve
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved mentor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     mentor:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         avatar:
 *                           type: string
 *                         department:
 *                           type: string
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - user is not an HOD
 *       404:
 *         description: Mentor not found in HOD's department
 */
router.get("/mentors/:mentorId", getMentorById);

export default router;
