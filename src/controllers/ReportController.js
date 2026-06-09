import catchAsync from "../utils/catchAsync.js";
import Attendance from "../models/Student/Attendance.js";
import Competition from "../models/CareerReview/Competition.js";
import MoocData from "../models/CareerReview/Mooc.js";
import MiniProjectData from "../models/CareerReview/MiniProject.js";
import StudentProfile from "../models/Student/Profile.js";
import Mentorship from "../models/Mentorship.js";
import User from "../models/User.js";
import sendEmail from "../utils/email.js";
import logger from "../utils/logger.js";
import { normalizeDepartment, resolveScopedDepartment } from "../utils/tenantContext.js";

const MINIMUM_ATTENDANCE = 75;

const getFullName = (profile, fallbackName = "") => {
  const fullName = profile?.fullName;
  const parts = [fullName?.firstName, fullName?.middleName, fullName?.lastName].filter(Boolean);
  if (parts.length) {
    return parts.join(" ").trim();
  }

  return profile?.name || profile?.studentName || fallbackName || "";
};

const toIdString = (value) => (value ? value.toString() : "");

const isSportsCompetition = (competition = {}) => {
  const category = String(competition?.category || "").trim().toLowerCase();
  const eventType = String(competition?.eventType || "").trim().toLowerCase();
  return category === "sports" || eventType === "sports";
};

const buildScopedStudentSet = async (departmentScope) => {
  const [users, profiles] = await Promise.all([
    User.find({ roleName: "student" }).select("_id department").lean(),
    StudentProfile.find().select("userId department").lean(),
  ]);

  const studentMap = new Map();

  users.forEach((user) => {
    const userId = toIdString(user._id);
    if (!userId) return;
    studentMap.set(userId, {
      department: user.department || "",
    });
  });

  profiles.forEach((profile) => {
    const userId = toIdString(profile.userId);
    if (!userId) return;
    const existing = studentMap.get(userId) || {};
    studentMap.set(userId, {
      ...existing,
      department: profile.department || existing.department || "",
    });
  });

  const scopedIds = [...studentMap.entries()]
    .filter(([_userId, data]) => {
      if (!departmentScope) {
        return true;
      }

      return normalizeDepartment(data.department) === departmentScope;
    })
    .map(([userId]) => userId);

  return new Set(scopedIds);
};

const countSubmittedUsers = (docs = [], scopedStudentSet = null, userIdSelector = (doc) => doc.userId) => {
  const submittedIds = new Set();

  docs.forEach((doc) => {
    const userId = toIdString(userIdSelector(doc));
    if (!userId) return;
    if (scopedStudentSet && !scopedStudentSet.has(userId)) return;
    submittedIds.add(userId);
  });

  return submittedIds.size;
};

const buildSubmissionSummary = (submittedCount, totalStudents) => ({
  submitted: submittedCount,
  notSubmitted: Math.max(totalStudents - submittedCount, 0),
});

const getLatestAttendanceSnapshot = (attendanceDoc) => {
  const semesters = Array.isArray(attendanceDoc?.semesters) ? attendanceDoc.semesters : [];
  let latest = null;

  semesters.forEach((semesterEntry) => {
    const semesterNumber = Number(semesterEntry?.semester) || 0;
    const months = Array.isArray(semesterEntry?.months) ? semesterEntry.months : [];

    months.forEach((monthEntry) => {
      const monthNumber = Number(monthEntry?.month) || 0;
      const currentSnapshot = {
        semester: semesterNumber,
        month: monthNumber,
        overallAttendance: Number(monthEntry?.overallAttendance) || 0,
        subjects: Array.isArray(monthEntry?.subjects) ? monthEntry.subjects : [],
      };

      if (
        !latest ||
        currentSnapshot.semester > latest.semester ||
        (currentSnapshot.semester === latest.semester && currentSnapshot.month > latest.month)
      ) {
        latest = currentSnapshot;
      }
    });
  });

  return latest;
};

const getDepartmentScope = async (req) => {
  const roleName = (req.user?.roleName || req.user?.role?.name || "").toLowerCase();
  if (roleName === "admin") {
    return null;
  }

  if (!["hod", "director", "strcoordinator"].includes(roleName)) {
    return null;
  }

  return resolveScopedDepartment(req);
};

const getFacultyMenteeScope = async (req) => {
  const roleName = (req.user?.roleName || req.user?.role?.name || "").toLowerCase();
  if (roleName !== "faculty") {
    return null;
  }

  const mentorId = toIdString(req.user?._id);
  if (!mentorId) {
    return new Set();
  }

  const mentorships = await Mentorship.find({ mentorId }).select("menteeId").lean();
  return new Set(mentorships.map((mentorship) => toIdString(mentorship.menteeId)).filter(Boolean));
};

const buildSharedStudentMaps = async (userIds) => {
  const uniqueUserIds = [...new Set(userIds.map((id) => id.toString()))];

  const [users, profiles, mentorships] = await Promise.all([
    User.find({ _id: { $in: uniqueUserIds }, roleName: "student" })
      .select("_id name email department sem collegeCode")
      .lean(),
    StudentProfile.find({ userId: { $in: uniqueUserIds } })
      .select("userId fullName usn sem department email mobileNumber collegeCode")
      .lean(),
    Mentorship.find({ menteeId: { $in: uniqueUserIds } })
      .select("menteeId mentorId")
      .lean(),
  ]);

  const userMap = new Map(users.map((user) => [toIdString(user._id), user]));
  const profileMap = new Map(profiles.map((profile) => [toIdString(profile.userId), profile]));
  const mentorshipMap = new Map(mentorships.map((mentorship) => [toIdString(mentorship.menteeId), mentorship]));
  const mentorIds = [...new Set(mentorships.map((mentorship) => toIdString(mentorship.mentorId)).filter(Boolean))];
  const mentors = mentorIds.length
    ? await User.find({ _id: { $in: mentorIds } }).select("_id name email").lean()
    : [];
  const mentorMap = new Map(mentors.map((mentor) => [toIdString(mentor._id), mentor]));

  return { userMap, profileMap, mentorshipMap, mentorMap };
};

export const getCompetitionReport = catchAsync(async (req, res) => {
  const departmentScope = await getDepartmentScope(req);
  const [competitions, moocDocs, miniProjectDocs, scopedStudentSet] = await Promise.all([
    Competition.find().sort({ createdAt: -1 }).lean(),
    MoocData.find().select("userId").lean(),
    MiniProjectData.find().select("userId").lean(),
    buildScopedStudentSet(departmentScope),
  ]);
  const userIds = competitions.map((competition) => competition.userId);
  const { userMap, profileMap, mentorshipMap, mentorMap } = await buildSharedStudentMaps(userIds);
  const totalStudents = scopedStudentSet.size;
  const competitionDocs = competitions.filter((competition) => !isSportsCompetition(competition));
  const sportsDocs = competitions.filter((competition) => isSportsCompetition(competition));

  const rows = competitions
    .map((competition) => {
      const userId = toIdString(competition.userId);
      const user = userMap.get(userId) || {};
      const profile = profileMap.get(userId) || {};
      const mentorship = mentorshipMap.get(userId);
      const mentor = mentorship ? mentorMap.get(toIdString(mentorship.mentorId)) : null;
      const department = normalizeDepartment(
        profile.department || user.department || competition.department || ""
      ) || "";

      return {
        id: competition._id,
        userId,
        name: getFullName(profile, user.name),
        email: user.email || profile.email || "",
        usn: profile.usn || "",
        mentorName: mentor?.name || "",
        department,
        sem: profile.sem ?? competition.sem ?? user.sem ?? "",
        eventName: competition.eventName || "",
        organizedBy: competition.organizedBy || "",
        eventDate: competition.eventDate || null,
        status: competition.status || "",
        level: competition.level || "",
        eventAffiliation: competition.eventAffiliation || "",
        // additional fields for detailed view and export
        contactNumber: competition.contactNumber || "",
        studentNames: Array.isArray(competition.studentNames) ? competition.studentNames : (competition.studentNames ? String(competition.studentNames).split(",").map(s => s.trim()) : []),
        studentUSNs: Array.isArray(competition.studentUSNs) ? competition.studentUSNs : (competition.studentUSNs ? String(competition.studentUSNs).split(",").map(s => s.trim()) : []),
        cashAwardOrTrophy: competition.cashAwardOrTrophy || "",
        projectTitle: competition.projectTitle || "",
        category: competition.category || "",
        eventType: competition.eventType || "",
        amountSanctioned: competition.amountSanctioned || "",
        relatedTo: competition.relatedTo || "",
        proofLink: competition.proofLink || "",
        createdAt: competition.createdAt || null,
      };
    })
    .filter((row) => Boolean(row.userId));

  const filteredRows = departmentScope
    ? rows.filter((row) => normalizeDepartment(row.department) === departmentScope)
    : rows;

  const summary = {
    "MOOC Courses": buildSubmissionSummary(
      countSubmittedUsers(moocDocs, scopedStudentSet),
      totalStudents
    ),
    "Mini Project": buildSubmissionSummary(
      countSubmittedUsers(miniProjectDocs, scopedStudentSet),
      totalStudents
    ),
    Competition: buildSubmissionSummary(
      countSubmittedUsers(competitionDocs, scopedStudentSet),
      totalStudents
    ),
    Sports: buildSubmissionSummary(
      countSubmittedUsers(sportsDocs, scopedStudentSet),
      totalStudents
    ),
  };

  res.status(200).json({
    status: "success",
    data: {
      competitions: filteredRows,
      summary,
    },
  });
});

export const getAttendanceReport = catchAsync(async (req, res) => {
  const departmentScope = await getDepartmentScope(req);
  const facultyMenteeScope = await getFacultyMenteeScope(req);
  const attendanceDocs = await Attendance.find().lean();
  const userIds = attendanceDocs.map((attendance) => attendance.userId);
  const { userMap, profileMap, mentorshipMap, mentorMap } = await buildSharedStudentMaps(userIds);

  const rows = attendanceDocs
    .map((attendance) => {
      const userId = toIdString(attendance.userId);
      const user = userMap.get(userId) || {};
      const profile = profileMap.get(userId) || {};
      const mentorship = mentorshipMap.get(userId);
      const mentor = mentorship ? mentorMap.get(toIdString(mentorship.mentorId)) : null;
      const latest = getLatestAttendanceSnapshot(attendance);

      if (!latest) {
        return null;
      }

      const department = normalizeDepartment(profile.department || user.department || "") || "";

      return {
        id: attendance._id,
        userId,
        name: getFullName(profile, user.name),
        email: user.email || profile.email || "",
        usn: profile.usn || "",
        mentorName: mentor?.name || "",
        department,
        semester: latest.semester,
        month: latest.month,
        overallAttendance: latest.overallAttendance,
        subjectsCount: Array.isArray(latest.subjects) ? latest.subjects.length : 0,
      };
    })
    .filter((row) => row && Number(row.overallAttendance) < MINIMUM_ATTENDANCE);

  const filteredRows = departmentScope
    ? rows.filter((row) => normalizeDepartment(row.department) === departmentScope)
    : facultyMenteeScope
      ? rows.filter((row) => facultyMenteeScope.has(row.userId))
    : rows;

  filteredRows.sort((a, b) => {
    if (b.semester !== a.semester) return Number(b.semester) - Number(a.semester);
    if (b.month !== a.month) return Number(b.month) - Number(a.month);
    return (a.name || "").localeCompare(b.name || "");
  });

  res.status(200).json({
    status: "success",
    data: {
      attendance: filteredRows,
    },
  });
});

export const sendLowAttendanceEmail = catchAsync(async (req, res) => {
  const { dryRun = false, recipientIds = [], recipientEmails = [] } = req.body;
  const mentorId = req.user?._id;
  const mentorName = req.user?.name || "your mentor";
  const frontendHost = (process.env.CLIENT_HOST || process.env.FRONTEND_HOST || "https://sanghathi.com").replace(/\/$/, "");
  const alertsUrl = `${frontendHost}/faculty/alerts`;

  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    return res.status(400).json({
      status: "fail",
      message: "No recipients provided",
    });
  }

  const explicitRecipientEmails = Array.isArray(recipientEmails)
    ? recipientEmails.map((email) => String(email || "").trim()).filter(Boolean)
    : [];

  let studentEmails = explicitRecipientEmails;

  if (!studentEmails.length) {
    const users = await User.find({ _id: { $in: recipientIds }, roleName: "student" })
      .select("_id name email")
      .lean();

    studentEmails = users.filter((user) => user?.email).map((user) => user.email.trim());
  }

  if (!studentEmails.length) {
    return res.status(200).json({
      status: "success",
      message: "No valid student email recipients found.",
      data: {
        recipients: [],
        subject: null,
        text: null,
        html: null,
        alertsUrl,
        dryRun: true,
      },
    });
  }

  const subject = `Your attendance is below the minimum threshold`;
  const body = `Dear student,\n\nThis is an important reminder from ${mentorName}. Your attendance has fallen below 75%, which is the minimum required threshold.\n\nPlease take immediate action to improve your attendance. You can review your detailed attendance records and reach out to your mentor for support.\n\nAccess the alerts portal here: ${alertsUrl}\n\nIf you have any questions or concerns, please don't hesitate to contact your mentor.\n\nRegards,\nSanghathi`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; background: linear-gradient(135deg, #1f2937 0%, #dc2626 52%, #ef4444 100%); padding: 24px; border-radius: 18px; color: #fef2f2;">
      <div style="max-width: 680px; margin: 0 auto; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); border-radius: 18px; padding: 28px; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.28);">
        <div style="display:inline-block; padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.16); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; margin-bottom: 16px;">Attendance Alert</div>
        <h1 style="margin: 0 0 12px; font-size: 28px; line-height: 1.2; color: #ffffff;">Your attendance is below the required threshold</h1>
        <p style="margin: 0 0 14px; font-size: 16px; color: #fee2e2;">Hello, this is a reminder from <strong>${mentorName}</strong>. Your attendance has fallen below 75%, which is the minimum required. Immediate action is needed to improve your attendance record.</p>
        <div style="background: rgba(255,255,255,0.12); border-left: 4px solid #fca5a5; padding: 14px 16px; border-radius: 12px; margin: 18px 0; color: #fecaca; font-weight: 600;">
          Minimum required attendance: 75%
        </div>
        <div style="margin: 20px 0 24px;">
          <a href="${alertsUrl}" style="display:inline-block; background: #fff5f5; color: #991b1b; text-decoration:none; padding: 14px 22px; border-radius: 12px; font-weight: 800; box-shadow: 0 12px 30px rgba(255,255,255,0.22);">View Attendance Details</a>
        </div>
        <p style="margin: 0; font-size: 14px; color: #fecaca;">If you cannot access the link, open Sanghathi and go to your alerts page.</p>
        <p style="margin: 18px 0 0; font-size: 14px; color: #fecaca;">Regards,<br/><strong>Sanghathi</strong></p>
      </div>
    </div>
  `;

  if (dryRun) {
    return res.status(200).json({
      status: "success",
      message: "Email preview ready.",
      data: {
        recipients: studentEmails,
        subject,
        text: body,
        html,
        alertsUrl,
        dryRun: true,
      },
    });
  }

  await sendEmail({
    email: studentEmails,
    subject,
    message: body,
    html,
  });

  res.status(200).json({
    status: "success",
    message: "Email notification sent to low-attendance students.",
    data: {
      recipients: studentEmails.length,
      alertsUrl,
    },
  });
});
