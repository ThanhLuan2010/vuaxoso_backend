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
    const notifications = await Notification.find().populate("user", "name phone").populate("sender", "name").sort({ createdAt: -1 });
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
