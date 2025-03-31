/* eslint-disable node/file-extension-in-import */
import logger from "../utils/logger.js";
import fetch from "node-fetch";

class CampusBuddy {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.baseURL =
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

    if (!this.apiKey) {
      throw new Error(
        "Hugging Face API key not found in environment variables"
      );
    }

    // Define basic greetings and their responses
    this.greetings = {
      hi: "Hi! How can I help you today?",
      hello: "Hello! What can I do for you?",
      hey: "Hey! How can I assist you?",
      "good morning": "Good morning! How can I help you today?",
      "good afternoon": "Good afternoon! What can I do for you?",
      "good evening": "Good evening! How can I assist you?",
    };

    // CMRIT Information
    this.cmritInfo = {
      establishment: "Established in 2000",
      location: "Whitefield, Bangalore (heart of South India's IT corridor)",
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
        "Affiliated to Visvesvaraya Technological University",
        "Approved by AICTE, New Delhi",
        "Recognised by Government of Karnataka",
        "Accredited by NBA (CSE, ECE, EEE, CV, ISE, ME)",
        "UGC Recognition under 2(f) & 12(B)",
        "Accredited by NAAC with A++",
      ],
      vision:
        "To be a nationally acclaimed and globally recognised institute of engineering, technology and management, producing competent professionals with appropriate attributes to serve the cause of the nation and of society at large.",
      mission: [
        "Create necessary infrastructure for programs and activities",
        "Attract and retain well-qualified faculty and staff",
        "Create ambience for interdisciplinary engagement",
        "Develop industry partnerships",
        "Understand and provide solutions for societal needs",
      ],
    };

    // E-Mithru Information
    this.emithruInfo = {
      description:
        "E-Mithru is a mentor connecting platform designed to facilitate meaningful connections between students and mentors at CMRIT.",
      features: [
        "Connect with experienced mentors",
        "Get guidance on academic and career paths",
        "Share knowledge and experiences",
        "Build professional networks",
        "Access resources and learning materials",
      ],
      purpose:
        "To create a supportive learning environment where students can receive personalized guidance and mentorship from experienced professionals and faculty members.",
    };

    // Track active conversations
    this.activeConversations = new Map();
  }

  isGreeting(query) {
    const lowerQuery = query.toLowerCase().trim();
    return this.greetings[lowerQuery] || false;
  }

  async generateResponse(query, threadId) {
    try {
      // Check if it's a greeting
      const greetingResponse = this.isGreeting(query);
      if (greetingResponse) {
        this.addToConversation(threadId, query, greetingResponse);
        return greetingResponse;
      }

      console.log("Making request to Hugging Face API for Mistral...");

      const systemPrompt = `You are CMRIT Campus Buddy, an AI assistant for CMR Institute of Technology (CMRIT), Bangalore. Here's what you know about CMRIT and E-Mithru:

Background:
- ${this.cmritInfo.establishment}
- Located in ${this.cmritInfo.location}
- Provides quality education in engineering and management
- Features world-class infrastructure and experienced faculty
- Focuses on analytical abilities and creative thinking skills

Courses Offered:
${this.cmritInfo.courses.map((course) => `• ${course}`).join("\n")}

Accreditation:
${this.cmritInfo.accreditation.map((acc) => `- ${acc}`).join("\n")}

Vision:
${this.cmritInfo.vision}

Mission:
${this.cmritInfo.mission.map((m) => `- ${m}`).join("\n")}

E-Mithru Information:
${this.emithruInfo.description}
Features:
${this.emithruInfo.features.map((f) => `• ${f}`).join("\n")}
Purpose: ${this.emithruInfo.purpose}

CRITICAL RESPONSE RULES:
1. Keep responses extremely concise (max 2-3 lines)
2. Use bullet points for lists, with each item on a new line
3. No introductory phrases like "I am" or "This is"
4. No concluding phrases or suggestions
5. Use only the information provided above
6. For unknown information, simply say "Please contact CMRIT administration for this information."
7. No explanations or elaborations
8. No greetings or pleasantries in non-greeting responses
9. NEVER add extra information or explanations to course names
10. NEVER combine multiple questions in one response
11. NEVER add abbreviations or full forms unless explicitly in the provided information
12. Each response must start with "A: " followed by the content
13. Each list item must be on its own line
14. No trailing dots or extra characters
15. NEVER include "User:" in your responses
16. NEVER repeat the question in your answer
17. NEVER ask questions back to the user
18. NEVER include multiple answers in one response
19. DO NOT simulate conversations or include dialogue
20. ABSOLUTELY DO NOT output what a user might say or ask

INCORRECT FORMAT (DO NOT DO THIS):
A: I can provide information about CMRIT. User: What courses are offered?

CORRECT FORMAT (DO THIS):
A: I can provide information about CMRIT.

Example format:
Q: What courses are offered?
A: • Computer Science
• Information Science
• AIML
• AI and DS
• CSE(AIML)
• CS(DS)
• MBA
• MCA

Q: What is E-Mithru?
A: A mentor connecting platform at CMRIT that helps students connect with experienced mentors for academic and career guidance.`;

      const response = await fetch(this.baseURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          inputs: `<s>[INST] ${systemPrompt}\n\nUser: ${query} [/INST]</s>`,
          parameters: {
            max_new_tokens: 100,
            temperature: 0.05,
            top_p: 0.9,
            top_k: 20,
            repetition_penalty: 1.2,
            return_full_text: false,
          },
        }),
      });

      // Track API rate limits
      const rateLimitTotal = response.headers.get("x-ratelimit-limit");
      const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
      const rateLimitReset = response.headers.get("x-ratelimit-reset");

      if (rateLimitRemaining !== null) {
        console.log(
          `API Usage - Remaining: ${rateLimitRemaining}/${rateLimitTotal}, Reset: ${new Date(
            rateLimitReset * 1000
          ).toLocaleString()}`
        );

        // Alert if getting close to limit
        if (parseInt(rateLimitRemaining) < 50) {
          logger.warn(
            `HuggingFace API rate limit almost reached: ${rateLimitRemaining}/${rateLimitTotal} remaining`
          );
        }
      }

      if (!response.ok) {
        // Check specifically for rate limiting
        if (response.status === 429) {
          logger.error("API Rate limit exceeded for Hugging Face API");
          throw new Error("API rate limit exceeded. Please try again later.");
        }
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      let aiResponse = data[0].generated_text.trim();

      // Clean up any responses that incorrectly include "User:"
      if (aiResponse.includes("User:")) {
        // Split by "User:" and take only the first part
        aiResponse = aiResponse.split("User:")[0].trim();

        // If the response is now empty or just contains "A:", provide a fallback
        if (aiResponse.length < 5) {
          aiResponse =
            "A: Please contact CMRIT administration for this information.";
        }
      }

      // Add to conversation history
      this.addToConversation(threadId, query, aiResponse);

      return aiResponse;
    } catch (error) {
      logger.error("Error in Hugging Face API call", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  addToConversation(threadId, query, response) {
    if (!this.activeConversations.has(threadId)) {
      this.activeConversations.set(threadId, []);
    }
    this.activeConversations.get(threadId).push({
      query,
      response,
      timestamp: new Date().toISOString(),
    });
  }

  async generateThreadSummary(threadId) {
    try {
      const conversation = this.activeConversations.get(threadId);
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

      const response = await fetch(this.baseURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          inputs: `<s>[INST] ${summaryPrompt} [/INST]</s>`,
          parameters: {
            max_new_tokens: 1000,
            temperature: 0.1,
            top_p: 0.95,
            return_full_text: true,
            stop: ["Problem resolved:"],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Raw API response:", JSON.stringify(data, null, 2));

      let summary = data[0].generated_text.trim();
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
    if (this.activeConversations.has(threadId)) {
      this.activeConversations.delete(threadId);
    }
  }

  handleError(error) {
    logger.error(`ERROR 💥 ${error}`);
    throw error;
  }
}

export default new CampusBuddy();