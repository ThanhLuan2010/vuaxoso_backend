import express from 'express';
import { getAdminLogs, getUserAdminLogs } from '../controllers/logController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, admin, getAdminLogs);
router.get('/user/:userId', protect, admin, getUserAdminLogs);

export default router;
