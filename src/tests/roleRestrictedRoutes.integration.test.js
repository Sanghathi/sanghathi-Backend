import express from "express";
import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";
import AppError from "../utils/appError.js";
import globalErrorHandler from "../controllers/errorController.js";

const mockProtect = (req, res, next) => {
  const roleFromHeader = req.headers["x-test-role"];

  if (!roleFromHeader) {
    return next(
      new AppError("You are not logged in! Please log in to get access", 401)
    );
  }

  req.user = {
    role: {
      name: String(roleFromHeader).toLowerCase(),
    },
  };

  return next();
};

const mockRestrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user?.role?.name || !roles.includes(req.user.role.name)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }

    return next();
  };
};

jest.unstable_mockModule("../controllers/authController.js", () => ({
  protect: mockProtect,
  restrictTo: mockRestrictTo,
}));

let previousNodeEnv;
let server;
let baseUrl;

beforeAll(async () => {
  previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  const [{ default: roleRoutes }, { default: iatMarksRoutes }] = await Promise.all([
    import("../routes/roleRoutes.js"),
    import("../routes/Admin/IatmarksRouter.js"),
  ]);

  const app = express();
  app.use(express.json());
  app.use("/api", roleRoutes);
  app.use("/api/students/Iat", iatMarksRoutes);
  app.use(globalErrorHandler);

  server = app.listen(0);
  await new Promise((resolve) => server.on("listening", resolve));

  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

  process.env.NODE_ENV = previousNodeEnv;
});

const doRequest = async ({ method, path, role }) => {
  const headers = role ? { "x-test-role": role } : {};
  return fetch(`${baseUrl}${path}`, { method, headers });
};

describe("role restricted routes integration", () => {
  it("returns 401 when role header is missing on /api/roles", async () => {
    const response = await doRequest({ method: "GET", path: "/api/roles" });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.message.toLowerCase()).toContain("log in");
  });

  it("returns 403 for student role on /api/roles", async () => {
    const response = await doRequest({
      method: "GET",
      path: "/api/roles",
      role: "student",
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.message.toLowerCase()).toContain("permission");
  });

  it("returns 403 for faculty role on /api/roles/admin", async () => {
    const response = await doRequest({
      method: "GET",
      path: "/api/roles/admin",
      role: "faculty",
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.message.toLowerCase()).toContain("permission");
  });

  it("returns 401 when role header is missing on IAT route", async () => {
    const response = await doRequest({
      method: "GET",
      path: "/api/students/Iat/test-user-id",
    });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.message.toLowerCase()).toContain("log in");
  });

  it("returns 403 for faculty role on IAT route", async () => {
    const response = await doRequest({
      method: "GET",
      path: "/api/students/Iat/test-user-id",
      role: "faculty",
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.message.toLowerCase()).toContain("permission");
  });
});
