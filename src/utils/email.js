import { createTransport } from "nodemailer";

const sendEmail = async (options) => {
  // 1) Create a transporter

  const transporter = createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  // 2) Define the email options

  const mailOptions = {
    from: "Sachin Kumar <immortalosborn@gmail.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
    //html:
  };
  // 3) Actually send the email

  await transporter.sendMail(mailOptions);
};

export default sendEmail;
