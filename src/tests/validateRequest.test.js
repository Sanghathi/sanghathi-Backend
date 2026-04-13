import { z } from "zod";
import { jest } from "@jest/globals";
import validateRequest from "../middlewares/validateRequest.js";

describe("validateRequest middleware", () => {
  it("passes valid payloads to next", () => {
    const schema = z.object({
      name: z.string().min(1),
    });

    const middleware = validateRequest(schema);
    const req = { body: { name: "Alice" } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body).toEqual({ name: "Alice" });
  });

  it("returns 400 for invalid payloads", () => {
    const schema = z.object({
      name: z.string().min(1),
    });

    const middleware = validateRequest(schema);
    const req = { body: { name: "" } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "fail",
        message: "Invalid request body",
      })
    );
  });

  it("applies schema transforms and coercion to req.body", () => {
    const schema = z.object({
      name: z.string().trim().min(1),
      semester: z.coerce.number().int().min(1),
    });

    const middleware = validateRequest(schema);
    const req = { body: { name: "  Alice  ", semester: "5" } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).toEqual({ name: "Alice", semester: 5 });
  });

  it("returns nested path information for schema errors", () => {
    const schema = z.object({
      profile: z.object({
        email: z.string().email(),
      }),
    });

    const middleware = validateRequest(schema);
    const req = { body: { profile: { email: "not-an-email" } } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({ path: "profile.email" }),
        ]),
      })
    );
  });
});