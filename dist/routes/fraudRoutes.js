"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fraudController_1 = require("../controllers/fraudController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/duplicate-ips-devices', authMiddleware_1.protect, authMiddleware_1.admin, fraudController_1.getDuplicateIPsAndDevices);
exports.default = router;
