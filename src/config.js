import dotenv from "dotenv";

const primaryEnvFile =
  process.env.NODE_ENV === "development"
    ? ".env.development"
    : ".env.production";

// Load env files in priority order without overriding already loaded values.
[primaryEnvFile, ".env.local", ".env"].forEach((envPath) => {
  dotenv.config({ path: envPath, override: false });
});
