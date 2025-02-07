import { Router } from "express";
import {
  getAllUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
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

router.post("/signup", signup);
router.post("/login", login);

router.post("/forgotPassword", forgotPassword);
router.patch("/resetPassword/:token", resetPassword);
router.get("/logout", logout);

router
  .route("/")
  .get(getAllUsers)
  .post(createUser); 


router
  .route("/:id")
  .get(getUser)
  .patch(updateUser)
  .delete(deleteUser);

router.route("/:id/threads").get(getAllThreadsOfUser);

export default router;
