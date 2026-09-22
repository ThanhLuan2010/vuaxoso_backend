"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bannerController_1 = require("../controllers/bannerController");
const router = express_1.default.Router();
// Public route
router.get('/active', bannerController_1.getActiveBanners);
// Admin routes (In a real app, add admin auth middleware here)
router.get('/', bannerController_1.getAllBanners);
router.post('/', bannerController_1.createBanner);
router.put('/:id', bannerController_1.updateBanner);
router.delete('/:id', bannerController_1.deleteBanner);
exports.default = router;
