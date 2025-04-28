/**
 * Deployment script for Cloudinary integration
 * 
 * This script checks if the necessary Cloudinary routes are already registered in the app
 * and adds them if they are missing.
 * 
 * To use:
 * 1. Copy this file to your production server
 * 2. Make sure src/config/cloudinary.js and src/utils/cloudinaryUpload.js are present
 * 3. Run: node deploy-cloudinary.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Update these paths if your project structure is different
const INDEX_PATH = path.join(__dirname, 'src', 'index.js');
const UPLOAD_ROUTES_PATH = path.join(__dirname, 'src', 'routes', 'uploadRoutes.js');
const TEST_ROUTES_PATH = path.join(__dirname, 'src', 'routes', 'testUploadRoute.js');
const CLOUDINARY_CONFIG_PATH = path.join(__dirname, 'src', 'config', 'cloudinary.js');
const CLOUDINARY_UPLOAD_PATH = path.join(__dirname, 'src', 'utils', 'cloudinaryUpload.js');

// Check if files exist
console.log('Checking if necessary files exist...');

const missingFiles = [];

if (!fs.existsSync(CLOUDINARY_CONFIG_PATH)) {
  missingFiles.push('src/config/cloudinary.js');
}

if (!fs.existsSync(CLOUDINARY_UPLOAD_PATH)) {
  missingFiles.push('src/utils/cloudinaryUpload.js');
}

if (missingFiles.length > 0) {
  console.error('Error: The following files are missing:');
  missingFiles.forEach(file => console.error(`- ${file}`));
  console.error('Please create these files first before running this deployment script.');
  process.exit(1);
}

// Create uploadRoutes.js if it doesn't exist
if (!fs.existsSync(UPLOAD_ROUTES_PATH)) {
  console.log('Creating uploadRoutes.js...');
  const uploadRoutesContent = `import { Router } from 'express';
import multer from 'multer';
import { uploadToCloudinary } from '../utils/cloudinaryUpload.js';

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB limit
});

// Route for handling image uploads
router.post('/', upload.single('image'), async (req, res) => {
  // Check if we have file uploaded through multer
  if (req.file) {
    try {
      // Convert the file buffer to base64
      const base64Image = \`data:\${req.file.mimetype};base64,\${req.file.buffer.toString('base64')}\`;
      
      // Upload to Cloudinary
      const imageUrl = await uploadToCloudinary(base64Image, 'mentor-connect/uploads');
      
      return res.status(200).json({
        success: true,
        imageUrl
      });
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image',
        error: error.message
      });
    }
  } 
  // Check if we have a base64 image in the request body
  else if (req.body.image) {
    try {
      const imageUrl = await uploadToCloudinary(req.body.image, 'mentor-connect/uploads');
      
      return res.status(200).json({
        success: true,
        imageUrl
      });
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image',
        error: error.message
      });
    }
  } else {
    return res.status(400).json({
      success: false,
      message: 'No image found in request'
    });
  }
});

export default router;`;

  fs.writeFileSync(UPLOAD_ROUTES_PATH, uploadRoutesContent);
  console.log('uploadRoutes.js created successfully.');
}

// Create testUploadRoute.js if it doesn't exist
if (!fs.existsSync(TEST_ROUTES_PATH)) {
  console.log('Creating testUploadRoute.js...');
  const testRoutesContent = `import { Router } from 'express';
import multer from 'multer';
import { uploadToCloudinary } from '../utils/cloudinaryUpload.js';
import cloudinary from '../config/cloudinary.js';

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB limit
});

// Simple test route to check Cloudinary configuration
router.get('/cloudinary-status', (req, res) => {
  try {
    // Return Cloudinary configuration status
    const config = cloudinary.config();
    return res.status(200).json({
      success: true,
      message: 'Cloudinary configuration is valid',
      cloud_name: config.cloud_name,
      api_key_exists: !!config.api_key,
      api_secret_exists: !!config.api_secret
    });
  } catch (error) {
    console.error('Error checking Cloudinary status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check Cloudinary configuration',
      error: error.message
    });
  }
});

// Test route for Cloudinary upload
router.post('/test-upload', upload.single('image'), async (req, res) => {
  try {
    // Check if we have a file or base64 data
    let imageData;
    let uploadResult;
    
    if (req.file) {
      console.log('Processing uploaded file:', req.file.originalname);
      // Convert file buffer to base64
      imageData = \`data:\${req.file.mimetype};base64,\${req.file.buffer.toString('base64')}\`;
    } else if (req.body.image) {
      console.log('Processing base64 image');
      imageData = req.body.image;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No image found in request'
      });
    }
    
    // Upload to Cloudinary
    console.log('Uploading to Cloudinary...');
    uploadResult = await uploadToCloudinary(imageData, 'mentor-connect/test');
    console.log('Upload successful, image URL:', uploadResult);
    
    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: uploadResult
    });
  } catch (error) {
    console.error('Error in test upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
});

export default router;`;

  fs.writeFileSync(TEST_ROUTES_PATH, testRoutesContent);
  console.log('testUploadRoute.js created successfully.');
}

// Update index.js to register the routes
console.log('Checking and updating index.js...');

let indexContent = fs.readFileSync(INDEX_PATH, 'utf8');

// Check if the import statements are already there
const hasUploadImport = indexContent.includes('import uploadRouter from');
const hasTestImport = indexContent.includes('import testUploadRouter from');

// Add the missing import statements
let updatedContent = indexContent;

if (!hasUploadImport) {
  const lastImportIndex = indexContent.lastIndexOf('import');
  const lastImportLineEnd = indexContent.indexOf(';', lastImportIndex) + 1;
  
  updatedContent = updatedContent.slice(0, lastImportLineEnd) + 
    '\nimport uploadRouter from "./routes/uploadRoutes.js";' + 
    updatedContent.slice(lastImportLineEnd);
}

if (!hasTestImport) {
  const lastImportIndex = updatedContent.lastIndexOf('import');
  const lastImportLineEnd = updatedContent.indexOf(';', lastImportIndex) + 1;
  
  updatedContent = updatedContent.slice(0, lastImportLineEnd) + 
    '\nimport testUploadRouter from "./routes/testUploadRoute.js";' + 
    updatedContent.slice(lastImportLineEnd);
}

// Check if the routes are registered
const hasUploadRoute = indexContent.includes('app.use("/api/v1/upload"');
const hasTestRoute = indexContent.includes('app.use("/api/test"');

// Add the missing route registrations
if (!hasUploadRoute || !hasTestRoute) {
  // Find a good place to insert the routes - after all the other route registrations
  const routeRegistrationPattern = /app\.use\(\s*["']\/api/g;
  let lastMatch;
  let match;
  
  while ((match = routeRegistrationPattern.exec(updatedContent)) !== null) {
    lastMatch = match;
  }
  
  const insertPosition = lastMatch ? 
    updatedContent.indexOf(';', lastMatch.index) + 1 : 
    updatedContent.indexOf('app.use');
  
  let routesToAdd = '';
  
  if (!hasUploadRoute) {
    routesToAdd += '\n\n// Register Cloudinary upload route\napp.use("/api/v1/upload", uploadRouter);';
  }
  
  if (!hasTestRoute) {
    routesToAdd += '\n// Register Cloudinary test route\napp.use("/api/test", testUploadRouter);';
  }
  
  updatedContent = updatedContent.slice(0, insertPosition) + 
    routesToAdd + 
    updatedContent.slice(insertPosition);
}

// Only write to file if changes were made
if (updatedContent !== indexContent) {
  fs.writeFileSync(INDEX_PATH, updatedContent);
  console.log('Updated index.js with Cloudinary routes.');
} else {
  console.log('index.js already has the necessary Cloudinary routes.');
}

console.log('Deployment script completed successfully!');
console.log('');
console.log('To test if Cloudinary is working:');
console.log('1. Start your server');
console.log('2. Visit: https://your-server-url/api/test/cloudinary-status');
console.log('3. Try uploading an image to: https://your-server-url/api/test/test-upload');
console.log('');
console.log('If everything works, the Cloudinary integration is ready!'); 