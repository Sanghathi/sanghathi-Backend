// scripts/seedRoles.js
import mongoose from "mongoose";
import Role from "../models/Role.js";

async function seedRoles() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    // Seed the roles
    await Role.create([
      {
        id: 1,
        name: "admin",
        permissions: [
          "read:users",
          "create:users",
          "update:users",
          "delete:users",
        ],
      },
      {
        id: 2,
        name: "faculty",
        permissions: ["read:users", "create:users", "update:users"],
      },
      {
        id: 3,
        name: "student",
        permissions: ["read:users"],
      },
    ]);

    console.log("Roles seeded successfully");
  } catch (error) {
    console.error("Error seeding roles:", error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
  }
}

seedRoles();
