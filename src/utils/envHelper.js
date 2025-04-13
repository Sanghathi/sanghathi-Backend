/**
 * Helper function to check and get API keys from environment variables
 */

export const getGeminiApiKey = () => {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Google Gemini API key (GOOGLE_GEMINI_API_KEY) is not set in environment variables");
  }
  return apiKey;
};

export const getEnvironmentVariable = (key, description = "environment variable") => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${description} (${key}) is not set in environment variables`);
  }
  return value;
}; 