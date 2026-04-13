import { jest } from "@jest/globals";
import AppError from "../utils/appError.js";
import { protect, restrictTo } from "../controllers/authController.js";
import { authorizePermissions } from "../middlewares/authMiddleware.js";

describe("auth guard middleware", () => {
  describe("protect", () => {
    it("returns 401 when authorization header is missing", async () => {
      const req = { headers: {} };
      const res = {};
      const next = jest.fn();

      await protect(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
    });

    it("returns 401 when authorization header is not a Bearer token", async () => {
      const req = { headers: { authorization: "Token abc123" } };
      const res = {};
      const next = jest.fn();

      await protect(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
    });
  });

  describe("restrictTo", () => {
    it("allows a request when role is permitted", () => {
      const req = { user: { role: { name: "faculty" } } };
      const res = {};
      const next = jest.fn();

      const middleware = restrictTo("admin", "faculty");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it("returns 403 when role is not permitted", () => {
      const req = { user: { role: { name: "student" } } };
      const res = {};
      const next = jest.fn();

      const middleware = restrictTo("admin", "faculty");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
    });
  });

  describe("authorizePermissions", () => {
    it("allows requests when all required permissions are present", () => {
      const req = {
        user: {
          role: {
            permissions: ["read:students", "write:students", "read:threads"],
          },
        },
      };
      const res = {};
      const next = jest.fn();

      const middleware = authorizePermissions("read:students", "write:students");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it("returns 403 when any required permission is missing", () => {
      const req = {
        user: {
          role: {
            permissions: ["read:students"],
          },
        },
      };
      const res = {};
      const next = jest.fn();

      const middleware = authorizePermissions("read:students", "write:students");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
    });

    it("returns 403 when user role metadata is missing", () => {
      const req = { user: {} };
      const res = {};
      const next = jest.fn();

      const middleware = authorizePermissions("read:students");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
    });
  });
});
