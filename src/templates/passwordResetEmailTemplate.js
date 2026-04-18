const DEFAULT_EXPIRY_MINUTES = 10;

export const buildPasswordResetEmailTemplate = ({
  userName,
  resetURL,
  appName = "Sanghathi",
  expiryMinutes = DEFAULT_EXPIRY_MINUTES,
}) => {
  const greetingName = userName?.trim() || "there";

  const subject = `Reset your ${appName} password`;
  const message = `Forgot your password? Click the link below to reset it:\n\n${resetURL}\n\nThis link expires in ${expiryMinutes} minutes. If you didn't request this, please ignore this email.`;

  const html = `
    <h2>Password Reset Request</h2>
    <p>Hi ${greetingName},</p>
    <p>You requested a password reset for your ${appName} account.</p>
    <p>
      <a href="${resetURL}" style="display: inline-block; padding: 10px 20px; background-color: #0d6efd; color: #ffffff; text-decoration: none; border-radius: 5px;">
        Reset Password
      </a>
    </p>
    <p>Or copy and paste this link into your browser:</p>
    <p>${resetURL}</p>
    <p>This link expires in ${expiryMinutes} minutes.</p>
    <p>If you didn't request this, you can safely ignore this email.</p>
    <br>
    <p>Best regards,<br>${appName} Team</p>
  `;

  return {
    subject,
    message,
    html,
  };
};
