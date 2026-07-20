import express from 'express';
import { createOrder, getMyOrders, getAllOrders, updateOrderAdmin } from '../controllers/orderController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);

// Admin
router.get('/admin', protect, admin, getAllOrders);
router.put('/admin/:id', protect, admin, updateOrderAdmin);

export default router;
