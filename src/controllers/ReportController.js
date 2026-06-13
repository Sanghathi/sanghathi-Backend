import catchAsync from "../utils/catchAsync.js";
import Attendance from "../models/Student/Attendance.js";
import Competition from "../models/CareerReview/Competition.js";
import MoocData from "../models/CareerReview/Mooc.js";
import MiniProjectData from "../models/CareerReview/MiniProject.js";
import StudentProfile from "../models/Student/Profile.js";
import Mentorship from "../models/Mentorship.js";
import User from "../models/User.js";
import TYLScores from "../models/TYLScores.js";
import sendEmail from "../utils/email.js";
import logger from "../utils/logger.js";
import { isGlobalDirectorAccount, normalizeDepartment, resolveScopedDepartment } from "../utils/tenantContext.js";
import {
  canonicalizeTylSubject,
  getTylDepartmentKind,
  getTylPlan,
  getTylSemesterOptions,
} from "../utils/tylPlan.js";

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

const departmentKey = (value) => {
  const normalized = normalizeDepartment(value);
  if (!normalized) return "";
  const text = normalized.toString().trim().toUpperCase();
  if (text.includes("INFORMATION") && text.includes("SCIENCE")) return "ISE";
  if (text.includes("COMPUTER") && text.includes("APPLICATION")) return "MCA";
  return text;
};

const departmentsMatch = (left, right) => {
  const leftKey = departmentKey(left);
  const rightKey = departmentKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
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

      return departmentsMatch(data.department, departmentScope);
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

const hasMeaningfulTylScore = (score = {}) => {
  if (!score || typeof score !== "object") {
    return false;
  }

  const result = String(score.result || "").trim().toUpperCase();
  const mark = score.mark ?? score.actual;

  if (mark !== null && mark !== undefined && String(mark).trim() !== "") {
    return true;
  }

  if (result && result !== "NO DATA") {
    return true;
  }

  return false;
};

const getTylDisplayScore = (score = {}) => {
  if (!score || typeof score !== "object") {
    return "";
  }

  const mark = score.mark ?? score.actual;
  if (mark !== null && mark !== undefined && String(mark).trim() !== "") {
    const numericMark = Number(mark);
    return Number.isFinite(numericMark) ? numericMark : mark;
  }

  return "";
};

const normalizeTylResult = (score = {}, passMarks = 0) => {
  const mark = Number(score.mark ?? score.actual);
  if (Number.isFinite(mark)) {
    return mark >= passMarks ? "PASS" : "FAIL";
  }

  const explicit = String(score.result || "").trim().toUpperCase();
  if (explicit === "NO DATA") {
    return explicit;
  }

  return "NO DATA";
};

const buildTylSemesterSummary = (semesterData, semesterPlan = []) => {
  const scores = semesterData?.scores && typeof semesterData.scores === "object" ? semesterData.scores : {};
  const scoreMap = new Map(
    Object.entries(scores)
      .filter(([, value]) => value && typeof value === "object")
      .map(([subject, value]) => [canonicalizeTylSubject(subject), value])
  );
  const plannedSubjects = Array.isArray(semesterPlan?.subjects) ? semesterPlan.subjects : semesterPlan;
  const plannedNames = new Set(plannedSubjects.map((subject) => subject.subject));
  const rows = plannedSubjects.map((subject) => {
    const score = scoreMap.get(subject.subject);
    const result = score ? normalizeTylResult(score, subject.passMarks) : "NO DATA";
    const hasScore = score && hasMeaningfulTylScore(score);

    return {
      area: subject.area,
      subject: subject.subject,
      scored: hasScore ? getTylDisplayScore(score) : "",
      maximum: Number(score?.maxMarks ?? subject.maxMarks),
      expected: Number(score?.passMarks ?? score?.target ?? subject.passMarks),
      result,
    };
  });
  const extras = [...scoreMap.entries()]
    .filter(([subject]) => !plannedNames.has(subject))
    .map(([subject, score]) => ({
      area: "Uploaded",
      subject,
      scored: hasMeaningfulTylScore(score) ? getTylDisplayScore(score) : "",
      maximum: Number(score?.maxMarks ?? 0) || "",
      expected: Number(score?.passMarks ?? score?.target ?? 0) || "",
      result: normalizeTylResult(score, Number(score?.passMarks ?? score?.target ?? 0)),
    }));

  const allRows = [...rows, ...extras];
  const passed = rows.filter((row) => row.result === "PASS").length;
  const pending = rows.filter((row) => row.result === "FAIL").length;
  const noData = rows.filter((row) => row.result === "NO DATA").length;
  const total = rows.length;
  const hasAnyData = rows.some((row) => row.result !== "NO DATA");

  return {
    rows: allRows,
    summary: {
      passed,
      pending,
      noData,
      total,
      hasAnyData,
      cleared: total > 0 && passed === total,
    },
  };
};

const getLatestMeaningfulSemester = (semesterSummaries = []) => {
  const latest = [...semesterSummaries]
    .filter((semester) => semester.hasAnyData)
    .sort((left, right) => Number(right.semester || 0) - Number(left.semester || 0))[0];

  return latest || null;
};

const getTylDepartmentScope = async (req) => {
  const roleName = (req.user?.roleName || req.user?.role?.name || "").toLowerCase();
  if (roleName === "admin" || roleName === "super-admin" || isGlobalDirectorAccount(req.user)) {
    const requestedDepartment = normalizeDepartment(req?.query?.department);
    return requestedDepartment || null;
  }

  if (["hod", "director", "strcoordinator", "doe"].includes(roleName)) {
    return resolveScopedDepartment(req);
  }

  return null;
};

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
  const uniqueUserIds = [...new Set(userIds.map(toIdString).filter(Boolean))];

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
    MoocData.find().select("userId mooc createdAt").lean(),
    MiniProjectData.find().select("userId miniproject createdAt").lean(),
    buildScopedStudentSet(departmentScope),
  ]);
  const userIds = [
    ...competitions.map((competition) => competition.userId),
    ...moocDocs.map((doc) => doc.userId),
    ...miniProjectDocs.map((doc) => doc.userId),
  ];
  const allRelevantUserIds = [...new Set([...userIds.map(toIdString), ...scopedStudentSet].filter(Boolean))];
  const { userMap, profileMap, mentorshipMap, mentorMap } = await buildSharedStudentMaps(allRelevantUserIds);
  const totalStudents = scopedStudentSet.size;
  const competitionDocs = competitions.filter((competition) => !isSportsCompetition(competition));
  const sportsDocs = competitions.filter((competition) => isSportsCompetition(competition));

  const buildBaseStudentRow = (userIdValue) => {
    const userId = toIdString(userIdValue);
    const user = userMap.get(userId) || {};
    const profile = profileMap.get(userId) || {};
    const mentorship = mentorshipMap.get(userId);
    const mentor = mentorship ? mentorMap.get(toIdString(mentorship.mentorId)) : null;
    const department = normalizeDepartment(profile.department || user.department || "") || "";

    return {
      userId,
      name: getFullName(profile, user.name),
      email: user.email || profile.email || "",
      usn: profile.usn || "",
      mentorName: mentor?.name || "",
      department,
      sem: profile.sem ?? user.sem ?? "",
    };
  };

  const rows = competitions
    .map((competition) => {
      const baseRow = buildBaseStudentRow(competition.userId);
      const department = normalizeDepartment(
        baseRow.department || competition.department || ""
      ) || "";
      const reportSection = isSportsCompetition(competition) ? "Sports" : "Competition";
      const studentNames = Array.isArray(competition.studentNames)
        ? competition.studentNames
        : (competition.studentNames ? String(competition.studentNames).split(",").map(s => s.trim()) : []);
      const studentUSNs = Array.isArray(competition.studentUSNs)
        ? competition.studentUSNs
        : (competition.studentUSNs ? String(competition.studentUSNs).split(",").map(s => s.trim()) : []);

      return {
        id: competition._id,
        ...baseRow,
        reportSection,
        name: baseRow.name || studentNames[0] || "",
        email: baseRow.email || competition.email || "",
        usn: baseRow.usn || studentUSNs[0] || "",
        mentorName: baseRow.mentorName || competition.mentorName || "",
        department,
        sem: baseRow.sem || competition.sem || "",
        eventName: competition.eventName || "",
        organizedBy: competition.organizedBy || "",
        eventDate: competition.eventDate || null,
        status: competition.status || "",
        level: competition.level || "",
        eventAffiliation: competition.eventAffiliation || "",
        // additional fields for detailed view and export
        contactNumber: competition.contactNumber || "",
        studentNames,
        studentUSNs,
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

  moocDocs.forEach((doc) => {
    const baseRow = buildBaseStudentRow(doc.userId);
    (Array.isArray(doc.mooc) ? doc.mooc : []).forEach((course, index) => {
      rows.push({
        id: `${doc._id}-mooc-${index}`,
        ...baseRow,
        reportSection: "MOOC Courses",
        sem: course.semester || baseRow.sem || "",
        eventName: course.title || "MOOC Course",
        organizedBy: course.portal || "",
        eventDate: course.completedDate || course.startDate || null,
        status: course.completedDate ? "Completed" : "In Progress",
        level: "",
        eventAffiliation: "",
        contactNumber: "",
        studentNames: [],
        studentUSNs: [],
        cashAwardOrTrophy: "",
        projectTitle: course.title || "",
        category: "MOOC Courses",
        eventType: "MOOC Courses",
        amountSanctioned: "",
        relatedTo: "MOOC Courses",
        proofLink: course.certificateLink || "",
        score: course.score ?? "",
        createdAt: doc.createdAt || null,
      });
    });
  });

  miniProjectDocs.forEach((doc) => {
    const baseRow = buildBaseStudentRow(doc.userId);
    (Array.isArray(doc.miniproject) ? doc.miniproject : []).forEach((project, index) => {
      rows.push({
        id: `${doc._id}-mini-${index}`,
        ...baseRow,
        reportSection: "Mini Project",
        sem: project.semester || baseRow.sem || "",
        eventName: project.title || "Mini Project",
        organizedBy: "",
        eventDate: project.completedDate || project.startDate || null,
        status: project.completedDate ? "Completed" : "In Progress",
        level: "",
        eventAffiliation: "",
        contactNumber: "",
        studentNames: [],
        studentUSNs: [],
        cashAwardOrTrophy: "",
        projectTitle: project.title || "",
        category: "Mini Project",
        eventType: "Mini Project",
        amountSanctioned: "",
        relatedTo: "Mini Project",
        proofLink: "",
        manHours: project.manHours ?? "",
        createdAt: doc.createdAt || null,
      });
    });
  });

  const appendPendingRows = (section, submittedDocs, userIdSelector = (doc) => doc.userId) => {
    const submittedIds = new Set(
      submittedDocs
        .map((doc) => toIdString(userIdSelector(doc)))
        .filter((userId) => userId && scopedStudentSet.has(userId))
    );

    scopedStudentSet.forEach((userId) => {
      if (submittedIds.has(userId)) return;

      rows.push({
        id: `pending-${section.toLowerCase().replace(/\s+/g, "-")}-${userId}`,
        ...buildBaseStudentRow(userId),
        reportSection: section,
        eventName: "Not submitted",
        organizedBy: "",
        eventDate: null,
        status: "Pending",
        level: "",
        eventAffiliation: "",
        contactNumber: "",
        studentNames: [],
        studentUSNs: [],
        cashAwardOrTrophy: "",
        projectTitle: "",
        category: section,
        eventType: section,
        amountSanctioned: "",
        relatedTo: section,
        proofLink: "",
        createdAt: null,
        isPendingSubmission: true,
      });
    });
  };

  appendPendingRows("Competition", competitionDocs);
  appendPendingRows("Sports", sportsDocs);
  appendPendingRows("MOOC Courses", moocDocs);
  appendPendingRows("Mini Project", miniProjectDocs);

  const filteredRows = departmentScope
    ? rows.filter((row) => departmentsMatch(row.department, departmentScope))
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

export const getTylReport = catchAsync(async (req, res) => {
  const departmentScope = await getTylDepartmentScope(req);
  const tylDocs = await TYLScores.find().lean();
  const userIds = tylDocs.map((doc) => doc.userId);
  const { userMap, profileMap, mentorshipMap, mentorMap } = await buildSharedStudentMaps(userIds);

  const rows = [];
  const semesterStats = new Map();
  const initializeStats = (semester) => {
    if (!semesterStats.has(semester)) {
      semesterStats.set(semester, {
        semester,
        total: 0,
        cleared: 0,
        pending: 0,
        noData: 0,
      });
    }

    return semesterStats.get(semester);
  };

  tylDocs.forEach((doc) => {
    const userId = toIdString(doc.userId);
    const user = userMap.get(userId) || {};
    const profile = profileMap.get(userId) || {};
    const mentorship = mentorshipMap.get(userId);
    const mentor = mentorship ? mentorMap.get(toIdString(mentorship.mentorId)) : null;
    const department = normalizeDepartment(profile.department || user.department || "") || "";

    if (departmentScope && normalizeDepartment(department) !== departmentScope) {
      return;
    }

    if (!userId || (!user.name && !profile.fullName && !profile.name)) {
      return;
    }

    const departmentKind = getTylDepartmentKind(department);
    const allowedSemesters = getTylSemesterOptions(department);
    const semesters = Array.isArray(doc.semesters) ? doc.semesters : [];
    const semesterSummaries = allowedSemesters.map((semester) => {
      const plan = getTylPlan(department, semester);
      const semesterData = semesters.find((entry) => Number(entry.semester) === Number(semester));
      const summary = buildTylSemesterSummary(semesterData, plan);

      return {
        semester,
        label: plan.label || (departmentKind === "mca" ? `Semester ${semester}` : `Semester ${semester}`),
        ...summary.summary,
        subjects: summary.rows,
      };
    });

    const latestSemester = getLatestMeaningfulSemester(semesterSummaries);
    const latestStatus = latestSemester
      ? latestSemester.cleared
        ? "CLEARED"
        : "PENDING"
      : "NO DATA";

    const clearedSemesters = semesterSummaries.filter((semester) => semester.cleared).length;
    const pendingSemesters = semesterSummaries.filter((semester) => semester.hasAnyData && !semester.cleared).length;
    const noDataSemesters = semesterSummaries.filter((semester) => !semester.hasAnyData).length;
    const subjectNames = [...new Set(
      semesterSummaries.flatMap((semester) => (Array.isArray(semester.subjects) ? semester.subjects : []).map((subject) => subject.subject))
    )];

    if (latestSemester) {
      const stats = initializeStats(latestSemester.semester);
      stats.total += 1;
      stats.subjectCount = latestSemester.subjects?.length || stats.subjectCount || 0;
      stats.subjects = latestSemester.subjects?.map((subject) => subject.subject) || stats.subjects || [];
      if (latestSemester.cleared) {
        stats.cleared += 1;
      } else {
        stats.pending += 1;
      }
    }

    rows.push({
      id: doc._id,
      userId,
      name: getFullName(profile, user.name),
      email: user.email || profile.email || "",
      usn: profile.usn || "",
      mentorName: mentor?.name || "",
      department,
      latestSemester: latestSemester?.semester || null,
      latestSemesterLabel: latestSemester?.label || "No data",
      latestStatus,
      clearedSemesters,
      pendingSemesters,
      noDataSemesters,
      subjectNames,
      semesterSummaries,
    });
  });

  rows.sort((left, right) => {
    if ((right.latestSemester || 0) !== (left.latestSemester || 0)) {
      return Number(right.latestSemester || 0) - Number(left.latestSemester || 0);
    }
    return (left.name || "").localeCompare(right.name || "");
  });

  const totalStudents = rows.length;
  const clearedStudents = rows.filter((row) => row.latestStatus === "CLEARED").length;
  const pendingStudents = rows.filter((row) => row.latestStatus === "PENDING").length;
  const noDataStudents = rows.filter((row) => row.latestStatus === "NO DATA").length;

  const semesterSummary = Array.from(semesterStats.values()).sort((a, b) => a.semester - b.semester);

  res.status(200).json({
    status: "success",
    data: {
      tyl: rows,
      summary: {
        totalStudents,
        clearedStudents,
        pendingStudents,
        noDataStudents,
        semesterStats: semesterSummary,
      },
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
