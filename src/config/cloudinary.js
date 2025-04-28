import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// For development and debugging
console.log('Cloudinary configuration:');
console.log('CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API_KEY exists:', !!process.env.CLOUDINARY_API_KEY);
console.log('API_SECRET exists:', !!process.env.CLOUDINARY_API_SECRET);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? process.env.CLOUDINARY_CLOUD_NAME.trim() : 'dc5xtrpnm',
  api_key: process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY.trim() : '194861312943854',
  api_secret: process.env.CLOUDINARY_API_SECRET ? process.env.CLOUDINARY_API_SECRET.trim() : 'EZVYR4ciowGj6MXD8WVRW9f8SOE',
});

export default cloudinary; 