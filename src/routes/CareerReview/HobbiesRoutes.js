import { Router } from "express";
import {
  createOrUpdateHobbies,
  getHobbiesByUserId,
  getAllHobbies,
  deleteHobbiesByUserId,
} from "../../controllers/CareerReview/HobbiesController.js";

const router = Router();

/**
 * @swagger
 * /api/hobbies/{userId}:
 *   get:
 *     summary: Get hobbies by user ID
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved hobbies
 */
router.get("/hobbies/:userId", getHobbiesByUserId);

/**
 * @swagger
 * /api/hobbies:
 *   get:
 *     summary: Get all hobbies
 *     responses:
 *       200:
 *         description: Successfully retrieved all hobbies
 */
router.get("/", getAllHobbies);

/**
 * @swagger
 * /api/hobbies:
 *   post:
 *     summary: Create or update hobbies
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               hobbies:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Successfully created or updated hobbies
 */
router.post("/hobbies", createOrUpdateHobbies);

/**
 * @swagger
 * /api/hobbies/{userId}:
 *   delete:
 *     summary: Delete hobbies by user ID
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully deleted hobbies
 */
router.delete("/hobbies/:userId", deleteHobbiesByUserId);

export default router;