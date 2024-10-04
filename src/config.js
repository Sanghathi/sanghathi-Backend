import dotenv from "dotenv";

const path =
  process.env.NODE_ENV === "development"
    ? ".env.development"
    : ".env.production";

dotenv.config({ path });
