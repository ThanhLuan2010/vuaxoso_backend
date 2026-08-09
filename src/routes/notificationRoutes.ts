import express from 'express';
import { getMyNotifications, adminGetNotifications, adminCreateNotification, adminDeleteNotification } from '../controllers/notificationController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/my-notifications', protect, getMyNotifications);

// Admin routes
router.get('/admin', protect, admin, adminGetNotifications);
router.post('/admin', protect, admin, adminCreateNotification);
router.delete('/admin/:id', protect, admin, adminDeleteNotification);

export default router;
