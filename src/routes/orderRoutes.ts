import express from 'express';
import { createOrder, getMyOrders, getAllOrders, updateOrderAdmin, getOrderById, getOrderSummary } from '../controllers/orderController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);
// Admin
router.get('/admin/summary', protect, admin, getOrderSummary);
router.get('/admin', protect, admin, getAllOrders);
router.put('/admin/:id', protect, admin, updateOrderAdmin);

// getOrderById should be last so it doesn't match /admin or /my-orders
router.get('/:id', protect, getOrderById);

export default router;
