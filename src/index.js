import express, { json } from "express";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import cors from "cors";
import AppError from "./utils/appError.js";
import globalErrorHandler from "./controllers/errorController.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from 'fs';
import campubuddyroute from "./routes/CampusBuddy/campusBuddy.js";
//routes
import admissionRouter from "./routes/Student/AdmissionRoutes.js";
import userRouter from "./routes/userRoutes.js";
// import conversationRouter from "./routes/conversationRoutes.js";
import meetingRouter from "./routes/meetingRoutes.js";
import studentRouter from "./routes/Student/studentRoutes.js";
import studentProfileRoutes from "./routes/Student/studentProfileRoutes.js";
import facultyRouter from "./routes/Faculty/FacultyDetailsRoutes.js";
import attendanceRouter from "./routes/attendanceRoutes.js";
import IatMarksRouter from "./routes/Admin/IatmarksRouter.js";
import externalMarksRouter from "./routes/Admin/externalMarksRoutes.js";
import mentorRouter from "./routes/Student/mentorRoutes.js";
import mentorRoutes from "./routes/Student/mentorRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import campusBuddyRouter from "./routes/CampusBuddy/campusBuddy.js";
import privateConversationRouter from "./routes/Conversation/privateConversationRoutes.js";
import messageRouter from "./routes/Conversation/messageRoutes.js";
import threadRouter from "./routes/threadRoutes.js";
import academicRouter from "./routes/Student/academicCRUD.js";
import testSummaryRoutes from "./routes/testSummaryRoutes.js";
// import sendAttendanceNotifications from "./routes/Student/sendEmail.js";
import ptmRouter from "./routes/Student/PTMRoutes.js";
import localGuardianRoutes from "./routes/Student/localGuardianRoutes.js";
import admissionRoutes from "./routes/Student/AdmissionRoutes.js";
import contactDetailsRoutes from "./routes/Student/contactDetailsRoutes.js";
import parentDetailsRoutes from "./routes/Student/parentDetailsRoutes.js";
import CareerCounsellingRoutes from "./routes/CareerReview/CareerCounsellingRoutes.js";
import ProffessionalBodyRoutes from "./routes/CareerReview/ProffessionalBodyRoutes.js";
import MoocRoutes from "./routes/CareerReview/MoocRoutes.js";
import MiniProjectRoutes from "./routes/CareerReview/MiniProjectRoutes.js";
import ActivityRoutes from "./routes/CareerReview/ActivityRoutes.js";
import HobbiesRoutes from "./routes/CareerReview/HobbiesRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import swaggerDocs from "./swagger.js";
import placementRoutes from "./routes/Placements/PlacementRoutes.js";
import poAttainmentRoutes from "./routes/Student/poAttainmentRoutes.js";
import academicRoutes from "./routes/Student/academicCRUD.js";
import internshipRoutes from "./routes/Placements/InternshipRoutes.js";
import tylScoresRoutes from "./routes/tylScores.js";
import uploadRouter from "./routes/uploadRoutes.js";
import testUploadRouter from "./routes/testUploadRoute.js";
import projectRoutes from "./routes/Placements/ProjectRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy - Add this before other middleware
app.set('trust proxy', 1);

//1) GLOBAL MIDDLEWARE
// Configure CORS to allow requests from any origin during development
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://sanghathi.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use("/src/images", express.static(path.join("src", "images")));
// Configure Helmet with cross-origin settings
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);
app.use(morgan("dev"));

const limiter = rateLimit({
  max: 3000, // Example: 5000 requests per hour per IP
  windowMs: 60 * 60 * 1000, // 1 hour
  message: "Too many requests from this IP, please try again in an hour!",
  standardHeaders: true, // Optional: Adds RateLimit-* headers for clients
  legacyHeaders: false, // Optional: Removes X-RateLimit-* headers
});
app.use("/api", limiter);

//Body parser, reading data from body into req.body
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(json({ limit: '50mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

//TODO : Find out how can we sanitize request, this library is outdated
// Data sanitization against XSS
// app.use(xss());

// Mount routes
app.use("/api/ask", campubuddyroute);
app.use("/api/users", userRouter); // Mount user routes first
app.use("/api/messages", messageRouter);
app.use("/api/meetings", meetingRouter);
app.use("/api/mentors", mentorRouter);
app.use("/api/mentorship", mentorRoutes);
app.use("/api/notifications", notificationRouter);
app.use("/api/campus-buddy", campusBuddyRouter);
app.use("/api/private-conversations", privateConversationRouter);
app.use("/api/threads", threadRouter);
app.use("/api/students", studentRouter);
app.use("/api/students/attendance", attendanceRouter);
app.use("/api/students/Iat", IatMarksRouter);
app.use("/api/students/external", externalMarksRouter);
app.use("/api/students/academic", academicRouter);
app.use("/api/students/admissions", admissionRouter);
app.use("/api/student-profiles", studentProfileRoutes);
app.use("/api/students/ptm", ptmRouter);
app.use("/api/test-summary", testSummaryRoutes);
app.use("/api/v1/local-guardians", localGuardianRoutes);
app.use("/api/v1/admissions", admissionRoutes);
app.use("/api/v1/contact-details", contactDetailsRoutes);
app.use("/api/parent-details", parentDetailsRoutes);
app.use("/api/faculty", facultyRouter);
app.use("/api/career-counselling", CareerCounsellingRoutes);
app.use("/api/proffessional-body", ProffessionalBodyRoutes);
app.use("/api/mooc-data", MoocRoutes);
app.use("/api/mini-project", MiniProjectRoutes);
app.use("/api/activity-data", ActivityRoutes);
app.use("/api/hobbies-data", HobbiesRoutes);
app.use("/api", roleRoutes);
app.use("/api/placement", placementRoutes);
app.use("/api/placement/project", projectRoutes);
app.use("/api/po-attainment", poAttainmentRoutes);
app.use("/api/tyl-scores", tylScoresRoutes);

app.use("/api/v1/academics", academicRoutes);
app.use("/api/internship", internshipRoutes);

// Register routes
app.use("/api/v1/upload", uploadRouter);
app.use("/api/test", testUploadRouter);

// Serve the test HTML file
app.get('/test-upload', (req, res) => {
  const testHtmlPath = path.join(__dirname, '..', 'test-upload.html');
  
  if (fs.existsSync(testHtmlPath)) {
    res.sendFile(testHtmlPath);
  } else {
    res.status(404).send('Test file not found');
  }
});

// Handle non-existing routes
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Error handling middleware
app.use(globalErrorHandler);

export default app;
