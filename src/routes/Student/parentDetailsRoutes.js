import { Router } from "express";
import {
  createOrUpdateParentDetails,
  getParentDetailsByUserId,
  getAllParentDetails,
  deleteParentDetailsByUserId,
} from "../../controllers/Student/parentDetailsController.js";

const router = Router();

/**
 * @swagger
 * /api/parent-details/{userId}:
 *   get:
 *     summary: Get parent details by user ID
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
  router.get("/:userId", getParentDetailsByUserId);

/**
 * @swagger
 * /api/parent-details:
 *   get:
 *     summary: Get all parent details
 *     responses:
 *       200:
 *         description: Successfully retrieved all parent details
 */
router.get("/", getAllParentDetails);

/**
 * @swagger
 * /api/parent-details:
 *   post:
 *     summary: Create or update parent details
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               parentDetails:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Successfully created or updated hobbies
 */
router.post("/", createOrUpdateParentDetails);

/**
 * @swagger
 * /api/parent-details/{userId}:
 *   delete:
 *     summary: Delete parent details by user ID
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully deleted parent details
 */
router.delete("/:userId", deleteParentDetailsByUserId);

export default router;