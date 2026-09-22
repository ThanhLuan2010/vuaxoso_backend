"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orderController_1 = require("../controllers/orderController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/', authMiddleware_1.protect, orderController_1.createOrder);
router.get('/my-orders', authMiddleware_1.protect, orderController_1.getMyOrders);
// Admin
router.get('/admin/summary', authMiddleware_1.protect, authMiddleware_1.admin, orderController_1.getOrderSummary);
router.get('/admin', authMiddleware_1.protect, authMiddleware_1.admin, orderController_1.getAllOrders);
router.put('/admin/:id', authMiddleware_1.protect, authMiddleware_1.admin, orderController_1.updateOrderAdmin);
// getOrderById should be last so it doesn't match /admin or /my-orders
router.get('/:id', authMiddleware_1.protect, orderController_1.getOrderById);
exports.default = router;
