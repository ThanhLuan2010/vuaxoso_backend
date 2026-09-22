"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const drawController_1 = require("../controllers/drawController");
const statsController_1 = require("../controllers/statsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public
router.get('/active', drawController_1.getActiveDraws);
router.get('/kienthiet-schedule', drawController_1.getKienThietSchedule);
router.get('/results', drawController_1.getDrawResults);
router.get('/stats', statsController_1.getDrawStats);
// Admin
router.get('/admin', authMiddleware_1.protect, authMiddleware_1.admin, drawController_1.getAllDraws);
router.post('/admin', authMiddleware_1.protect, authMiddleware_1.admin, drawController_1.createDraw);
router.put('/admin/:id/results', authMiddleware_1.protect, authMiddleware_1.admin, drawController_1.enterResults);
exports.default = router;
