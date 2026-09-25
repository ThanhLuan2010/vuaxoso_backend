import express from 'express';
import { getAdminLogs, getUserAdminLogs, getUserLogs, logUserView, deleteAdminLog } from '../controllers/logController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, admin, getAdminLogs);
router.get('/user/:userId', protect, admin, getUserAdminLogs);
router.get('/user-actions/:userId', protect, admin, getUserLogs);
router.post('/view-user', protect, admin, logUserView);

export default router;
