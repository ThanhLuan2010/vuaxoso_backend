"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect);
router.use(authMiddleware_1.admin);
router.use(authMiddleware_1.masterAdminOnly);
router.get("/accounts", adminController_1.getAdminAccounts);
router.post("/accounts", adminController_1.createAdminAccount);
router.put("/accounts/:id", adminController_1.updateAdminAccount);
router.delete("/accounts/:id", adminController_1.deleteAdminAccount);
exports.default = router;
