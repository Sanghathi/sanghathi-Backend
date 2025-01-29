import User from "../../models/User.js";
import Role from "../../models/Role.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
// ViewUserController.js
export const getGroupedStudents = catchAsync(async (req, res, next) => {
  const studentRole = await Role.findOne({ name: "student" });
  if (!studentRole) return next(new AppError("Student role not found", 404));

  const groupedStudents = await User.aggregate([
    { $match: { role: studentRole._id } },
    { 
      $lookup: {
        from: "studentprofiles",
        localField: "_id",
        foreignField: "userId",
        as: "profile"
      }
    },
    { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: {
          semester: "$profile.semester",
          branch: "$profile.department"
        },
        users: {
          $push: {
            _id: "$_id",
            name: "$name",
            email: "$email",
            profile: {
              usn: "$profile.usn",
              department: "$profile.department",
              semester: "$profile.semester"
            }
          }
        }
      }
    },
    {
      $project: {
        semester: "$_id.semester",
        branch: "$_id.branch",
        users: 1,
        _id: 0
      }
    },
    { $sort: { semester: 1, branch: 1 } }
  ]);

  res.status(200).json({
    status: "success",
    data: groupedStudents
  });
});