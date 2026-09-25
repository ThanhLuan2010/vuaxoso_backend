"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const transactionController_1 = require("../controllers/transactionController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/deposit', authMiddleware_1.protect, transactionController_1.deposit);
router.post('/deposit/binance', authMiddleware_1.protect, transactionController_1.depositBinance);
router.post('/withdraw', authMiddleware_1.protect, transactionController_1.withdraw);
router.get('/history', authMiddleware_1.protect, transactionController_1.getHistory, transactionController_1.getMyBalanceHistory);
// Admin routes
router.get('/admin/transactions', authMiddleware_1.protect, authMiddleware_1.admin, transactionController_1.getAllTransactions);
router.put('/admin/transactions/:id/approve', authMiddleware_1.protect, authMiddleware_1.admin, transactionController_1.approveTransaction);
router.put('/admin/transactions/:id/reject', authMiddleware_1.protect, authMiddleware_1.admin, transactionController_1.rejectTransaction);
exports.default = router;
