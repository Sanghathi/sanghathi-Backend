import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
try {
  dotenv.config();
  console.log('Environment variables loaded.');
} catch (error) {
  console.error('Error loading environment variables:', error);
}

// Print environment variables for debugging
console.log('Environment variables:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY exists:', !!process.env.CLOUDINARY_API_KEY);
console.log('CLOUDINARY_API_SECRET exists:', !!process.env.CLOUDINARY_API_SECRET);

// Get the current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dc5xtrpnm',
    api_key: process.env.CLOUDINARY_API_KEY || '194861312943854',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'EZVYR4ciowGj6MXD8WVRW9f8SOE',
  });
  console.log('Cloudinary configured.');
} catch (error) {
  console.error('Error configuring Cloudinary:', error);
}

// Function to create a test image
const createTestImage = () => {
  try {
    const imagePath = path.join(__dirname, 'test-image.png');
    
    // Create a small 1x1 transparent PNG
    const buffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    fs.writeFileSync(imagePath, buffer);
    console.log(`Created test image at ${imagePath}`);
    
    return imagePath;
  } catch (error) {
    console.error('Error creating test image:', error);
    return null;
  }
};

// Test Cloudinary configuration
const testCloudinaryConfig = () => {
  try {
    const config = cloudinary.config();
    console.log('Cloudinary Configuration:');
    console.log('- Cloud Name:', config.cloud_name);
    console.log('- API Key exists:', !!config.api_key);
    console.log('- API Secret exists:', !!config.api_secret);
    return true;
  } catch (error) {
    console.error('Error checking Cloudinary configuration:', error);
    return false;
  }
};

// Upload test image to Cloudinary
const uploadTestImage = async () => {
  try {
    const imagePath = createTestImage();
    if (!imagePath) {
      throw new Error('Failed to create test image');
    }
    
    console.log('Uploading test image to Cloudinary...');
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: 'mentor-connect/test',
      public_id: `test-${Date.now()}`,
      overwrite: true,
      resource_type: 'image'
    });
    
    console.log('Upload successful!');
    console.log('- Image URL:', result.secure_url);
    console.log('- Public ID:', result.public_id);
    
    // Clean up test image
    fs.unlinkSync(imagePath);
    console.log('Test image deleted');
    
    return result;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    return null;
  }
};

// Run tests
(async () => {
  try {
    console.log('=== Testing Cloudinary Integration ===');
    
    // Test 1: Configuration
    console.log('\n[Test 1] Checking Cloudinary configuration');
    const configValid = testCloudinaryConfig();
    
    if (!configValid) {
      console.error('Cloudinary configuration test failed. Please check your environment variables.');
      process.exit(1);
    }
    
    // Test 2: Upload
    console.log('\n[Test 2] Testing image upload');
    const uploadResult = await uploadTestImage();
    
    if (!uploadResult) {
      console.error('Cloudinary upload test failed.');
      process.exit(1);
    }
    
    console.log('\n=== All tests passed! ===');
    console.log('Cloudinary integration is working correctly.');
  } catch (error) {
    console.error('Uncaught error during testing:', error);
    process.exit(1);
  }
})(); 