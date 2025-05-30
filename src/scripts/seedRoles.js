import mongoose from "mongoose";
import Role from "../models/Role.js";
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

// Get directory name in ESM
const __dirname = dirname(fileURLToPath(import.meta.url));
// Load .env file from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function seedRoles() {
  try {
    // Verify MONGODB_URI is loaded
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Clear existing roles first
    await Role.deleteMany({});
    console.log('Cleared existing roles');

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

    console.log("✅ Roles seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding roles:", error);
  } finally {
    await mongoose.disconnect();
    console.log("📡 Disconnected from MongoDB");
  }
}

// Run the seed function
seedRoles();
