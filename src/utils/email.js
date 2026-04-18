// utils/email.js
import { Resend } from "resend";

import logger from "./logger.js";

const DEFAULT_DEV_FROM_EMAIL = "Sanghathi <onboarding@resend.dev>";

const resolveFromEmail = () => {
  if (process.env.RESEND_FROM_EMAIL) {
    return process.env.RESEND_FROM_EMAIL;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "RESEND_FROM_EMAIL is required in production for password reset emails."
    );
  }

  return DEFAULT_DEV_FROM_EMAIL;
};

const sendEmail = async (options) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY for password reset emails.");
  }

  const resend = new Resend(apiKey);
  const recipients = Array.isArray(options.email)
    ? options.email
    : [options.email];

  logger.info("📧 Sending password reset email via Resend", {
    to: recipients,
    subject: options.subject,
    from: resolveFromEmail(),
    hasHtml: !!options.html,
    hasText: !!options.message,
  });

  const { data, error } = await resend.emails.send({
    from: resolveFromEmail(),
    to: recipients,
    subject: options.subject,
    text: options.message,
    html: options.html,
  });

  if (error) {
    logger.error("❌ Resend email sending failed", {
      name: error.name,
      message: error.message,
    });
    throw new Error(error.message || "Failed to send email with Resend.");
  }

  logger.info("✅ Resend email sent successfully", {
    emailId: data?.id,
  });

  return data;
};

export default sendEmail;