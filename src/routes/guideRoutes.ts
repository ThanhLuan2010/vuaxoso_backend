import express from 'express';
import { getGuides, getAllGuides, createGuide, updateGuide, deleteGuide } from '../controllers/guideController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/', getGuides);

// Admin routes
router.get('/admin', protect, admin, getAllGuides);
router.post('/', protect, admin, createGuide);
router.put('/:id', protect, admin, updateGuide);
router.delete('/:id', protect, admin, deleteGuide);

export default router;
