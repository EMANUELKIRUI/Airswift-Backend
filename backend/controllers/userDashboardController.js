const Document = require("../models/Document");
const ActivityLog = require("../models/ActivityLog");
const Notification = require("../models/Notification");
const Interview = require("../models/Interview");

/**
 * Get user dashboard data
 * GET /api/user-dashboard
 * Returns: stats, documents, interviews, notifications, activities
 */
exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get documents statistics
    const documents = await Document.find({ userId }).sort({ uploadedAt: -1 });
    const stats = {
      submitted: documents.filter((d) => d.status !== "missing").length,
      pending: documents.filter((d) => d.status === "pending").length,
      approved: documents.filter((d) => d.status === "approved").length,
      rejected: documents.filter((d) => d.status === "rejected").length,
      interviews: 0, // Will be updated below
    };

    // Get interviews
    // Using Interview model (Sequelize), find by user_id through application relationship
    // For now, we'll use a placeholder or find interviews associated with this user
    let interviews = [];
    try {
      interviews = await Interview.findAll({
        where: { interviewer_id: userId },
        limit: 10,
        order: [["scheduled_at", "DESC"]],
      });
      stats.interviews = interviews.length;
    } catch (error) {
      console.warn("Interview fetch error:", error.message);
    }

    // Get recent notifications (last 5)
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent activities (last 5)
    const activities = await ActivityLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Mark notifications as read after fetching
    // (Optional - only if user explicitly requests it)

    res.json({
      message: "Dashboard data retrieved successfully",
      stats,
      documents: documents.slice(0, 10), // Limit to 10 most recent
      interviews: interviews.slice(0, 10),
      notifications,
      activities,
    });
  } catch (error) {
    console.error("User dashboard error:", error);
    res.status(500).json({
      message: "Error retrieving dashboard data",
      error: error.message,
    });
  }
};

/**
 * Get dashboard summary with counts only
 * GET /api/user-dashboard/summary
 */
exports.getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      totalDocuments,
      approvedDocuments,
      pendingDocuments,
      rejectedDocuments,
      unreadNotifications,
      recentActivities,
    ] = await Promise.all([
      Document.countDocuments({ userId }),
      Document.countDocuments({ userId, status: "approved" }),
      Document.countDocuments({ userId, status: "pending" }),
      Document.countDocuments({ userId, status: "rejected" }),
      Notification.countDocuments({ userId, is_read: false }),
      ActivityLog.countDocuments({ userId }),
    ]);

    res.json({
      message: "Dashboard summary retrieved successfully",
      summary: {
        totalDocuments,
        approvedDocuments,
        pendingDocuments,
        rejectedDocuments,
        unreadNotifications,
        recentActivities,
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({
      message: "Error retrieving dashboard summary",
      error: error.message,
    });
  }
};

/**
 * Get user profile dashboard (minimal info)
 * GET /api/user-dashboard/profile
 */
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const User = require("../models/User");

    const user = await User.findById(userId).select(
      "name email role profilePicture createdAt"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User profile retrieved successfully",
      user,
    });
  } catch (error) {
    console.error("User profile error:", error);
    res.status(500).json({
      message: "Error retrieving user profile",
      error: error.message,
    });
  }
};
