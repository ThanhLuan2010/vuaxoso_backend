"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const coBuyController_1 = require("../controllers/coBuyController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/rooms', coBuyController_1.getRooms);
router.get('/rooms/:id', coBuyController_1.getRoomById);
router.post('/rooms/:id/join', authMiddleware_1.protect, coBuyController_1.joinRoom);
exports.default = router;
