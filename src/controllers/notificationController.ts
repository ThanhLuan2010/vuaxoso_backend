import { Response } from 'express';
import Notification from '../models/Notification';

export const getMyNotifications = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    // Get notifications for this user, OR global notifications (user = null or undefined)
    const notifications = await Notification.find({
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
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const adminCreateNotification = async (req: any, res: Response) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: 'Tiêu đề và nội dung là bắt buộc' });
    }

    const notification = await Notification.create({
      title,
      body,
      type: 'promo',
      category: 'promo',
      // user is undefined by default to make it global
    });

    res.status(201).json(notification);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const adminDeleteNotification = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }
    res.json({ message: 'Đã xóa thông báo' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
