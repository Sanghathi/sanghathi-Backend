// utils/email.js
import { createTransport } from "nodemailer";

const sendEmail = async (options) => {
  console.log("📧 Starting email send process...");
  console.log("Email options:", {
    to: options.email,
    subject: options.subject,
    hasHtml: !!options.html,
    hasText: !!options.message
  });

  // Log environment variables (without exposing sensitive data)
  console.log("Email configuration:", {
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
    console.log("🔍 Verifying transporter configuration...");
    await transporter.verify();
    console.log("✅ Transporter verified successfully");

    // 2) Define the email options
    const mailOptions = {
      from: "Sanghathi <emithru@gmail.com>",
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    // 3) Actually send the email
    console.log("📤 Sending email...");
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    console.log("Preview URL:", info.getTestMessageUrl?.() || 'N/A');
    
    return info;
  } catch (error) {
    console.error("❌ Email sending failed:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error response:", error.response);
    console.error("Full error:", error);
    throw error;
  }
};

export default sendEmail;