import mongoose from "mongoose";
import dotenv from "dotenv";
import Department from "../models/Department.js";
import Role from "../models/Role.js";
import User from "../models/User.js";

dotenv.config({ path: ".env.local" });

const COLLEGE_CODE = "CMRIT";
const DEFAULT_PASSWORD = "admin1234";

const NEW_DEPARTMENTS = ["CSE", "ECE", "AIDS", "AIML", "MBA"];
const DEPARTMENT_ROLES = ["admin", "hod", "doe"];

const connect = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
};

const getRoleDocs = async () => {
  const roleDocs = await Role.find({ name: { $in: DEPARTMENT_ROLES } }).lean();
  const roleMap = new Map(roleDocs.map((role) => [role.name.toLowerCase(), role]));
  const missingRoles = DEPARTMENT_ROLES.filter((roleName) => !roleMap.has(roleName));

  if (missingRoles.length) {
    throw new Error(`Missing required roles: ${missingRoles.join(", ")}`);
  }

  return roleMap;
};

const seedDepartments = async () => {
  const departmentDocs = [];

  for (const code of NEW_DEPARTMENTS) {
    const departmentDoc = await Department.findOneAndUpdate(
      { collegeCode: COLLEGE_CODE, code },
      {
        $set: {
          collegeCode: COLLEGE_CODE,
          code,
          name: code,
          status: "active",
        },
      },
      { upsert: true, new: true }
    );

    departmentDocs.push(departmentDoc);
  }

  return departmentDocs;
};

const seedUsers = async (roleMap) => {
  const createdUsers = [];

  for (const department of NEW_DEPARTMENTS) {
    for (const roleName of DEPARTMENT_ROLES) {
      const email = `${roleName}.${department.toLowerCase()}@cmrit.ac.in`;
      const existingUser = await User.findOne({ email });
      const roleDoc = roleMap.get(roleName);

      if (!roleDoc) {
        throw new Error(`Role document not found for ${roleName}`);
      }

      const payload = {
        name: `${roleName.toUpperCase()} ${department}`,
        email,
        password: DEFAULT_PASSWORD,
        passwordConfirm: DEFAULT_PASSWORD,
        role: roleDoc._id,
        roleName: roleDoc.name,
        collegeCode: COLLEGE_CODE,
        department,
        status: "active",
      };

      let user;
      if (existingUser) {
        Object.assign(existingUser, payload);
        user = await existingUser.save();
      } else {
        user = await User.create(payload);
      }

      createdUsers.push({
        department,
        role: roleName,
        email: user.email,
      });
    }
  }

  return createdUsers;
};

const main = async () => {
  try {
    await connect();
    const roleMap = await getRoleDocs();
    const departments = await seedDepartments();
    const users = await seedUsers(roleMap);

    console.log(`Seeded ${departments.length} departments and ${users.length} role accounts.`);
    console.log(`Default password for seeded accounts: ${DEFAULT_PASSWORD}`);
  } catch (error) {
    console.error("Failed to seed new departments:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

main();
