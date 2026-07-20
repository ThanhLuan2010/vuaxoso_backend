import { Response } from 'express';
import Notification from '../models/Notification';

export const getMyNotifications = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    // Get notifications for this user, OR global notifications (user = null or undefined)
    const notifications = await Notification.find({
      $or: [
        { user: userId },
        { user: { $exists: false } },
        { user: null }
      ]
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
