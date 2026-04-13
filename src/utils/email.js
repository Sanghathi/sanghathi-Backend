// utils/email.js
import { createTransport } from "nodemailer";

import logger from "./logger.js";
const sendEmail = async (options) => {
  logger.info("📧 Starting email send process...");
  logger.info("Email options:", {
    to: options.email,
    subject: options.subject,
    hasHtml: !!options.html,
    hasText: !!options.message
  });

  // Log environment variables (without exposing sensitive data)
  logger.info("Email configuration:", {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    userExists: !!process.env.EMAIL_USER,
    passExists: !!process.env.EMAIL_PASS,
    user: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 3)}***` : 'NOT SET'
  });

  try {
    // 1) Create a transporter
    const transporter = createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Add these for better debugging
      logger: true,
      debug: true,
    });

    // Verify transporter configuration
    logger.info("🔍 Verifying transporter configuration...");
    await transporter.verify();
    logger.info("✅ Transporter verified successfully");

    // 2) Define the email options
    const mailOptions = {
      from: "Sanghathi <emithru@gmail.com>",
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    // 3) Actually send the email
    logger.info("📤 Sending email...");
    const info = await transporter.sendMail(mailOptions);
    logger.info("✅ Email sent successfully:", info.messageId);
    logger.info("Preview URL:", info.getTestMessageUrl?.() || 'N/A');
    
    return info;
  } catch (error) {
    logger.error("❌ Email sending failed:");
    logger.error("Error name:", error.name);
    logger.error("Error message:", error.message);
    logger.error("Error code:", error.code);
    logger.error("Error response:", error.response);
    logger.error("Full error:", error);
    throw error;
  }
};

export default sendEmail;