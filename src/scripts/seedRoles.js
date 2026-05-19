// scripts/seedRoles.js
import mongoose from "mongoose";
import Role from "../models/Role.js";

import logger from "../utils/logger.js";
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

    const roles = [
      {
        id: 0,
        name: "super-admin",
        permissions: ["*"]
      },
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
      {
        id: 4,
        name: "hod",
        permissions: ["read:users", "create:users", "update:users"],
      },
      {
        id: 5,
        name: "director",
        permissions: ["read:users", "create:users", "update:users"],
      },
      {
        id: 6,
        name: "doe",
        permissions: ["read:users"],
      },
    ];

    await Promise.all(
      roles.map((role) =>
        Role.updateOne({ name: role.name }, { $set: role }, { upsert: true })
      )
    );

    logger.info("Roles seeded successfully");
  } catch (error) {
    logger.error("Error seeding roles:", error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
  }
}

seedRoles();
