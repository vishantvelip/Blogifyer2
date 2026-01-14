const nodemailer = require("nodemailer");

/**
 * Nodemailer configuration that:
 * - Prefer SendGrid (if SENDGRID_API_KEY is provided) via SMTP auth "apikey"
 * - Otherwise uses EMAIL_HOST/EMAIL_PORT/EMAIL_SECURE with EMAIL_USER/EMAIL_PASS
 * - Falls back to Gmail service only if explicit (not recommended for production)
 *
 * Required env (recommended):
 * - SENDGRID_API_KEY OR (EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS)
 *
 * Optional:
 * - EMAIL_FROM (defaults to `"Blogify" <${EMAIL_USER}>`)
 */

const {
  SENDGRID_API_KEY,
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_SECURE,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
} = process.env;

let transporter;
let transporterInfo = { provider: "none" };

if (SENDGRID_API_KEY) {
  // Use SendGrid via SMTP (recommended quick migration from Gmail)
  transporter = nodemailer.createTransport({
    host: "smtp.sendgrid.net",
    port: 587,
    secure: false,
    auth: {
      user: "apikey", // SendGrid requires literal 'apikey' as username
      pass: SENDGRID_API_KEY,
    },
  });
  transporterInfo.provider = "sendgrid-smtp";
} else if (EMAIL_HOST && EMAIL_USER && EMAIL_PASS) {
  const port = EMAIL_PORT ? parseInt(EMAIL_PORT, 10) : 465;
  const secure =
    typeof EMAIL_SECURE !== "undefined" ? EMAIL_SECURE === "true" : port === 465;

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port,
    secure,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
  transporterInfo.provider = `${EMAIL_HOST}:${port}`;
} else if (EMAIL_USER && EMAIL_PASS) {
  // Last resort: nodemailer "service" option (Gmail). Not recommended for production.
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
  transporterInfo.provider = "gmail-service";
} else {
  console.error(
    "No email provider configured. Set SENDGRID_API_KEY or EMAIL_HOST/EMAIL_USER/EMAIL_PASS."
  );
  transporter = null;
}

// Verify transporter where possible so startup logs show the status
if (transporter) {
  transporter
    .verify()
    .then(() => {
      console.log("Nodemailer transporter verified and ready to send emails.", transporterInfo);
    })
    .catch((err) => {
      console.error("Nodemailer transporter verification failed:", transporterInfo, err);
    });
}

/**
 * sendEmail - send an email using configured transporter
 * @param {Object} opts
 * @param {string} opts.to - recipient(s)
 * @param {string} opts.subject
 * @param {string} [opts.html]
 * @param {string} [opts.text]
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    const err = new Error(
      "Email transporter not configured. Please set SENDGRID_API_KEY or EMAIL_HOST/EMAIL_USER/EMAIL_PASS."
    );
    console.error(err);
    throw err;
  }

  if (!to || !subject || (!html && !text)) {
    const err = new Error("Invalid email options. 'to', 'subject' and 'html' or 'text' are required.");
    console.error(err);
    throw err;
  }

  const mailOptions = {
    from: EMAIL_FROM || (EMAIL_USER ? `"Blogify" <${EMAIL_USER}>` : '"Blogify" <no-reply@example.com>'),
    to,
    subject,
    html,
    text: text || undefined,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email queued/sent to ${to}. messageId=${info.messageId}`);
    return info;
  } catch (error) {
    // Log full SMTP response when available for easier debugging (quota errors, auth errors)
    console.error("Error sending email:", {
      to,
      subject,
      provider: transporterInfo,
      message: error && error.message,
      response: error && error.response,
    });
    throw error;
  }
};

module.exports = {
  sendEmail,
  transporter,
};
