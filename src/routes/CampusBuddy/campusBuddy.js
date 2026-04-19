import { protect } from "../../controllers/authController.js";
import logger from "../../utils/logger.js";
import { Router } from "express"; // ✅ Correct import statement
const router = Router();

router.use(protect);
router.post('/', async (req, res) => {
    const question = req.body.question;
    if (!question) {
      return res.status(400).json({ error: 'Missing "question" in request body' });
    }
  
    try {
      const { ragAnswer } = await import("../../rag.js");
      const answer = await ragAnswer(question);
      res.json({ answer });
    } catch (err) {
      logger.error("Campus Buddy RAG request failed", {
        error: err?.message,
        stack: err?.stack,
      });

      const isConfigError =
        err?.message?.includes("No MongoDB URI configured for RAG") ||
        err?.message?.includes("Missing OPENAI_API_KEY for RAG");

      res
        .status(isConfigError ? 503 : 500)
        .json({ error: isConfigError ? "Campus Buddy is not configured" : "RAG pipeline failed" });
    }
  });
  export default router;