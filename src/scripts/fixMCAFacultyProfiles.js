
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import User from "../models/User.js";
import FacultyProfile from "../models/Faculty/FacultyDetails.js";
import Department from "../models/Department.js";

dotenv.config({ path: ".env.local" });

const fixProfiles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const mcaDept = await Department.findOne({ code: "MCA" });
    if (!mcaDept) {
      console.error("MCA Department not found!");
      process.exit(1);
    }

    const csvPath = path.join(process.cwd(), "public/data/mca/faculty_template - faculty_template.csv");
    const csvData = fs.readFileSync(csvPath, "utf8");
    const lines = csvData.split("\n").slice(1); // skip header

    for (const line of lines) {
      if (!line.trim()) continue;
      const [fullName, email, phone, dept, password] = line.split(",");
      
      const user = await User.findOne({ email: email.trim().toLowerCase() });
      if (user) {
        console.log(`Processing ${user.name} (${user.email})...`);
        
        // Ensure department is set on User doc
        if (user.department !== "MCA") {
          user.department = "MCA";
          await user.save();
          console.log(`  Updated department on User doc`);
        }

        // Check for FacultyProfile
        let profile = await FacultyProfile.findOne({ userId: user._id });
        if (!profile) {
          // Create profile
          const nameParts = fullName.trim().split(" ");
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Faculty";

          profile = await FacultyProfile.create({
            userId: user._id,
            collegeCode: "CMRIT",
            fullName: { firstName, lastName },
            department: "MCA",
            departmentId: mcaDept._id,
            cabin: "MCA Block",
            email: user.email,
            mobileNumber: parseInt(phone.trim().replace(/\D/g, "")) || 0
          });
          console.log(`  Created FacultyProfile`);
        } else {
          // Update profile if department is wrong
          if (profile.department !== "MCA") {
            profile.department = "MCA";
            profile.departmentId = mcaDept._id;
            await profile.save();
            console.log(`  Updated department on FacultyProfile`);
          } else {
            console.log(`  Profile already correct`);
          }
        }
      } else {
        console.warn(`User with email ${email} not found in DB`);
      }
    }

    console.log("All MCA faculty profiles fixed!");
    process.exit(0);
  } catch (error) {
    console.error("Error fixing profiles:", error);
    process.exit(1);
  }
};

fixProfiles();
