import express from "express";
import { getAdminAccounts, createAdminAccount, updateAdminAccount, deleteAdminAccount } from "../controllers/adminController";
import { protect, admin, masterAdminOnly } from "../middleware/authMiddleware";

const router = express.Router();

router.use(protect);
router.use(admin);
router.use(masterAdminOnly);

router.get("/accounts", getAdminAccounts);
router.post("/accounts", createAdminAccount);
router.put("/accounts/:id", updateAdminAccount);
router.delete("/accounts/:id", deleteAdminAccount);

export default router;
