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
});