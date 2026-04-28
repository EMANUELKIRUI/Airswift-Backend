const Notification = require('../models/Notification');
const { emitNotification } = require('../utils/socketEmitter');

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('getNotifications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.is_read = true;
    await notification.save();

    res.json({ success: true, notification });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user.id, is_read: false },
      { is_read: true }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error('markAllNotificationsRead error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      is_read: false,
    });

    res.json({
      message: 'Unread count retrieved successfully',
      unreadCount: count,
    });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user.id, is_read: false },
      { is_read: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('markAllNotificationsAsRead error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('deleteNotification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
  markAllNotificationsAsRead,
  deleteNotification,
};
