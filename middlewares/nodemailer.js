const nodemailer = require("nodemailer");

const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_SECURE,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
} = process.env;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.error(
    "Missing EMAIL_USER or EMAIL_PASS environment variables for nodemailer. Email sending will fail."
  );
}

// Build transporter config with fallbacks (Gmail SMTP defaults)
const host = EMAIL_HOST || "smtp.gmail.com";
const port = EMAIL_PORT ? parseInt(EMAIL_PORT, 10) : 465;
const secure =
  typeof EMAIL_SECURE !== "undefined" ? EMAIL_SECURE === "true" : port === 465;

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: EMAIL_USER && EMAIL_PASS ? { user: EMAIL_USER, pass: EMAIL_PASS } : undefined,
  // optional: you can uncomment the tls option if you face TLS negotiation issues in some environments
  // tls: { rejectUnauthorized: false },
  // logger: true, // enable for verbose logs from nodemailer
});

// verify transporter at startup so misconfigurations are visible early
transporter
  .verify()
  .then(() => {
    console.log(`Nodemailer transporter ready. Host=${host} port=${port} secure=${secure}`);
  })
  .catch((err) => {
    console.error("Nodemailer verification failed. Emails will not be sent. Error:", err);
  });

const sendEmail = async ({ to, subject, html, text }) => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    const err = new Error("Email credentials not configured on server (EMAIL_USER/EMAIL_PASS)");
    console.error(err);
    throw err;
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM || `"Blogify" <${EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || undefined,
    });
    console.log(`Email sent to ${to}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = { sendEmail, transporter };
