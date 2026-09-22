"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const gameController_1 = require("../controllers/gameController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/', gameController_1.getGames);
// Admin routes
router.post('/', authMiddleware_1.protect, authMiddleware_1.admin, gameController_1.createGame);
router.put('/:id', authMiddleware_1.protect, authMiddleware_1.admin, gameController_1.updateGame);
exports.default = router;
