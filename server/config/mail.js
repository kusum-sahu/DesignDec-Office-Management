// import "dotenv/config";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true only for port 465
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify SMTP Connection
(async () => {
  try {
    await transporter.verify();
    console.log("✅ Email Server Connected Successfully");
  } catch (error) {
    console.error("❌ Email Server Error:");
    console.error(error);
  }
})();

export default transporter;