import Department from "../models/Department.js";

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const resolveDepartmentForCollege = async ({
  department,
  collegeCode,
}) => {
  if (!department || !collegeCode) {
    return null;
  }

  const trimmed = department.toString().trim();
  if (!trimmed) {
    return null;
  }

  const normalizedCode = trimmed.toUpperCase();
  const nameRegex = new RegExp(`^${escapeRegex(trimmed)}$`, "i");

  return Department.findOne({
    collegeCode,
    $or: [{ code: normalizedCode }, { name: nameRegex }],
  }).lean();
};
