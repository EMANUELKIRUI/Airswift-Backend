const express = require('express');
const { verifyToken } = require('../middleware/auth');
<<<<<<< HEAD
const { getNotifications, markNotificationRead, getUnreadCount, markAllNotificationsAsRead, deleteNotification } = require('../controllers/notificationController');
=======
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} = require('../controllers/notificationController');
>>>>>>> 697b595 (upgrade)

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// GET /api/notifications - Get notifications with pagination
router.get('/', getNotifications);

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', getUnreadCount);

// PUT /api/notifications/:id - Mark single notification as read
router.put('/:id', markNotificationRead);
router.put('/mark-all-read', markAllNotificationsAsRead);
router.delete('/:id', deleteNotification);

// PUT /api/notifications/read/all - Mark all notifications as read
router.put('/read/all', markAllNotificationsRead);

module.exports = router;
