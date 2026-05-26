// utils/email.js
import { Resend } from "resend";

import logger from "./logger.js";

const DEFAULT_DEV_FROM_EMAIL = "Sanghathi <onboarding@resend.dev>";

const extractEmailAddress = (value = "") => {
  const trimmedValue = value.trim();
  const match = trimmedValue.match(/<([^>]+)>/);
  return (match ? match[1] : trimmedValue).trim();
};

const isValidEmailAddress = (value = "") => {
  const email = String(value || "").trim();
  if (!email) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const normalizeRecipientEmail = (value = "") => {
  const email = extractEmailAddress(String(value || ""));
  return isValidEmailAddress(email) ? email : null;
};

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

const resolveReplyTo = () => {
  if (process.env.RESEND_REPLY_TO) {
    return process.env.RESEND_REPLY_TO;
  }

  if (process.env.RESEND_FROM_EMAIL) {
    return extractEmailAddress(process.env.RESEND_FROM_EMAIL);
  }

  return extractEmailAddress(DEFAULT_DEV_FROM_EMAIL);
};

const sendEmail = async (options) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY for email delivery.");
  }

  const resend = new Resend(apiKey);
  const recipients = (Array.isArray(options.email) ? options.email : [options.email])
    .map((email) => normalizeRecipientEmail(email))
    .filter(Boolean);

  if (!recipients.length) {
    throw new Error("No recipient email provided for sending email.");
  }

  const discardedRecipients = (Array.isArray(options.email) ? options.email : [options.email])
    .map((email) => String(email || "").trim())
    .filter(Boolean)
    .filter((email) => !normalizeRecipientEmail(email));

  if (discardedRecipients.length) {
    logger.warn("Skipping invalid recipient email entries", {
      discardedRecipients,
      subject: options.subject,
    });
  }

  const from = resolveFromEmail();
  const replyTo = options.replyTo || resolveReplyTo();

  logger.info("📧 Sending email via Resend", {
    to: recipients,
    subject: options.subject,
    from,
    replyTo,
    hasHtml: !!options.html,
    hasText: !!options.message,
    deliveryMode: recipients.length > 1 ? "individual" : "single",
  });

  const results = [];

  for (const recipient of recipients) {
    const payload = {
      from,
      to: [recipient],
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    if (replyTo) {
      payload.replyTo = replyTo;
    }

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      logger.error("❌ Resend email sending failed", {
        recipient,
        name: error.name,
        message: error.message,
      });
      throw new Error(error.message || "Failed to send email with Resend.");
    }

    results.push(data);
  }

  logger.info("✅ Resend email sent successfully", {
    recipientCount: results.length,
    emailIds: results.map((item) => item?.id).filter(Boolean),
  });

  return results.length === 1 ? results[0] : results;
};

export default sendEmail;