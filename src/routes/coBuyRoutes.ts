import express from 'express';
import { getRooms, joinRoom, getRoomById } from '../controllers/coBuyController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/rooms', getRooms);
router.get('/rooms/:id', getRoomById);
router.post('/rooms/:id/join', protect, joinRoom);

export default router;
