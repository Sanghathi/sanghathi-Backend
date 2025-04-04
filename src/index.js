import express, { json } from "express";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import cors from "cors";
import AppError from "./utils/appError.js";
import globalErrorHandler from "./controllers/errorController.js";

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
import poAttainmentRoutes from "./routes/Student/poAttainmentRoutes.js";

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

const app = express();

//1) GLOBAL MIDDLEWARE
// Configure CORS to allow requests from Netlify
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://e-mithru.netlify.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use('/src/images', express.static(path.join('src', 'images')));
// Configure Helmet with cross-origin settings
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));
app.use(morgan("dev"));

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

//Body parser, reading data from body into req.body
app.use(express.json());
app.use(json({ limit: "10kb" }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

//TODO : Find out how can we sanitize request, this library is outdated
// Data sanitization against XSS
// app.use(xss());

// Mount routes
app.use("/api/users", userRouter);  // Mount user routes first
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
app.use("/api/project", MiniProjectRoutes);
app.use("/api/activity-data", ActivityRoutes);
app.use("/api/hobbies-data", HobbiesRoutes);
app.use("/api", roleRoutes);
app.use("/api/po-attainment", poAttainmentRoutes);

// Handle non-existing routes
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Error handling middleware
app.use(globalErrorHandler);

export default app;
