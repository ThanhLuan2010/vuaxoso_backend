import { sendPushToTopic, sendPushToTokens } from "../services/fcmService";
import User from '../models/User';
import { EncryptionHelper } from '../utils/EncryptionHelper';
import { Response } from 'express';
import Notification from '../models/Notification';
import AdminLog from '../models/AdminLog';

export const getMyNotifications = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    // Get notifications for this user, OR global notifications (user = null or undefined)
    const notifications = await Notification.find({
      isHidden: { $ne: true },
      $or: [
        { user: userId },
        { user: { $exists: false }, type: 'promo' },
        { user: null, type: 'promo' }
      ]
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const adminGetNotifications = async (req: any, res: Response) => {
  try {
    const { search } = req.query;
    let query: any = {};

    if (search && (search as string).trim()) {
      const searchStr = (search as string).trim();
      const searchRegex = new RegExp(searchStr, "i");
      const exactEncryptedPhone = EncryptionHelper.encryptDeterministic(searchStr);

      const matchedUsers = await User.find({
        $or: [
          { name: searchRegex },
          { phone: searchRegex },
          { phone: exactEncryptedPhone }
        ]
      }).select("_id");
      const matchedUserIds = matchedUsers.map(u => u._id);

      query.$or = [
        { title: searchRegex },
        { body: searchRegex },
        { type: searchRegex },
        { user: { $in: matchedUserIds } }
      ];
    }

    const notifications = await Notification.find(query)
      .populate("user", "name phone")
      .populate("sender", "name")
      .sort({ createdAt: -1 })
      .lean();

    for (const notif of notifications) {
      if (notif.user && typeof (notif.user as any).phone === "string") {
        (notif.user as any).phone = EncryptionHelper.decryptDeterministic((notif.user as any).phone);
      }
    }

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

  export const adminCreateNotification = async (req: any, res: Response) => {
    try {
      const { title, body, user } = req.body;
      if (!title || !body) {
        return res.status(400).json({ message: 'Tiêu đề và nội dung là bắt buộc' });
      }
  
      const notification = await Notification.create({
        title,
        body,
        type: 'promo',
        category: 'promo',
        user: user || undefined,
        sender: req.user?._id,
      });

      if (user) {
        await AdminLog.create({
          adminId: req.user?._id,
          adminName: req.user?.name || 'Admin',
          targetUserId: user,
          action: 'Nhắn tin',
          details: `Gửi tin nhắn: "${title}" - ${body}`
        });

        // Gửi push notification riêng cho User này
        try {
          const targetUser = await User.findById(user).select('fcmTokens');
          if (targetUser && targetUser.fcmTokens && targetUser.fcmTokens.length > 0) {
            await sendPushToTokens(targetUser.fcmTokens, title, body, {
              notificationId: notification._id.toString(),
              type: 'direct'
            });
          }
        } catch (fcmErr) {
          console.error('[FCM] Error sending push to user:', fcmErr);
        }
      } else {
        // Gửi push notification tới TOÀN BỘ User (Topic 'all' và Multicast)
        try {
          await sendPushToTopic('all', title, body, {
            notificationId: notification._id.toString(),
            type: 'promo'
          });

          const usersWithTokens = await User.find({ fcmTokens: { $exists: true, $ne: [] } }).select('fcmTokens');
          const allTokens = Array.from(new Set(usersWithTokens.flatMap(u => u.fcmTokens || [])));
          if (allTokens.length > 0) {
            await sendPushToTokens(allTokens, title, body, {
              notificationId: notification._id.toString(),
              type: 'promo'
            });
          }
        } catch (fcmErr) {
          console.error('[FCM] Error broadcasting push:', fcmErr);
        }
      }

    res.status(201).json(notification);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const adminDeleteNotification = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);
    if(notification) await AdminLog.create({ adminId: req.user?._id, adminName: req.user?.name || 'Admin', action: 'Xoá thông báo', details: `Xoá thông báo: ${notification.title}` });
    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }
    res.json({ message: 'Đã xóa thông báo' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


export const adminToggleNotificationVisibility = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }
    notification.isHidden = !notification.isHidden;
    await notification.save();
    await AdminLog.create({ adminId: req.user?._id, adminName: req.user?.name || 'Admin', action: 'Ẩn/Hiện thông báo', details: `Đã ${notification.isHidden ? 'ẩn' : 'hiện'} thông báo: ${notification.title}` });
    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const registerFCMToken = async (req: any, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Token là bắt buộc' });
    }

    if (req.user?._id) {
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { fcmTokens: token }
      });
      console.log(`[FCM] Registered token for user ${req.user._id}`);
    }

    res.json({ success: true, message: 'Đăng ký token thành công' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
