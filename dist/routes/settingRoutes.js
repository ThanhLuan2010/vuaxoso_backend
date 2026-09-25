"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const settingController_1 = require("../controllers/settingController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.put('/bulk', authMiddleware_1.protect, authMiddleware_1.admin, settingController_1.bulkUpdateSettings);
router.get('/:key', settingController_1.getSetting);
router.put('/:key', authMiddleware_1.protect, authMiddleware_1.admin, settingController_1.updateSetting);
exports.default = router;
