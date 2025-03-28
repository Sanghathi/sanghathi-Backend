import axios from 'axios';

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';

export const generateText = async (prompt, apiKey) => {
  try {
    const response = await axios.post(
      HUGGINGFACE_API_URL,
      { 
        inputs: prompt,
        parameters: {
          max_new_tokens: 512,
          temperature: 0.7,
          top_p: 0.95,
          do_sample: true,
          return_full_text: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data[0] && response.data[0].generated_text) {
      return response.data[0].generated_text;
    }

    throw new Error('No response generated from the model');
  } catch (error) {
    console.error('Error generating text:', error.message);
    throw error;
  }
};

export const validateApiKey = async (apiKey) => {
  try {
    const response = await axios.get(
      'https://api-inference.huggingface.co/status',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );
    return response.status === 200;
  } catch (error) {
    console.error('Error validating API key:', error.message);
    return false;
  }
}; 