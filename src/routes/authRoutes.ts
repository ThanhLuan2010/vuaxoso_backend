import express from 'express';
import { registerUser, loginUser, getProfile, updateProfile, sendEmailOtp, verifyEmailOtp, changePassword } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/send-email-otp', protect, sendEmailOtp);
router.post('/verify-email-otp', protect, verifyEmailOtp);
router.post('/change-password', protect, changePassword);

export default router;
