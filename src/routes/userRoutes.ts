import express from 'express';
import { getUsers, updateUser, deleteUser, getUserHistory, getUserOrders, getUserTransactions, getUserBalanceHistory, getUserActivities, resetPassword, resetWithdrawPassword } from '../controllers/userController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, admin, getUsers);
router.get('/:id/history', protect, admin, getUserHistory);
router.get('/:id/orders', protect, admin, getUserOrders);
router.get('/:id/transactions', protect, admin, getUserTransactions);
router.get('/:id/activities', protect, admin, getUserActivities);
router.get('/:id/balance-history', protect, admin, getUserBalanceHistory);
router.put('/:id', protect, admin, updateUser);
router.delete('/:id', protect, admin, deleteUser);
router.post('/:id/reset-password', protect, admin, resetPassword);
router.post('/:id/reset-withdraw-password', protect, admin, resetWithdrawPassword);

export default router;
