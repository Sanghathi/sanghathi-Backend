import { Router } from "express";
import {
  createOrUpdatePOAttainment,
  getPOAttainmentByUserIdAndSemester,
  getAllPOAttainmentByUserId
} from "../../controllers/Student/POAttainmentController.js";

const router = Router();

/**
 * @swagger
 * /api/po-attainment/{userId}:
 *   get:
 *     summary: Get PO attainment data by user ID and semester
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: semester
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Successfully retrieved PO attainment data
 */
router.get("/:id", getPOAttainmentByUserIdAndSemester);

/**
 * @swagger
 * /api/po-attainment/{userId}/all:
 *   get:
 *     summary: Get all PO attainment data for a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved all PO attainment data
 */
router.get("/:id/all", getAllPOAttainmentByUserId);

/**
 * @swagger
 * /api/po-attainment:
 *   post:
 *     summary: Create or update PO attainment data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               semester:
 *                 type: number
 *               poAttainment:
 *                 type: object
 *               bloomLevel:
 *                 type: object
 *     responses:
 *       200:
 *         description: Successfully created or updated PO attainment data
 */
router.post("/", createOrUpdatePOAttainment);

export default router; 