import User from "../models/User.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import {
  getScopedCollegeCode,
  mergeCollegeScope,
} from "../utils/tenantContext.js";
import logger from "../utils/logger.js";

/**
 * Get all mentors (faculty) from the same department as the HOD
 * Only accessible by HOD users
 * Returns: name, email, avatar, department
 */
export const getDepartmentMentors = catchAsync(async (req, res, next) => {
  // Get the HOD's college code for multi-tenant support
  const collegeCode = getScopedCollegeCode(req);

  // Verify that the HOD has a department assigned
  if (!req.user.department) {
    return next(
      new AppError(
        "Your HOD profile does not have a department assigned. Please contact your administrator.",
        400
      )
    );
  }

  // Build the filter for mentors (faculty) in the same department
  const mentorFilter = mergeCollegeScope(
    {
      roleName: "faculty", // Get all users with faculty role
      department: req.user.department, // Same department as HOD
      status: "active", // Only active users
    },
    collegeCode
  );

  // Fetch all mentors with only the required fields
  const mentors = await User.find(mentorFilter)
    .select("name email avatar department")
    .lean();

  logger.info(
    `[HOD Mentors] Fetched ${mentors.length} mentors for HOD ${req.user._id} in department ${req.user.department}`
  );

  // Return the mentors
  res.status(200).json({
    status: "success",
    data: {
      mentors,
      count: mentors.length,
    },
  });
});

/**
 * Get a specific mentor's details by ID (if they're in the same department)
 * Only accessible by HOD users
 */
export const getMentorById = catchAsync(async (req, res, next) => {
  const collegeCode = getScopedCollegeCode(req);
  const { mentorId } = req.params;

  // Verify the mentor belongs to the same department and is active
  const mentor = await User.findOne(
    mergeCollegeScope(
      {
        _id: mentorId,
        roleName: "faculty",
        department: req.user.department,
        status: "active",
      },
      collegeCode
    )
  ).select("name email avatar department");

  if (!mentor) {
    return next(
      new AppError(
        "Mentor not found in your department or does not have faculty role",
        404
      )
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      mentor,
    },
  });
});
