import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import conversationRoutes from "./routes/conversation.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

// connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err.message));

// routes
app.use("/api/conversation", conversationRoutes);

app.get("/", (req, res) => res.send("Mentor–Mentee Server Running ✅"));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

