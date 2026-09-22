"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/', authMiddleware_1.protect, authMiddleware_1.admin, userController_1.getUsers);
router.get('/:id/history', authMiddleware_1.protect, authMiddleware_1.admin, userController_1.getUserHistory);
router.put('/:id', authMiddleware_1.protect, authMiddleware_1.admin, userController_1.updateUser);
router.delete('/:id', authMiddleware_1.protect, authMiddleware_1.admin, userController_1.deleteUser);
router.post('/:id/reset-password', authMiddleware_1.protect, authMiddleware_1.admin, userController_1.resetPassword);
router.post('/:id/reset-withdraw-password', authMiddleware_1.protect, authMiddleware_1.admin, userController_1.resetWithdrawPassword);
exports.default = router;
