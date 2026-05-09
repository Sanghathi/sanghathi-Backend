
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import FacultyProfile from "../models/Faculty/FacultyDetails.js";
import Department from "../models/Department.js";

dotenv.config({ path: ".env.local" });

const fixMentors = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const mcaDept = await Department.findOne({ code: "MCA" });
    if (!mcaDept) {
      console.error("MCA Department not found!");
      process.exit(1);
    }

    const mentorEmails = [
      "demofaculty.mca@cmrit.ac.in",
      "anish.mca@cmrit.ac.in",
      "ramesh.mca@cmrit.ac.in",
      "savitha.mca@cmrit.ac.in"
    ];

    for (const email of mentorEmails) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        console.log(`Fixing mentor: ${user.name} (${user.email})...`);
        user.department = "MCA";
        await user.save();
        console.log(`  Updated User department to MCA`);

        let profile = await FacultyProfile.findOne({ userId: user._id });
        if (!profile) {
          const nameParts = user.name.split(" ");
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Faculty";

          profile = await FacultyProfile.create({
            userId: user._id,
            collegeCode: "CMRIT",
            fullName: { firstName, lastName },
            department: "MCA",
            departmentId: mcaDept._id,
            email: user.email,
            mobileNumber: parseInt(user.phone?.replace(/\D/g, "")) || 0
          });
          console.log(`  Created missing FacultyProfile`);
        } else {
          profile.department = "MCA";
          profile.departmentId = mcaDept._id;
          await profile.save();
          console.log(`  Updated FacultyProfile department to MCA`);
        }
      } else {
        console.warn(`User with email ${email} not found!`);
      }
    }

    console.log("Mentors fixed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error fixing mentors:", error);
    process.exit(1);
  }
};

fixMentors();
