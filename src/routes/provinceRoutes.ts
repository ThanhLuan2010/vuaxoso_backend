import express from 'express';
import { getAllProvinces, createProvince, updateProvince, deleteProvince, seedProvinces } from '../controllers/provinceController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', getAllProvinces);
router.get('/admin', protect, admin, getAllProvinces);
router.post('/admin', protect, admin, createProvince);
router.put('/admin/:id', protect, admin, updateProvince);
router.delete('/admin/:id', protect, admin, deleteProvince);
router.post('/admin/seed', protect, admin, seedProvinces);

export default router;
