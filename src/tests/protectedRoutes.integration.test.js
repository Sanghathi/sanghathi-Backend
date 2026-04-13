import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

let server;
let baseUrl;
let previousNodeEnv;
let previousOpenAIKey;
let previousGeminiKey;

const requestCases = [
  { method: "GET", path: "/api/threads" },
  { method: "GET", path: "/api/meetings" },
  { method: "GET", path: "/api/private-conversations" },
  { method: "GET", path: "/api/notifications/test-user-id" },
  { method: "GET", path: "/api/students" },
  { method: "GET", path: "/api/roles" },
  {
    method: "POST",
    path: "/api/campus-buddy",
    body: { question: "What is the library timing?" },
  },
];

beforeAll(async () => {
  previousNodeEnv = process.env.NODE_ENV;
  previousOpenAIKey = process.env.OPENAI_API_KEY;
  previousGeminiKey = process.env.GOOGLE_GEMINI_API_KEY;

  process.env.NODE_ENV = "production";
  if (!process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = "test-openai-key";
  }
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    process.env.GOOGLE_GEMINI_API_KEY = "test-gemini-key";
  }

  const { default: app } = await import("../index.js");
  server = app.listen(0);

  await new Promise((resolve) => {
    server.on("listening", resolve);
  });

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
  process.env.OPENAI_API_KEY = previousOpenAIKey;
  process.env.GOOGLE_GEMINI_API_KEY = previousGeminiKey;
});

describe("protected routes integration", () => {
  for (const { method, path, body } of requestCases) {
    it(`${method} ${path} returns 401 without token`, async () => {
      const options = {
        method,
        headers: {},
      };

      if (body) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${baseUrl}${path}`, options);
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload).toEqual(
        expect.objectContaining({
          status: expect.any(String),
          message: expect.any(String),
        })
      );
      expect(payload.message.toLowerCase()).toContain("log in");
    });
  }
});
