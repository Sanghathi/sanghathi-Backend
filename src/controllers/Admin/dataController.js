import multer from "multer";
import xlsx from "xlsx";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import logger from "../../utils/logger.js";
import User from "../../models/User.js";
import Role from "../../models/Role.js";
import StudentProfile from "../../models/Student/Profile.js";
import FacultyProfile from "../../models/Faculty/FacultyDetails.js";
import AdminUploadSession from "../../models/AdminUploadSession.js";
import { resolveCollegeCode, getScopedCollegeCode, resolveScopedDepartment } from "../../utils/tenantContext.js";
import { resolveDepartmentForCollege } from "../../utils/departmentResolver.js";

const storage = multer.memoryStorage();
export const upload = multer({ storage });

const EXPECTED_HEADERS = {
  students: [
    "Full Name",
    "Email Address",
    "Phone Number",
    "Department",
    "Semester",
    "USN",
    "Password",
  ],
  faculty: ["Full Name", "Email Address", "Phone Number", "Department", "Password"],
};

const normalizeHeaders = (headers = []) => headers.map((h) => h && h.toString().trim());

export const uploadData = catchAsync(async (req, res, next) => {
  const tabType = "add-users";

  if (!req.file) {
    return next(new AppError("No file uploaded", 400));
  }

  const type = (req.body.type || "students").toString().toLowerCase();
  if (!["students", "faculty"].includes(type)) {
    return next(new AppError("Invalid type. Allowed: students|faculty", 400));
  }

  const apply = req.body.apply === "true" || req.body.apply === true;

  // parse CSV/Excel from buffer
  const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  const fileHeaders = normalizeHeaders(Object.keys(rows[0] || {}));
  const expected = EXPECTED_HEADERS[type];

  // quick header validation
  const missing = expected.filter((h) => !fileHeaders.includes(h));
  if (missing.length) {
    return next(new AppError(`Missing required columns: ${missing.join(", ")}`, 400));
  }

  const collegeCode = resolveCollegeCode({ body: req.body, user: req.user });
  const scopedDepartment = await resolveScopedDepartment(req);

  const sessionDoc = {
    adminUserId: req.user?._id || null,
    source: "dashboard-ui",
    tabType,
    fileName: req.file.originalname || "upload.csv",
    totalRows: rows.length,
    successCount: 0,
    errorCount: 0,
    errors: [],
    createdUserIds: [],
    affectedUserIds: [],
    metadata: { type, preview: [], collegeCode, department: scopedDepartment || null },
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const fullName = (row[expected[0]] || row["Full Name"]).toString().trim();
      const email = (row[expected[1]] || row["Email Address"]).toString().trim().toLowerCase();
      const phone = (row[expected[2]] || row["Phone Number"]).toString().trim();
      const departmentRaw = (row["Department"] || "").toString().trim();
      const password = (row["Password"] || "admin1234").toString();

      const departmentDoc = await resolveDepartmentForCollege({
        department: departmentRaw,
        collegeCode,
      });

      // If the current admin is department-scoped, prevent uploads for other departments
      if (scopedDepartment && departmentDoc && departmentDoc.name.toLowerCase() !== scopedDepartment.toLowerCase()) {
        throw new Error(
          `Row ${i + 2}: You are scoped to department '${scopedDepartment}' and cannot upload data for '${departmentDoc.name}'`
        );
      }
      if (!departmentDoc) {
        throw new Error(`Row ${i + 2}: Department '${departmentRaw}' not found for college ${collegeCode}`);
      }

      const nameParts = fullName.split(/\s+/).filter(Boolean);
      const firstName = nameParts.shift() || "";
      const lastName = nameParts.join(" ") || firstName;

      const roleName = type === "students" ? "student" : "faculty";
      const roleDoc = await Role.findOne({ name: new RegExp(`^${roleName}$`, "i") });
      if (!roleDoc) {
        throw new Error(`Role '${roleName}' not found`);
      }

      // preview entry
      const previewItem = { row: i + 2, email, fullName, role: roleName, department: departmentDoc.name };
      sessionDoc.metadata.preview.push(previewItem);

      if (!apply) {
        sessionDoc.successCount += 1;
        continue;
      }

      // skip if user already exists
      const existing = await User.findOne({ email }).lean();
      if (existing) {
        sessionDoc.affectedUserIds.push(existing._id);
        sessionDoc.errorCount += 1;
        sessionDoc.errors.push(`Row ${i + 2}: User with email ${email} already exists`);
        continue;
      }

      const newUser = await User.create({
        name: fullName,
        email,
        phone,
        password,
        role: roleDoc._id,
        roleName: roleDoc.name,
        collegeCode,
      });

      if (type === "students") {
        const semRaw = (row["Semester"] || "").toString().trim();
        const sem = parseInt(semRaw, 10) || 0;
        const usn = (row["USN"] || "").toString().trim();

        const profile = await StudentProfile.create({
          userId: newUser._id,
          collegeCode,
          fullName: { firstName, lastName },
          department: departmentDoc.name,
          departmentId: departmentDoc._id,
          sem,
          usn,
          email,
          mobileNumber: phone ? Number(phone.replace(/\D/g, "")) : undefined,
        });

        newUser.profile = profile._id;
        await newUser.save();
        sessionDoc.createdUserIds.push(newUser._id);
        sessionDoc.successCount += 1;
      } else {
        // faculty
        const profile = await FacultyProfile.create({
          userId: newUser._id,
          collegeCode,
          fullName: { firstName, lastName },
          department: departmentDoc.name,
          departmentId: departmentDoc._id,
          cabin: "",
          email,
          mobileNumber: phone ? Number(phone.replace(/\D/g, "")) : undefined,
        });

        sessionDoc.createdUserIds.push(newUser._id);
        sessionDoc.successCount += 1;
      }
    } catch (err) {
      logger.error("Admin upload row error", { err: err?.message || err });
      sessionDoc.errorCount += 1;
      sessionDoc.errors.push(err.message || String(err));
    }
  }

  // set overall status
  sessionDoc.status = sessionDoc.errorCount > 0 && sessionDoc.successCount === 0 ? "failed" : sessionDoc.errorCount > 0 ? "partial" : "success";

  const saved = await AdminUploadSession.create(sessionDoc);

  res.status(200).json({ status: "success", data: { session: saved } });
});

export default {
  uploadData,
  upload,
};
