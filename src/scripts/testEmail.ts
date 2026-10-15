import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { createTransporter, sendEmail } from '../utils/sendEmail';

async function runTest() {
  console.log('====================================');
  console.log('   KIỂM TRA CẤU HÌNH GỬI EMAIL');
  console.log('====================================');

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const isSecure = process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  console.log(`- SMTP_HOST   : ${host}`);
  console.log(`- SMTP_PORT   : ${port}`);
  console.log(`- SMTP_SECURE : ${isSecure}`);
  console.log(`- SMTP_USER   : ${user}`);
  console.log(`- SMTP_PASS   : ${pass ? '****** (độ dài: ' + pass.length + ' ký tự)' : '(Trống)'}`);
  console.log('------------------------------------');

  const transporter = createTransporter();

  // 1. Kiểm tra kết nối & xác thực đến SMTP server
  console.log('1. Đang kiểm tra kết nối tới SMTP server...');
  try {
    await transporter.verify();
    console.log('=> Kết nối và xác thực SMTP thành công! ✅');
  } catch (verifyError: any) {
    console.error('=> Kết nối SMTP thất bại! ❌');
    console.error('Chi tiết lỗi:', verifyError.message || verifyError);
    process.exit(1);
  }

  // 2. Gửi thử một email
  // Lấy email người nhận từ tham số dòng lệnh (nếu có), hoặc gửi về chính SMTP_USER
  const recipient = process.argv[2] || user || 'developervnteam@gmail.com';
  console.log(`\n2. Đang gửi email thử nghiệm tới: ${recipient}...`);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2e7d32; text-align: center;">🎉 Test Email Thành Công!</h2>
      <p>Xin chào,</p>
      <p>Đây là email kiểm tra hệ thống gửi thư tự động từ <strong>App Thần Tài</strong>.</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Thời gian gửi:</strong> ${new Date().toLocaleString('vi-VN')}</p>
        <p style="margin: 5px 0;"><strong>Máy chủ SMTP:</strong> ${host}:${port}</p>
        <p style="margin: 5px 0;"><strong>Chế độ SSL/TLS (Secure):</strong> ${isSecure}</p>
        <p style="margin: 5px 0;"><strong>Tài khoản gửi:</strong> ${user}</p>
      </div>
      <p style="color: #666; font-size: 13px;">Nếu bạn nhận được email này, cấu hình SMTP của bạn đã hoàn toàn chính xác.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="text-align: center; color: #999; font-size: 12px;">© ${new Date().getFullYear()} App Thần Tài. All rights reserved.</p>
    </div>
  `;

  const success = await sendEmail(recipient, '[App Thần Tài] Test gửi email thành công', html);

  if (success) {
    console.log(`=> Đã gửi email test thành công tới: ${recipient} 🎉`);
  } else {
    console.error(`=> Gửi email thất bại. Vui lòng kiểm tra lại log chi tiết ở trên.`);
  }

  console.log('====================================');
}

runTest();
