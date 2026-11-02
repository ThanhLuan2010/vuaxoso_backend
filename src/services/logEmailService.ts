import { sendEmail } from '../utils/sendEmail';
import { EncryptionHelper } from '../utils/EncryptionHelper';
import User from '../models/User';

export const sendLogNotificationEmail = async (log: any) => {
  try {
    // Không gửi email cho hành động xem chi tiết user để tránh spam
    if (log.action === 'VIEW_USER') {
      return;
    }

    const recipient = process.env.NOTIFICATION_EMAIL || 'developervnteam@gmail.com';

    let customerInfo = '-';
    let customerPhone = '';
    let customerName = '';

    if (log.targetUserId) {
      try {
        const user = await User.findById(log.targetUserId).lean();
        if (user) {
          customerName = user.name || '';
          if (user.phone) {
            customerPhone = EncryptionHelper.decryptDeterministic(user.phone) || '';
          }
          customerInfo = `${customerName ? customerName : 'Khách hàng'}${customerPhone ? ` (${customerPhone})` : ''}`;
        }
      } catch (err) {
        console.error('Error fetching targetUser for log email:', err);
      }
    }

    const timeStr = new Date(log.createdAt || Date.now()).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false
    });

    let detailsText = log.details || '';
    let changesHtml = '';

    try {
      const parsed = JSON.parse(log.details);
      if (parsed && (parsed.summary || parsed.changes)) {
        detailsText = parsed.summary || '';
        if (Array.isArray(parsed.changes) && parsed.changes.length > 0) {
          changesHtml = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; background: #fafafa; border: 1px solid #eee; border-radius: 4px;">
              <thead>
                <tr style="background: #f0f0f0; text-align: left;">
                  <th style="padding: 6px 10px; border-bottom: 1px solid #ddd;">Mục</th>
                  <th style="padding: 6px 10px; border-bottom: 1px solid #ddd;">Giá trị cũ</th>
                  <th style="padding: 6px 10px; border-bottom: 1px solid #ddd;">Giá trị mới</th>
                </tr>
              </thead>
              <tbody>
                ${parsed.changes
                  .map(
                    (c: any) => `
                  <tr>
                    <td style="padding: 6px 10px; border-bottom: 1px solid #eee; font-weight: bold;">${c.field || '-'}</td>
                    <td style="padding: 6px 10px; border-bottom: 1px solid #eee; color: #888;">${c.old || '-'}</td>
                    <td style="padding: 6px 10px; border-bottom: 1px solid #eee; color: #1890ff; font-weight: 500;">${c.new || '-'}</td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          `;
        }
      }
    } catch (e) {
      // plain text details
    }

    // Determine badge colors based on action
    let badgeBg = '#e6f7ff';
    let badgeColor = '#1890ff';
    let actionLabel = log.action;

    if (log.action.includes('THẮNG') || log.action.includes('WIN')) {
      badgeBg = '#f6ffed';
      badgeColor = '#52c41a';
    } else if (log.action.includes('THUA') || log.action.includes('LOSE') || log.action.includes('TỪ CHỐI') || log.action.includes('REJECT') || log.action.includes('Xoá')) {
      badgeBg = '#fff1f0';
      badgeColor = '#ff4d4f';
    } else if (log.action.includes('NẠP') || log.action.includes('DEPOSIT')) {
      badgeBg = '#e6f7ff';
      badgeColor = '#1890ff';
    } else if (log.action.includes('RÚT') || log.action.includes('WITHDRAW')) {
      badgeBg = '#fff7e6';
      badgeColor = '#fa8c16';
    }

    const subject = `[VuaXoSo - Nhật ký] ${log.action}: ${detailsText.length > 80 ? detailsText.slice(0, 80) + '...' : detailsText}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e8e8e8; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); padding: 18px 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">📢 VUA XỔ SỐ - BÁO CÁO NHẬT KÝ HOẠT ĐỘNG</h2>
        </div>
        
        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; width: 140px; color: #666; font-weight: 500;">Thời gian:</td>
              <td style="padding: 10px 0; font-weight: 600; color: #333;">${timeStr}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; color: #666; font-weight: 500;">Người thực hiện:</td>
              <td style="padding: 10px 0; font-weight: 600; color: #1890ff;">${log.adminName || 'Hệ thống'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; color: #666; font-weight: 500;">Hành động:</td>
              <td style="padding: 10px 0;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 13px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor};">
                  ${actionLabel}
                </span>
              </td>
            </tr>
            ${
              customerInfo !== '-'
                ? `
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; color: #666; font-weight: 500;">Khách hàng:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #2f54eb;">${customerInfo}</td>
            </tr>`
                : ''
            }
            <tr>
              <td style="padding: 12px 0; color: #666; font-weight: 500; vertical-align: top;">Nội dung chi tiết:</td>
              <td style="padding: 12px 0; color: #262626; line-height: 1.6; font-size: 14px;">
                ${detailsText}
                ${changesHtml}
              </td>
            </tr>
          </table>
        </div>

        <div style="background: #fafafa; padding: 14px 24px; border-top: 1px solid #f0f0f0; text-align: center; color: #8c8c8c; font-size: 12px;">
          Email được gửi tự động từ hệ thống Quản lý Vua Xổ Số tới <b>${recipient}</b>.<br />
          Vui lòng không phản hồi email này.
        </div>
      </div>
    `;

    // Asynchronously send email
    sendEmail(recipient, subject, html).catch((err) => {
      console.error('[logEmailService] Failed to send email:', err);
    });
  } catch (error) {
    console.error('[logEmailService] Error processing email:', error);
  }
};
