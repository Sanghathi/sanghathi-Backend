import { Router } from "express";
import handleUserQuery from "../../controllers/CampusBuddy/campusBuddy.js";

const router = Router();

router.post("/query", handleUserQuery);

export default router;
