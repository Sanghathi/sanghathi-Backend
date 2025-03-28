import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testHuggingFaceAccess() {
    console.log("Starting Hugging Face API test...");
    
    // Check if API key exists
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
        console.error("❌ HUGGINGFACE_API_KEY not found in .env file");
        return;
    }
    console.log("✅ HUGGINGFACE_API_KEY found in .env file");

    // Create HF client
    const hf = new HfInference(apiKey);
    
    try {
        // Test with Flan T5 model
        console.log("\nTesting with Flan T5 model...");
        const response = await hf.textGeneration({
            model: "google/flan-t5-large",
            inputs: "What can you help me with?",
            parameters: {
                max_new_tokens: 100,
                temperature: 0.7,
                top_p: 0.95,
                do_sample: true
            }
        });
        console.log("✅ Model access confirmed! Got response:", response.generated_text);

    } catch (error) {
        if (error.message.includes("Invalid username or password")) {
            console.error("❌ Invalid API key. Please check your HUGGINGFACE_API_KEY in .env file");
        } else {
            console.error("❌ Error:", error.message);
        }
    }
}

// Run the test
testHuggingFaceAccess(); 