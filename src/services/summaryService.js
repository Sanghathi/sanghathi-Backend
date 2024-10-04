import { OpenAI } from "@langchain/openai";
import dotenv from 'dotenv';
dotenv.config();

// Initialize the OpenAI model with the specified parameters
const model = new OpenAI({
  model: "gpt-3.5-turbo-instruct",
  temperature: 0.9,
  openAIApiKey: process.env.OPEN_API_KEY,
});

// Function to create a prompt for generating a summary of a conversation
const conversationSummaryPrompt = (thread) => {
  // Check if there are enough messages in the thread
  if (thread.messages.length < 3) {
    return "Not enough messages to generate a summary.";
  }

  // Create a prompt for the OpenAI model based on the conversation thread
  const prompt = `You are tasked with generating a summary of a conversation and evaluating the mentor's performance in providing counseling to a student. Your evaluation will be used to provide feedback to higher-level management on the mentor's counseling performance. 

  In your summary, please include a brief overview of the student's problem, the mentor's approach to counseling, the effectiveness of the mentor's counseling, and whether or not the student's problem was resolved. Your summary should be clear and concise, with a maximum word count of 100. Use specific examples and details from the conversation to support your evaluation of the mentor's performance. 

  Here is a conversation thread object: 
  Topic: ${thread.topic} 
  Participants: ${thread.participants.map((p) => `${p.name} (Role: ${p.roleName})`).join(", ")} 
  Title: ${thread.title} 
  ${thread.messages.map((msg) => {
    const sender = thread.participants.find(p => p._id === msg.senderId);
    return `${sender.name}: ${msg.body}`;
  }).join("\n")}
  
  Evaluate the mentor's performance in providing counseling to the student based on the above conversation. Be sure to provide specific examples and details to support your conclusions.`;

  return prompt;
};

// Export the generateSummary function to be used in other modules
export async function generateSummary(thread) {
  // Generate the prompt based on the conversation thread
  const prompt = conversationSummaryPrompt(thread);
  
  // Return early if there are not enough messages to summarize
  if (prompt === "Not enough messages to generate a summary.") {
    return prompt;
  }

  // Call the OpenAI model with the generated prompt
  const response = await model.call(prompt);

  return response;
}
