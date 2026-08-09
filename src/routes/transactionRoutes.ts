import express from 'express';
import { 
  deposit, 
  withdraw, 
  getHistory, 
  getAllTransactions, 
  approveTransaction, 
  rejectTransaction,
  depositBinance
} from '../controllers/transactionController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/deposit', protect, deposit);
router.post('/deposit/binance', protect, depositBinance);
router.post('/withdraw', protect, withdraw);
router.get('/history', protect, getHistory);

// Admin routes
router.get('/admin/transactions', protect, admin, getAllTransactions);
router.put('/admin/transactions/:id/approve', protect, admin, approveTransaction);
router.put('/admin/transactions/:id/reject', protect, admin, rejectTransaction);

export default router;
