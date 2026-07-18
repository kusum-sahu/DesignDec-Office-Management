import transporter from "../config/mail.js";

const sendEmail = async ({
  to,
  subject,
  employeeName,
  employeeId,
  temporaryPassword,
}) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to,
      subject,

      html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<style>

*{
margin:0;
padding:0;
box-sizing:border-box;
font-family:Arial,sans-serif;
}

body{
background:#f5f7fb;
padding:30px;
}

.container{
max-width:650px;
margin:auto;
background:#ffffff;
border-radius:12px;
overflow:hidden;
box-shadow:0 8px 30px rgba(0,0,0,.08);
}

.header{
background:linear-gradient(135deg,#6C3EF4,#8F5BFF);
padding:30px;
text-align:center;
color:#fff;
}

.header h1{
font-size:28px;
margin-bottom:8px;
}

.header p{
font-size:14px;
opacity:.9;
}

.content{
padding:35px;
color:#444;
line-height:1.7;
}

.card{
background:#F8F6FF;
border-left:5px solid #6C3EF4;
padding:20px;
border-radius:10px;
margin:25px 0;
}

.card p{
margin:10px 0;
font-size:15px;
}

.password{
display:inline-block;
background:#6C3EF4;
color:white;
padding:10px 18px;
border-radius:8px;
font-size:20px;
font-weight:bold;
letter-spacing:2px;
margin-top:8px;
}

.note{
margin-top:20px;
padding:15px;
background:#FFF7E6;
border-left:5px solid #FF9800;
border-radius:8px;
}

.note strong{
color:#D97706;
}

.footer{
background:#F5F5F5;
padding:20px;
text-align:center;
font-size:13px;
color:#666;
}

.footer a{
color:#6C3EF4;
text-decoration:none;
}

</style>

</head>

<body>

<div class="container">

<div class="header">

<h1>DesignDec</h1>

<p>Office Management System</p>

</div>

<div class="content">

<h2>Hello ${employeeName}, 👋</h2>

<p>

Welcome to <strong>DesignDec</strong>.

Your employee account has been created successfully.

</p>

<div class="card">

<p>

<strong>Employee ID</strong>

<br>

${employeeId}

</p>

<p>

<strong>Temporary Password</strong>

<br>

<span class="password">

${temporaryPassword}

</span>

</p>

</div>

<div class="note">

<strong>Security Notice</strong>

<p>

Please login using the above credentials and change your password immediately.

Never share your password with anyone.

</p>

</div>

<p>

If you have any issues accessing your account,

please contact your administrator.

</p>

<p>

Regards,

<br>

<strong>DesignDec Team</strong>

</p>

</div>

<div class="footer">

© ${new Date().getFullYear()} DesignDec Office Management System

<br><br>

<a href="https://designdec.in">

www.designdec.in

</a>

</div>

</div>

</body>

</html>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log(`📧 Email Sent Successfully to ${to}`);
  } catch (error) {
    console.error("❌ Email Sending Failed:", error);
    throw new Error("Unable to send email.");
  }
};

export default sendEmail;