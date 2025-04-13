/* eslint-disable node/file-extension-in-import */
import logger from "../utils/logger.js";
import geminiService from "./geminiApi.js";

class CampusBuddy {
  constructor() {
    // Define basic greetings and their responses
    this.greetings = {
      hi: "A: How can I help you today?",
      hello: "A: What can I do for you?",
      hey: "A: How can I assist you?",
      "good morning": "A: Good morning! How can I help?",
      "good afternoon": "A: Good afternoon! How can I assist?",
      "good evening": "A: Good evening! What do you need?",
    };

    // Set up CMRIT information for the AI assistant
    this.initializeCMRITInfo();
    
    // Store the conversations
    this.conversations = {};
  }

  initializeCMRITInfo() {
    // CMRIT College Information
    this.cmritInfo = {
      establishment:
        "CMRIT was established in 2000 and is affiliated with VTU, Approved by AICTE, and accredited by NAAC with 'A+' grade",
      location: "Bangalore, Karnataka, India",
      courses: [
        "Computer Science",
        "Information Science",
        "AIML",
        "AI and DS",
        "CSE(AIML)",
        "CS(DS)",
        "MBA",
        "MCA",
      ],
      accreditation: [
        "Accredited by NAAC with A+ Grade",
        "NBA Accredited for eligible programs",
        "Ranked among top engineering colleges in Karnataka",
      ],
      vision:
        "To be a premier educational institution that nurtures individuals to be competent professionals with integrity and social commitment.",
      mission: [
        "Impart quality technical education with state-of-the-art infrastructure",
        "Provide vibrant environment for learning with qualified and committed faculty",
        "Promote research, innovation and entrepreneurship",
        "Foster industry-academia collaboration for knowledge and skill enhancement",
        "Inculcate ethical values and leadership qualities among students",
      ],
    };

    // E-Mithru Platform Information
    this.emithruInfo = {
      description:
        "E-Mithru is a digital mentoring platform at CMRIT designed to bridge the gap between students and mentors.",
      features: [
        "Personalized mentor assignment system",
        "Track student's academic and overall progress",
        "Seamless communication between mentors and mentees",
        "Career guidance and counseling tools",
        "Regular performance tracking and feedback system",
      ],
      purpose:
        "To provide comprehensive guidance and support for students' overall development through effective mentoring.",
    };
  }

  // Check if the query is a simple greeting
  isGreeting(query) {
    const normalizedQuery = query.toLowerCase().trim();
    return this.greetings[normalizedQuery] || null;
  }

  // Add conversation to history
  addToConversation(threadId, query, response) {
    if (!this.conversations[threadId]) {
      this.conversations[threadId] = [];
    }

    this.conversations[threadId].push({
      query,
      response,
      timestamp: new Date().toISOString(),
    });

    // Limit conversation history to last 10 exchanges
    if (this.conversations[threadId].length > 10) {
      this.conversations[threadId].shift();
    }
  }

  // Get conversation history
  getConversation(threadId) {
    return this.conversations[threadId] || [];
  }

  // Clear conversation history
  clearConversation(threadId) {
    this.conversations[threadId] = [];
    // Also clear conversation history in Gemini service
    geminiService.clearConversation(threadId);
    return { message: "Conversation history cleared" };
  }

  async generateResponse(query, threadId) {
    try {
      // Check if it's a greeting
      const greetingResponse = this.isGreeting(query);
      if (greetingResponse) {
        this.addToConversation(threadId, query, greetingResponse);
        return greetingResponse;
      }

      console.log("Making request to Google Gemini API...");
      
      // Use the Gemini service to generate a response
      const aiResponse = await geminiService.generateResponse(query, threadId);

      // Add to conversation history
      this.addToConversation(threadId, query, aiResponse);

      return aiResponse;
    } catch (error) {
      logger.error("Error in Google Gemini API call", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async generateThreadSummary(threadId) {
    try {
      const conversation = this.conversations[threadId];
      if (!conversation || conversation.length === 0) {
        return "No conversation history found.";
      }

      console.log(
        "Generating summary for conversation:",
        JSON.stringify(conversation, null, 2)
      );

      const conversationText = conversation
        .map((msg) => `User: ${msg.query}\nAssistant: ${msg.response}`)
        .join("\n\n");

      console.log("Conversation text:", conversationText);

      const summaryPrompt = `You are a conversation summarizer. Your task is to create a detailed summary of the following conversation between a user and the CMRIT Campus Buddy assistant. The summary must be between 40-80 words and must include:

1. The main topics discussed
2. Key information shared
3. Whether the user's queries were resolved
4. Any important details or outcomes

Conversation:
${conversationText}

IMPORTANT: Your response must be in this exact format:
Summary: [Your detailed summary here]
Problem resolved: [Yes/No]

Requirements:
- Summary must be between 40-80 words
- Include specific details about what was discussed
- Mention if any information was requested but not provided
- Must end with the problem resolution status
- Do not add any other text or formatting`;

      console.log("Sending summary prompt to API:", summaryPrompt);

      const response = await geminiService.generateResponse(summaryPrompt, threadId);

      if (!response) {
        throw new Error("Failed to generate summary from Gemini service");
      }

      let summary = response.trim();
      console.log("Initial summary:", summary);

      // Ensure the summary starts with "Summary: " and ends with problem resolution status
      if (!summary.startsWith("Summary: ")) {
        summary = "Summary: " + summary;
      }

      // Clean up any extra newlines and spaces
      summary = summary.replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n");

      // Ensure proper problem resolution status
      if (!summary.includes("Problem resolved:")) {
        summary += "\nProblem resolved: No";
      } else {
        // Clean up any text after "Problem resolved:"
        summary =
          summary.split("Problem resolved:")[0].trim() +
          "\nProblem resolved: " +
          (summary.includes("Problem resolved: Yes") ? "Yes" : "No");
      }

      // Ensure minimum length for summary
      if (summary.length < 100) {
        summary =
          "Summary: The conversation was brief and did not provide sufficient information to assess the mentor's performance or the student's needs.\nProblem resolved: No";
      }

      console.log("Final summary:", summary);
      return summary;
    } catch (error) {
      logger.error("Error generating thread summary", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  closeThread(threadId) {
    if (this.conversations[threadId]) {
      this.conversations[threadId] = [];
    }
  }

  handleError(error) {
    logger.error(`ERROR 💥 ${error}`);
    throw error;
  }
}

export default new CampusBuddy();