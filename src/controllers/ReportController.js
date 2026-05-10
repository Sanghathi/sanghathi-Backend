import catchAsync from "../utils/catchAsync.js";
import Attendance from "../models/Student/Attendance.js";
import Competition from "../models/CareerReview/Competition.js";
import StudentProfile from "../models/Student/Profile.js";
import Mentorship from "../models/Mentorship.js";
import User from "../models/User.js";
import { resolveScopedDepartment } from "../utils/tenantContext.js";

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
  const competitions = await Competition.find().sort({ createdAt: -1 }).lean();
  const userIds = competitions.map((competition) => competition.userId);
  const { userMap, profileMap, mentorshipMap, mentorMap } = await buildSharedStudentMaps(userIds);

  const rows = competitions
    .map((competition) => {
      const userId = toIdString(competition.userId);
      const user = userMap.get(userId) || {};
      const profile = profileMap.get(userId) || {};
      const mentorship = mentorshipMap.get(userId);
      const mentor = mentorship ? mentorMap.get(toIdString(mentorship.mentorId)) : null;
      const department = profile.department || user.department || competition.department || "";

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
        financialSupportRequested: !!competition.financialSupportRequested,
        amountSanctioned: competition.amountSanctioned || "",
        relatedTo: competition.relatedTo || "",
        proofLink: competition.proofLink || "",
        createdAt: competition.createdAt || null,
      };
    })
    .filter((row) => Boolean(row.userId));

  const filteredRows = departmentScope
    ? rows.filter((row) => row.department === departmentScope)
    : rows;

  res.status(200).json({
    status: "success",
    data: {
      competitions: filteredRows,
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

      const department = profile.department || user.department || "";

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
    ? rows.filter((row) => row.department === departmentScope)
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