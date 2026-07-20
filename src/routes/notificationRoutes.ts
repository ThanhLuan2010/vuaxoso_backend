import express from 'express';
import { getMyNotifications } from '../controllers/notificationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/my-notifications', protect, getMyNotifications);

export default router;
