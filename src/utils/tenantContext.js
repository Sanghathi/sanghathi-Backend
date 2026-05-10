const DEFAULT_COLLEGE_CODE = (process.env.DEFAULT_COLLEGE_CODE || "CMRIT")
  .toString()
  .trim()
  .toUpperCase();

export const normalizeCollegeCode = (value) => {
  if (!value) {
    return null;
  }

  return value.toString().trim().toUpperCase();
};

export const normalizeDepartment = (value) => {
  if (!value) {
    return null;
  }

  return value.toString().trim();
};

const inferDepartmentFromEmail = (email) => {
  if (!email || typeof email !== "string") {
    return null;
  }

  const localPart = email.split("@")[0]?.toLowerCase() || "";
  const segments = localPart.split(/[._-]+/).filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const rolePrefixes = new Set(["admin", "hod", "director"]);
  if (!rolePrefixes.has(segments[0])) {
    return null;
  }

  return normalizeDepartment(segments.slice(1).join("-").toUpperCase()) || null;
};

export const resolveCollegeCode = ({ body, query, user } = {}) => {
  const candidate =
    body?.collegeCode ||
    query?.collegeCode ||
    user?.collegeCode ||
    DEFAULT_COLLEGE_CODE;

  return normalizeCollegeCode(candidate);
};

export const isSuperAdmin = (user) => {
  const roleName = user?.roleName || user?.role?.name;
  if (!roleName) {
    return false;
  }

  return roleName.toLowerCase() === "super-admin";
};

export const getScopedCollegeCode = (req) => {
  if (!req?.user) {
    return null;
  }

  if (isSuperAdmin(req.user)) {
    return normalizeCollegeCode(req?.query?.collegeCode) || null;
  }

  return req.user.collegeCode || null;
};

export const getScopedDepartment = (req) => {
  if (!req?.user) {
    return null;
  }

  const roleName = (req.user.role?.name || req.user.roleName || "").toLowerCase();
  const isDeptScopedRole = ["admin", "director", "hod", "strcoordinator"].includes(roleName);

  if (isSuperAdmin(req.user)) {
    return normalizeDepartment(req?.query?.department) || null;
  }

  if (!isDeptScopedRole) {
    return null;
  }

  return normalizeDepartment(req.user.department) || inferDepartmentFromEmail(req.user.email);
};

import mongoose from "mongoose";

/**
 * Async resolver for scoped department. Use this when `req.user.department` may be missing
 * and a lookup against StudentProfile/FacultyProfile is required.
 */
export const resolveScopedDepartment = async (req) => {
  if (!req?.user) return null;

  const roleName = (req.user.role?.name || req.user.roleName || "").toLowerCase();
  const isDeptScopedRole = ["admin", "director", "hod", "strcoordinator"].includes(roleName);

  if (isSuperAdmin(req.user)) {
    return normalizeDepartment(req?.query?.department) || null;
  }

  if (!isDeptScopedRole) return null;

  // If department already present on user, return normalized value
  if (req.user.department) return normalizeDepartment(req.user.department);

  const inferredDepartment = inferDepartmentFromEmail(req.user.email);
  if (inferredDepartment) return inferredDepartment;

  // Otherwise try to resolve from related profiles
  try {
    const collegeCode = normalizeCollegeCode(req.user.collegeCode) || DEFAULT_COLLEGE_CODE;

    const [studentProfile, facultyProfile] = await Promise.all([
      mongoose
        .model("StudentProfile")
        .findOne({ userId: req.user._id, collegeCode })
        .select("department")
        .lean(),
      mongoose
        .model("FacultyProfile")
        .findOne({ userId: req.user._id, collegeCode })
        .select("department")
        .lean(),
    ]);

    const dept = studentProfile?.department || facultyProfile?.department || null;
    if (dept) return normalizeDepartment(dept);

    // Final fallback: read department from User document in DB (in case req.user wasn't populated)
    try {
      const userDoc = await mongoose.model("User").findById(req.user._id).select("department").lean();
      return normalizeDepartment(userDoc?.department);
    } catch (errUser) {
      return null;
    }
  } catch (err) {
    // On any error, return null to avoid breaking callers
    return null;
  }
};

export const getCollegeScopeFilter = (
  collegeCode,
  { includeLegacy = true } = {}
) => {
  if (!collegeCode) {
    return {};
  }

  if (!includeLegacy) {
    return { collegeCode };
  }

  return {
    $or: [
      { collegeCode },
      { collegeCode: { $exists: false } },
      { collegeCode: null },
    ],
  };
};

export const mergeCollegeScope = (filter, collegeCode, options) => {
  const scope = getCollegeScopeFilter(collegeCode, options);
  if (!Object.keys(scope).length) {
    return filter;
  }

  return {
    $and: [filter, scope],
  };
};

export { DEFAULT_COLLEGE_CODE };
