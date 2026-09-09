import express from 'express';
import { getDuplicateIPsAndDevices } from '../controllers/fraudController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/duplicate-ips-devices', protect, admin, getDuplicateIPsAndDevices);

export default router;
