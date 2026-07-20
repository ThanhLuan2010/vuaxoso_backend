import express from 'express';
import { getTickets, getAllTickets, createTicket, updateTicket, deleteTicket, bulkGenerateTickets } from '../controllers/ticketController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

// Public / User routes
router.get('/', getTickets);

// Admin routes
router.get('/admin', protect, admin, getAllTickets);
router.post('/admin', protect, admin, createTicket);
router.post('/admin/bulk', protect, admin, bulkGenerateTickets);
router.put('/admin/:id', protect, admin, updateTicket);
router.delete('/admin/:id', protect, admin, deleteTicket);

export default router;
