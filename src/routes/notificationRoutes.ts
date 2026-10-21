import express from "express";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  readAllNotifications,
  markNotificationAsRead,
  adminGetNotifications,
  adminCreateNotification,
  adminDeleteNotification,
  adminToggleNotificationVisibility,
  registerFCMToken
} from "../controllers/notificationController";
import { protect, admin } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/my-notifications", protect, getMyNotifications);
router.get("/unread-count", protect, getUnreadNotificationCount);
router.post("/read-all", protect, readAllNotifications);
router.put("/read-all", protect, readAllNotifications);
router.put("/:id/read", protect, markNotificationAsRead);
router.post("/register-token", protect, registerFCMToken);

// Admin routes
router.get("/admin", protect, admin, adminGetNotifications);
router.post("/admin", protect, admin, adminCreateNotification);
router.delete("/admin/:id", protect, admin, adminDeleteNotification);
router.put("/admin/:id/toggle-visibility", protect, admin, adminToggleNotificationVisibility);

export default router;