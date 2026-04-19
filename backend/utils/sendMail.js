const nodemailer = require("nodemailer");

const sendMail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE || "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  return transporter.sendMail({
    from: `"Aegix AI" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendMail;