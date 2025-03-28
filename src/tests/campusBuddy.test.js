import dotenv from 'dotenv';
import campusBuddy from '../services/campusBuddy.js';
import logger from "../utils/logger.js";

// Load environment variables
dotenv.config();

async function testCampusBuddy() {
  try {
    console.log('Testing Campus Buddy...');
    
    const testQuery = "What are the library timings?";
    console.log('Query:', testQuery);
    
    const response = await campusBuddy.generateResponse(testQuery);
    console.log('Response:', response);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
    logger.error("Test failed", {
      error: error.message,
      stack: error.stack,
    });
  }
}

testCampusBuddy(); 