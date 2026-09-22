"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ticketController_1 = require("../controllers/ticketController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public / User routes
router.get('/', ticketController_1.getTickets);
// Admin routes
router.get('/admin', authMiddleware_1.protect, authMiddleware_1.admin, ticketController_1.getAllTickets);
router.post('/admin', authMiddleware_1.protect, authMiddleware_1.admin, ticketController_1.createTicket);
router.post('/admin/bulk', authMiddleware_1.protect, authMiddleware_1.admin, ticketController_1.bulkGenerateTickets);
router.put('/admin/:id', authMiddleware_1.protect, authMiddleware_1.admin, ticketController_1.updateTicket);
router.delete('/admin/:id', authMiddleware_1.protect, authMiddleware_1.admin, ticketController_1.deleteTicket);
exports.default = router;
