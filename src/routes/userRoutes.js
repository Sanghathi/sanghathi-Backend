import { Router } from "express";
import {
  getAllUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  getUserByUSN,
} from "../controllers/userController.js";
import {
  signup,
  login,
  forgotPassword,
  resetPassword,
  logout,
  protect,
} from "../controllers/authController.js";
import { getAllThreadsOfUser } from "../controllers/threadController.js";
import { authorizePermissions } from "../middlewares/authMiddleware.js";

const router = Router();

/**
 * @swagger
 * /api/users/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 */
router.post("/signup", signup);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized
 */
router.post("/login", login);

/**
 * @swagger
 * /api/users/forgotPassword:
 *   post:
 *     summary: Request password reset
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post("/forgotPassword", forgotPassword);

/**
 * @swagger
 * /api/users/resetPassword/{token}:
 *   patch:
 *     summary: Reset user password
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 example: "newPassword123"
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.patch("/resetPassword/:token", resetPassword);

/**
 * @swagger
 * /api/users/logout:
 *   get:
 *     summary: Logout a user
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.get("/logout", logout);

/**
 * @swagger
 * /api/users/usn/{usn}:
 *   get:
 *     summary: Get user by USN
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: usn
 *         required: true
 *         schema:
 *           type: string
 *         description: User's USN
 *     responses:
 *       200:
 *         description: User details
 */
router.get("/usn/:usn", getUserByUSN);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.route("/")
  .get(getAllUsers)
  .post(createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *   patch:
 *     summary: Update user details
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       204:
 *         description: User deleted
 */
router.route("/:id")
  .get(getUser)
  .patch(updateUser)
  .delete(deleteUser);

/**
 * @swagger
 * /api/users/{id}/threads:
 *   get:
 *     summary: Get all threads of a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of user threads
 */
router.route("/:id/threads").get(getAllThreadsOfUser);

export default router;
