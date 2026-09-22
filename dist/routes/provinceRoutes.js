"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const provinceController_1 = require("../controllers/provinceController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/', provinceController_1.getAllProvinces);
router.get('/admin', authMiddleware_1.protect, authMiddleware_1.admin, provinceController_1.getAllProvinces);
router.post('/admin', authMiddleware_1.protect, authMiddleware_1.admin, provinceController_1.createProvince);
router.put('/admin/:id', authMiddleware_1.protect, authMiddleware_1.admin, provinceController_1.updateProvince);
router.delete('/admin/:id', authMiddleware_1.protect, authMiddleware_1.admin, provinceController_1.deleteProvince);
router.post('/admin/seed', authMiddleware_1.protect, authMiddleware_1.admin, provinceController_1.seedProvinces);
exports.default = router;
