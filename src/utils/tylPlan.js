export const TYL_BASE_COLUMNS = ["sl.no", "Email", "Full name", "USN", "Phone"];

export const MCA_TYL_SUBJECTS = [
  { area: "Language", subject: "L1", maxMarks: 100, passMarks: 50 },
  { area: "Language", subject: "L2", maxMarks: 100, passMarks: 50 },
  { area: "Language", subject: "L3", maxMarks: 100, passMarks: 50 },
  { area: "Aptitude", subject: "A2", maxMarks: 100, passMarks: 50 },
  { area: "Aptitude", subject: "A3", maxMarks: 100, passMarks: 50 },
  { area: "Core Test", subject: "C3 Odd", maxMarks: 100, passMarks: 25 },
  { area: "Core Test", subject: "C3 Even", maxMarks: 100, passMarks: 25 },
  { area: "Core Test", subject: "C3 Full", maxMarks: 100, passMarks: 25 },
  { area: "Core Test", subject: "C4 Odd", maxMarks: 100, passMarks: 25 },
  { area: "Core Test", subject: "C4 Full", maxMarks: 100, passMarks: 25 },
  { area: "Programming", subject: "P2-Java", maxMarks: 100, passMarks: 60 },
  { area: "Programming", subject: "P3-FSD", maxMarks: 100, passMarks: 60 },
  { area: "Programming", subject: "P3-Java", maxMarks: 100, passMarks: 60 },
  { area: "Programming", subject: "P3-Python", maxMarks: 100, passMarks: 50 },
  { area: "Programming", subject: "P4-Java", maxMarks: 100, passMarks: 100 },
  { area: "Programming", subject: "P4-FSD", maxMarks: 100, passMarks: 60 },
  { area: "Soft Skills", subject: "S2", maxMarks: 100, passMarks: 50 },
  { area: "Soft Skills", subject: "S3", maxMarks: 100, passMarks: 50 },
];

export const MCA_LIKE_DEPARTMENTS = ["MCA", "CSE", "ECE", "AIDS", "AIML", "MBA"];

export const NON_MCA_TYL_SUBJECTS = [
  { area: "Language", subject: "L1", maxMarks: 100, passMarks: 65 },
  { area: "Language", subject: "L2", maxMarks: 100, passMarks: 65 },
  { area: "Language", subject: "L3", maxMarks: 100, passMarks: 70 },
  { area: "Language", subject: "L4", maxMarks: 100, passMarks: 70 },
  { area: "Aptitude", subject: "A1", maxMarks: 100, passMarks: 50 },
  { area: "Aptitude", subject: "A2", maxMarks: 100, passMarks: 50 },
  { area: "Aptitude", subject: "A3", maxMarks: 100, passMarks: 50 },
  { area: "Aptitude", subject: "A4", maxMarks: 100, passMarks: 50 },
  { area: "Soft Skills", subject: "S1", maxMarks: 100, passMarks: 50 },
  { area: "Soft Skills", subject: "S2", maxMarks: 100, passMarks: 50 },
  { area: "Soft Skills", subject: "S3", maxMarks: 100, passMarks: 50 },
  { area: "Soft Skills", subject: "S4", maxMarks: 100, passMarks: 50 },
  { area: "Core Test", subject: "C2 Odd", maxMarks: 25, passMarks: 10 },
  { area: "Core Test", subject: "C2 Full", maxMarks: 25, passMarks: 10 },
  { area: "Core Test", subject: "C3 Odd", maxMarks: 50, passMarks: 25 },
  { area: "Core Test", subject: "C3 Full", maxMarks: 100, passMarks: 50 },
  { area: "Core Test", subject: "C4 Odd", maxMarks: 100, passMarks: 50 },
  { area: "Core Test", subject: "C4 Full", maxMarks: 100, passMarks: 50 },
  { area: "Core Test", subject: "C5 Full", maxMarks: 100, passMarks: 50 },
  { area: "Programming", subject: "P1-C", maxMarks: 100, passMarks: 50 },
  { area: "Programming", subject: "P2-Python", maxMarks: 100, passMarks: 50 },
  { area: "Programming", subject: "P3-Python", maxMarks: 100, passMarks: 60 },
  { area: "Programming", subject: "P3-Java CSE", maxMarks: 100, passMarks: 60 },
  { area: "Programming", subject: "P4-Programming part 1", maxMarks: 100, passMarks: 70 },
  { area: "Programming", subject: "P4-Programming part 2", maxMarks: 100, passMarks: 70 },
  { area: "Programming", subject: "P4-MAD/FSD", maxMarks: 100, passMarks: 70 },
  { area: "Programming", subject: "P4-DS", maxMarks: 100, passMarks: 70 },
];

export const NON_MCA_TYL_PLANS = {
  1: {
    label: "Semester 1 (Physics Cycle)",
    subjects: ["L1", "S1", "P1-C", "C2 Odd"],
  },
  2: {
    label: "Semester 2 (Chemistry Cycle)",
    subjects: ["L2", "A1", "P2-Python", "C2 Full"],
  },
  3: {
    label: "Semester 3",
    subjects: ["L3", "S2", "P3-Java CSE", "C3 Odd"],
  },
  4: {
    label: "Semester 4",
    subjects: ["L4", "A2", "P3-Python", "C3 Full"],
  },
  5: {
    label: "Semester 5",
    subjects: ["A3", "S3", "P4-Programming part 1", "P4-MAD/FSD", "C4 Odd"],
  },
  6: {
    label: "Semester 6",
    subjects: ["A4", "S4", "P4-Programming part 2", "P4-DS", "C4 Full"],
  },
};

const subjectByName = new Map(
  [...MCA_TYL_SUBJECTS, ...NON_MCA_TYL_SUBJECTS].map((subject) => [subject.subject, subject])
);

const normalizeSubjectKey = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, " ")
    .replace(/\s*-\s*/g, "-");

export const TYL_SUBJECT_ALIASES = {
  "p1 c": "P1-C",
  "p1-c": "P1-C",
  "p2 python": "P2-Python",
  "p2-python": "P2-Python",
  "p3 java": "P3-Java CSE",
  "p3-java": "P3-Java CSE",
  "p3 java cse": "P3-Java CSE",
  "p3-java cse": "P3-Java CSE",
  "p3 python": "P3-Python",
  "p3-python": "P3-Python",
  "p4 part 1": "P4-Programming part 1",
  "p4 programming part1": "P4-Programming part 1",
  "p4 programming part 1": "P4-Programming part 1",
  "p4-programming part 1": "P4-Programming part 1",
  "p4 part 2": "P4-Programming part 2",
  "p4 programming part2": "P4-Programming part 2",
  "p4 programming part 2": "P4-Programming part 2",
  "p4-programming part 2": "P4-Programming part 2",
  "p4 mad": "P4-MAD/FSD",
  "p4 mad fsd": "P4-MAD/FSD",
  "p4-mad/fsd": "P4-MAD/FSD",
  "p4 ds": "P4-DS",
  "p4-ds": "P4-DS",
  "c2 odd": "C2 Odd",
  "c2 full": "C2 Full",
  "c3 odd": "C3 Odd",
  "c3 full": "C3 Full",
  "c4 odd": "C4 Odd",
  "c4 full": "C4 Full",
  "c5 full": "C5 Full",
};

export const canonicalizeTylSubject = (subject = "") => {
  const text = String(subject || "").trim();
  if (!text) return "";
  const direct = subjectByName.get(text);
  if (direct) return direct.subject;
  return TYL_SUBJECT_ALIASES[normalizeSubjectKey(text)] || text;
};

export const getTylDepartmentKind = (department = "") =>
  MCA_LIKE_DEPARTMENTS.includes(String(department || "").trim().toUpperCase())
    ? "mca"
    : "nonMca";

export const getTylSemesterOptions = (department = "") =>
  getTylDepartmentKind(department) === "mca" ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6];

export const getTylPlan = (department = "", semester = 0) => {
  const kind = getTylDepartmentKind(department);
  if (kind === "mca") {
    return {
      label: `Semester ${semester}`,
      subjects: MCA_TYL_SUBJECTS,
    };
  }

  const plan = NON_MCA_TYL_PLANS[Number(semester)];
  return {
    label: plan?.label || `Semester ${semester}`,
    subjects: NON_MCA_TYL_SUBJECTS,
  };
};

export const getTylTemplateSubjects = (department = "") =>
  getTylDepartmentKind(department) === "mca" ? MCA_TYL_SUBJECTS : NON_MCA_TYL_SUBJECTS;
