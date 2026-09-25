import express from 'express';
import { getSetting, updateSetting, bulkUpdateSettings } from '../controllers/settingController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.put('/bulk', protect, admin, bulkUpdateSettings);
router.get('/:key', getSetting);
router.put('/:key', protect, admin, updateSetting);

export default router;
