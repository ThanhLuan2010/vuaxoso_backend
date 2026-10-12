import express from 'express';
import { getGames, createGame, updateGame, updateGameRates } from '../controllers/gameController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', getGames);

// Admin routes
router.post('/', protect, admin, createGame);
router.put('/:id', protect, admin, updateGame);
router.put('/:id/rates', protect, admin, updateGameRates);

export default router;
