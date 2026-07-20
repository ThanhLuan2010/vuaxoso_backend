import express from 'express';
import { getActiveBanners, getAllBanners, createBanner, updateBanner, deleteBanner } from '../controllers/bannerController';

const router = express.Router();

// Public route
router.get('/active', getActiveBanners);

// Admin routes (In a real app, add admin auth middleware here)
router.get('/', getAllBanners);
router.post('/', createBanner);
router.put('/:id', updateBanner);
router.delete('/:id', deleteBanner);

export default router;
