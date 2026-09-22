"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const guideController_1 = require("../controllers/guideController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public routes
router.get('/', guideController_1.getGuides);
// Admin routes
router.get('/admin', authMiddleware_1.protect, authMiddleware_1.admin, guideController_1.getAllGuides);
router.post('/', authMiddleware_1.protect, authMiddleware_1.admin, guideController_1.createGuide);
router.put('/:id', authMiddleware_1.protect, authMiddleware_1.admin, guideController_1.updateGuide);
router.delete('/:id', authMiddleware_1.protect, authMiddleware_1.admin, guideController_1.deleteGuide);
exports.default = router;
