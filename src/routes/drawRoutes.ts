import express from 'express';
import { 
  getActiveDraws, 
  getDrawResults, 
  createDraw, 
  enterResults, 
  getAllDraws, 
  getKienThietSchedule,
  updateDraw,
  deleteDraw
} from '../controllers/drawController';
import { getDrawStats } from '../controllers/statsController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

// Public
router.get('/active', getActiveDraws);
router.get('/kienthiet-schedule', getKienThietSchedule);
router.get('/results', getDrawResults);
router.get('/stats', getDrawStats);

// Admin
router.get('/admin', protect, admin, getAllDraws);
router.post('/admin', protect, admin, createDraw);
router.put('/admin/:id', protect, admin, updateDraw);
router.delete('/admin/:id', protect, admin, deleteDraw);
router.put('/admin/:id/results', protect, admin, enterResults);

export default router;
