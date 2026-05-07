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
