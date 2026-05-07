
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Role from "../models/Role.js";
import StudentProfile from "../models/Student/Profile.js";
import FacultyProfile from "../models/Faculty/FacultyDetails.js";
import Department from "../models/Department.js";
import { encrypt } from "../utils/passwordHelper.js";

dotenv.config({ path: ".env.local" });

const createDemoUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const mcaDept = await Department.findOne({ code: "MCA" });
    if (!mcaDept) {
      console.error("MCA Department not found!");
      process.exit(1);
    }

    const studentRole = await Role.findOne({ name: "student" });
    const facultyRole = await Role.findOne({ name: "faculty" });

    if (!studentRole || !facultyRole) {
      console.error("Roles not found!");
      process.exit(1);
    }

    const password = "password123";

    // Create Demo Student
    const studentData = {
      name: "Demo MCA Student",
      email: "demostudent.mca@cmrit.ac.in",
      password: password,
      passwordConfirm: password,
      role: studentRole._id,
      roleName: "student",
      collegeCode: "CMRIT",
      department: "MCA", // Adding department directly to User doc
      status: "active"
    };

    let studentUser = await User.findOne({ email: studentData.email });
    if (!studentUser) {
      studentUser = await User.create(studentData);
      console.log("Demo Student User created");
    } else {
      studentUser.department = "MCA";
      await studentUser.save();
      console.log("Demo Student User updated with department");
    }

    let studentProfile = await StudentProfile.findOne({ userId: studentUser._id });
    if (!studentProfile) {
      studentProfile = await StudentProfile.create({
        userId: studentUser._id,
        collegeCode: "CMRIT",
        fullName: { firstName: "Demo", lastName: "Student" },
        department: "MCA",
        departmentId: mcaDept._id,
        sem: 1,
        usn: "DEMOMCA001",
        email: studentData.email
      });
      studentUser.profile = studentProfile._id;
      await studentUser.save();
      console.log("Demo Student Profile created");
    }

    // Create Demo Faculty
    const facultyData = {
      name: "Demo MCA Faculty",
      email: "demofaculty.mca@cmrit.ac.in",
      password: password,
      passwordConfirm: password,
      role: facultyRole._id,
      roleName: "faculty",
      collegeCode: "CMRIT",
      department: "MCA", // Adding department directly to User doc
      status: "active"
    };

    let facultyUser = await User.findOne({ email: facultyData.email });
    if (!facultyUser) {
      facultyUser = await User.create(facultyData);
      console.log("Demo Faculty User created");
    } else {
      facultyUser.department = "MCA";
      await facultyUser.save();
      console.log("Demo Faculty User updated with department");
    }

    let facultyProfile = await FacultyProfile.findOne({ userId: facultyUser._id });
    if (!facultyProfile) {
      facultyProfile = await FacultyProfile.create({
        userId: facultyUser._id,
        collegeCode: "CMRIT",
        fullName: { firstName: "Demo", lastName: "Faculty" },
        department: "MCA",
        departmentId: mcaDept._id,
        cabin: "MCA Block 1st Floor",
        email: facultyData.email
      });
      console.log("Demo Faculty Profile created");
    }

    console.log("Demo MCA users created/updated successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating demo users:", error);
    process.exit(1);
  }
};

createDemoUsers();
