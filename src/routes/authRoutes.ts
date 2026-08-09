import express from 'express';
import { registerUser, loginUser, getProfile, updateProfile } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

export default router;
