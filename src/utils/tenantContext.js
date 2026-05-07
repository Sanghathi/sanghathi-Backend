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
  const isDeptScopedRole = ["admin", "director", "hod"].includes(roleName);

  if (isSuperAdmin(req.user)) {
    return normalizeDepartment(req?.query?.department) || null;
  }

  if (!isDeptScopedRole) {
    return null;
  }

  return normalizeDepartment(req.user.department);
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
