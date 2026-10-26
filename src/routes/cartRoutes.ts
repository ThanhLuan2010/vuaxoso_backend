import express from 'express';
import {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
  syncCart,
} from '../controllers/cartController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getCart);
router.post('/add', protect, addToCart);
router.delete('/item/:itemId', protect, removeFromCart);
router.delete('/clear', protect, clearCart);
router.delete('/', protect, clearCart);
router.put('/sync', protect, syncCart);

export default router;
