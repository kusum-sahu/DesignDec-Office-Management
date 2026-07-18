import transporter from "../config/mail.js";

const sendOTPEmail = async ({ to, employeeName, otp }) => {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to,
    subject: "DesignDec - Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif; padding:20px;">
        <h2 style="color:#6C63FF;">DesignDec Office Management</h2>

        <p>Hello <b>${employeeName}</b>,</p>

        <p>You requested to reset your password.</p>

        <h1 style="letter-spacing:8px;color:#333;">
          ${otp}
        </h1>

        <p>This OTP will expire in <b>10 minutes</b>.</p>

        <p>If you didn't request this, please ignore this email.</p>

        <br>

        <small>
        DesignDec Office Management
        </small>

      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export default sendOTPEmail;