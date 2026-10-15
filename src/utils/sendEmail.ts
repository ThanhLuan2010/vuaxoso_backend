import nodemailer from 'nodemailer';

export const createTransporter = () => {
  const port = Number(process.env.SMTP_PORT) || 587;
  const isSecure = process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: isSecure,
    auth: {
      user: process.env.SMTP_USER || 'developervnteam@gmail.com',
      pass: process.env.SMTP_PASS || '',
    },
  });
};

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const transporter = createTransporter();
    const fromName = process.env.SMTP_FROM_NAME || 'App Thần Tài';
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'developervnteam@gmail.com';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      html,
    });

    console.log('Message sent successfully. Message ID: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};
