"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notificationController_1 = require("../controllers/notificationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/my-notifications', authMiddleware_1.protect, notificationController_1.getMyNotifications);
// Admin routes
router.get('/admin', authMiddleware_1.protect, authMiddleware_1.admin, notificationController_1.adminGetNotifications);
router.post('/admin', authMiddleware_1.protect, authMiddleware_1.admin, notificationController_1.adminCreateNotification);
router.delete('/admin/:id', authMiddleware_1.protect, authMiddleware_1.admin, notificationController_1.adminDeleteNotification);
exports.default = router;
