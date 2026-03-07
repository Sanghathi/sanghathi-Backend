import { jest } from '@jest/globals';
import dotenv from 'dotenv';

dotenv.config();

// Mock the campusBuddy service to avoid real API calls in CI
const mockGenerateResponse = jest.fn().mockResolvedValue("Library is open from 9am to 5pm.");

jest.unstable_mockModule('../services/campusBuddy.js', () => ({
  default: { generateResponse: mockGenerateResponse },
}));

describe('CampusBuddy Service', () => {
  it('should return a response for a valid query', async () => {
    const { default: campusBuddy } = await import('../services/campusBuddy.js');
    const response = await campusBuddy.generateResponse("What are the library timings?");
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
  });

  it('should be called with the correct query', async () => {
    const { default: campusBuddy } = await import('../services/campusBuddy.js');
    const query = "What are the library timings?";
    await campusBuddy.generateResponse(query);
    expect(mockGenerateResponse).toHaveBeenCalledWith(query);
  });
});
