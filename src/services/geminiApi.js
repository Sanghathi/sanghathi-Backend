import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../utils/logger.js";
import { getGeminiApiKey } from "../utils/envHelper.js";

class GeminiService {
  constructor() {
    this.apiKey = getGeminiApiKey();
    
    // Initialize the Google Generative AI client
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    
    // Configure the model (Gemini-1.5-flash is the recommended model for most use cases)
    this.modelName = "gemini-1.5-flash";
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    
    console.log(`Initialized Google Gemini API with model: ${this.modelName}`);
    
    // Store conversation history
    this.conversations = {};
  }
  
  /**
   * Generates a response using the Google Gemini model
   * @param {string} query - The user's query
   * @param {string} threadId - A unique identifier for the conversation
   * @returns {Promise<string>} - The model's response
   */
  async generateResponse(query, threadId) {
    try {
      // Create conversation history if it doesn't exist
      if (!this.conversations[threadId]) {
        this.conversations[threadId] = [];
      }
      
      // Prepare system prompt (same as the one used with Hugging Face)
      const systemPrompt = `You are CMRIT Campus Buddy, an AI assistant for CMR Institute of Technology (CMRIT), Bangalore.

CRITICAL RESPONSE RULES - STRICTLY FOLLOW THESE:
1. EVERY response MUST be exactly 1-2 lines MAX (25-60 words total)
2. NEVER respond with more than 2 lines of text in ANY scenario
3. Focus only on CMRIT-specific information
4. No introductions like "I am" or "As a"
5. No conclusions or suggestions
6. For unknown info, simply say "Contact CMRIT administration for details"
7. Never use bullet points or lists
8. Always start with "A: " followed by brief content
9. Never introduce yourself or mention being an AI
10. Never apologize or state limitations

Here's the CMRIT information you can reference (but keep responses within 1-2 lines ONLY):

CMRIT: Est. 2000, VTU affiliated, NAAC A+ grade, located in Bangalore.
Courses: Computer Science, Information Science, AIML, AI and DS, CSE(AIML), CS(DS), MBA, MCA.
Vision: Premier institution nurturing competent professionals with integrity and social commitment.

E-Mithru/Sanghathi Information:
E-Mithru (also known as Sanghathi) is CMRIT's digital mentoring platform designed to connect mentors and mentees. It enables personalized guidance, tracks student progress, facilitates communication between faculty and students, and provides career counseling tools.

REMEMBER: NEVER exceed 2 lines (60 words max) under ANY circumstances.`;

      // Create the chat session
      const chat = this.model.startChat({
        history: this.conversations[threadId],
        systemInstruction: systemPrompt,
      });
    
      // Append instruction to keep answer brief to the query
      const modifiedQuery = `${query} [RESPOND IN EXACTLY 1-2 LINES ONLY]`;
      
      // Get the response
      const result = await chat.sendMessage(modifiedQuery);
      const response = result.response.text();
      
      // Store conversation for future context
      this.conversations[threadId].push({
        role: "user", 
        parts: [{ text: query }] // Store original query without modification
      });
      this.conversations[threadId].push({
        role: "model", 
        parts: [{ text: response }]
      });
      
      // Limit conversation history to last 10 exchanges to prevent context overflow
      if (this.conversations[threadId].length > 20) {
        this.conversations[threadId] = this.conversations[threadId].slice(-20);
      }
      
      console.log(`Generated response with ${this.modelName} for query: "${query}"`);
      return response;
    } catch (error) {
      logger.error("Error in Google Gemini API call", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
  
  /**
   * Clears the conversation history for a specific thread
   * @param {string} threadId - The thread ID to clear
   */
  clearConversation(threadId) {
    if (this.conversations[threadId]) {
      this.conversations[threadId] = [];
      console.log(`Cleared conversation history for thread ${threadId}`);
    }
  }
}

// Create and export a singleton instance
const geminiService = new GeminiService();
export default geminiService; 