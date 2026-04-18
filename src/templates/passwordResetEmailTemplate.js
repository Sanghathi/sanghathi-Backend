const DEFAULT_EXPIRY_MINUTES = 10;
const DEFAULT_SUPPORT_EMAIL = "support@sanghathi.com";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildPasswordResetEmailTemplate = ({
  userName,
  resetURL,
  appName = "Sanghathi",
  expiryMinutes = DEFAULT_EXPIRY_MINUTES,
  supportEmail = DEFAULT_SUPPORT_EMAIL,
}) => {
  const greetingName = userName?.trim() || "there";
  const safeAppName = escapeHtml(appName);
  const safeGreetingName = escapeHtml(greetingName);
  const safeResetURL = escapeHtml(resetURL);
  const safeSupportEmail = escapeHtml(supportEmail);
  const safeSupportHref = escapeHtml(`mailto:${supportEmail}`);

  const subject = `Reset your ${appName} password`;
  const message = `Hi ${greetingName},\n\nWe received a request to reset your ${appName} password.\n\nUse this secure link to continue:\n${resetURL}\n\nThis link expires in ${expiryMinutes} minutes.\n\nIf you did not request this, you can safely ignore this email.\n\nNeed help? Contact ${supportEmail}.`;

  const preheader = `Reset your ${appName} password. This secure link expires in ${expiryMinutes} minutes.`;

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #eef2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
        <span style="display: none; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; overflow: hidden; mso-hide: all;">
          ${escapeHtml(preheader)}
        </span>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #eef2f7; padding: 24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden;">
                <tr>
                  <td style="padding: 28px 32px; background: linear-gradient(140deg, #0f172a 0%, #1d4ed8 100%); color: #ffffff;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.9;">${safeAppName}</p>
                    <h1 style="margin: 0; font-size: 24px; line-height: 1.3; font-weight: 700; color: #ffffff;">Password reset request</h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 28px 32px 18px 32px; font-size: 15px; line-height: 1.7; color: #1f2937;">
                    <p style="margin: 0 0 12px 0;">Hi ${safeGreetingName},</p>
                    <p style="margin: 0 0 18px 0;">We received a request to reset your password for your ${safeAppName} account. Use the button below to continue securely.</p>

                    <p style="margin: 0 0 22px 0;">
                      <a href="${safeResetURL}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 10px; font-size: 15px; font-weight: 600;">Reset Password</a>
                    </p>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 18px 0; background: #f8fafc; border: 1px solid #dbeafe; border-radius: 12px;">
                      <tr>
                        <td style="padding: 14px 16px; font-size: 14px; color: #334155;">
                          This secure link expires in <strong>${expiryMinutes} minutes</strong>.
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 8px 0; color: #4b5563;">If the button does not open, copy and paste this URL into your browser:</p>
                    <p style="margin: 0 0 20px 0; word-break: break-all; font-size: 13px; line-height: 1.6; color: #1d4ed8;">
                      <a href="${safeResetURL}" style="color: #1d4ed8; text-decoration: underline;">${safeResetURL}</a>
                    </p>

                    <p style="margin: 0 0 18px 0; color: #4b5563;">If you did not request this change, you can safely ignore this email. Your current password will remain unchanged.</p>
                    <p style="margin: 0; color: #4b5563;">Need help? Reach us at <a href="${safeSupportHref}" style="color: #1d4ed8;">${safeSupportEmail}</a>.</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 18px 32px 26px 32px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #64748b;">
                    <p style="margin: 0;">Sent by ${safeAppName} Security. Please do not share this link with anyone.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return {
    subject,
    message,
    html,
  };
};
