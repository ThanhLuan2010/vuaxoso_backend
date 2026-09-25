"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const logController_1 = require("../controllers/logController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/', authMiddleware_1.protect, authMiddleware_1.admin, logController_1.getAdminLogs);
router.get('/user/:userId', authMiddleware_1.protect, authMiddleware_1.admin, logController_1.getUserAdminLogs);
router.get('/user-actions/:userId', authMiddleware_1.protect, authMiddleware_1.admin, logController_1.getUserLogs);
router.post('/view-user', authMiddleware_1.protect, authMiddleware_1.admin, logController_1.logUserView);
router.delete('/:id', authMiddleware_1.protect, authMiddleware_1.admin, logController_1.deleteAdminLog);
exports.default = router;
