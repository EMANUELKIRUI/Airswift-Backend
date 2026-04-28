const Document = require("../models/Document");
const Application = require("../models/ApplicationMongoose");
const User = require("../models/User");
const Notification = require("../models/Notification");

/**
 * Get all documents for admin review
 * GET /api/admin/documents
 */
exports.getAllDocuments = async (req, res) => {
  try {
    const { status, type, userId, sortBy = "-createdAt" } = req.query;
    const filter = {};

    if (status && ["missing", "uploaded", "pending", "approved", "rejected"].includes(status)) {
      filter.status = status;
    }
    if (type && ["passport", "cv", "certificate", "cover_letter", "photo"].includes(type)) {
      filter.type = type;
    }
    if (userId) {
      filter.userId = userId;
    }

    // Fetch documents with user details
    const documents = await Document.find(filter)
      .populate("userId", "name email phone role")
      .populate("reviewedBy", "name email")
      .sort(sortBy)
      .lean();

    // Enhance with application data
    const enhancedDocuments = await Promise.all(
      documents.map(async (doc) => {
        const application = await Application.findOne({ userId: doc.userId }).lean();
        return {
          ...doc,
          applicationStatus: application?.status,
          applicationStage: application?.stage,
        };
      })
    );

    res.json({
      message: "All documents retrieved successfully",
      total: enhancedDocuments.length,
      documents: enhancedDocuments,
    });
  } catch (error) {
    console.error("Get all documents error:", error);
    res.status(500).json({
      message: "Error retrieving documents",
      error: error.message,
    });
  }
};

/**
 * Get all applications for admin
 * GET /api/admin/applications
 */
exports.getAllApplications = async (req, res) => {
  try {
    const { status, stage, sortBy = "-createdAt" } = req.query;
    const filter = {};

    if (status && ["pending", "reviewed", "shortlisted", "rejected", "interview", "hired"].includes(status)) {
      filter.status = status;
    }
    if (stage && ["documents", "interview", "final", "hired", "rejected"].includes(stage)) {
      filter.stage = stage;
    }

    const applications = await Application.find(filter)
      .populate("userId", "name email phone")
      .populate("jobId", "title company")
      .sort(sortBy)
      .lean();

    // Enhance with document count and status
    const enhancedApplications = await Promise.all(
      applications.map(async (app) => {
        const docs = await Document.find({ userId: app.userId }).lean();
        const approvedDocs = docs.filter((d) => d.status === "approved").length;
        const totalDocs = docs.length;

        return {
          ...app,
          documentsStatus: {
            total: totalDocs,
            approved: approvedDocs,
            pending: totalDocs - approvedDocs,
            allApproved: approvedDocs === totalDocs && totalDocs > 0,
          },
        };
      })
    );

    res.json({
      message: "All applications retrieved successfully",
      total: enhancedApplications.length,
      applications: enhancedApplications,
    });
  } catch (error) {
    console.error("Get all applications error:", error);
    res.status(500).json({
      message: "Error retrieving applications",
      error: error.message,
    });
  }
};

/**
 * Get single user's documents and application
 * GET /api/admin/users/:userId
 */
exports.getUserDocumentsAndApplication = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user details
    const user = await User.findById(userId).select("name email phone role");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get all documents
    const documents = await Document.find({ userId })
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });

    // Get application
    const application = await Application.findOne({ userId })
      .populate("jobId", "title company");

    // Get notifications
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      message: "User data retrieved successfully",
      user,
      documents,
      application,
      recentNotifications: notifications,
      documentStats: {
        total: documents.length,
        approved: documents.filter((d) => d.status === "approved").length,
        pending: documents.filter((d) => d.status === "pending").length,
        rejected: documents.filter((d) => d.status === "rejected").length,
      },
    });
  } catch (error) {
    console.error("Get user documents and application error:", error);
    res.status(500).json({
      message: "Error retrieving user data",
      error: error.message,
    });
  }
};

/**
 * Check if user can proceed to interview
 * GET /api/admin/users/:userId/interview-eligibility
 */
exports.checkInterviewEligibility = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all documents
    const documents = await Document.find({ userId });
    const allApproved = documents.length > 0 && documents.every((d) => d.status === "approved");

    // Get application
    const application = await Application.findOne({ userId });

    res.json({
      message: "Interview eligibility check completed",
      userId,
      canProceedToInterview: allApproved,
      documentsStatus: {
        total: documents.length,
        approved: documents.filter((d) => d.status === "approved").length,
        pending: documents.filter((d) => d.status === "pending").length,
        rejected: documents.filter((d) => d.status === "rejected").length,
        allApproved,
      },
      applicationStage: application?.stage,
      applicationStatus: application?.status,
    });
  } catch (error) {
    console.error("Check interview eligibility error:", error);
    res.status(500).json({
      message: "Error checking interview eligibility",
      error: error.message,
    });
  }
};

/**
 * Lock/unlock interview scheduling until documents complete
 * This is checked in interview controller, but admin can override
 */
exports.overrideInterviewLock = async (req, res) => {
  try {
    const { userId } = req.params;
    const { allowInterview } = req.body;

    if (typeof allowInterview !== "boolean") {
      return res.status(400).json({ message: "allowInterview must be boolean" });
    }

    const application = await Application.findOneAndUpdate(
      { userId },
      { interviewLocked: !allowInterview },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json({
      message: `Interview ${allowInterview ? "unlocked" : "locked"} successfully`,
      application,
    });
  } catch (error) {
    console.error("Override interview lock error:", error);
    res.status(500).json({
      message: "Error updating interview lock",
      error: error.message,
    });
  }
};

/**
 * Bulk review documents
 * PUT /api/admin/documents/bulk-review
 */
exports.bulkReviewDocuments = async (req, res) => {
  try {
    const { documentIds, status, rejectionReason } = req.body;
    const adminId = req.user.id;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ message: "documentIds must be a non-empty array" });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'rejected'" });
    }

    const updateData = {
      status,
      reviewedAt: new Date(),
      reviewedBy: adminId,
    };

    if (status === "rejected") {
      updateData.rejectionReason = rejectionReason;
    }

    // Update all documents
    const result = await Document.updateMany(
      { _id: { $in: documentIds } },
      updateData
    );

    // Create notifications for affected users
    const documents = await Document.find({ _id: { $in: documentIds } });
    const userIds = [...new Set(documents.map((d) => d.userId.toString()))];

    for (const userId of userIds) {
      const notificationMessage =
        status === "approved"
          ? "Your document has been approved"
          : `Your document was rejected: ${rejectionReason}`;

      await Notification.create({
        userId,
        title: status === "approved" ? "Document Approved" : "Document Rejected",
        message: notificationMessage,
        type: "document",
      });

      // Emit socket notification
      if (global.io) {
        global.io.to(`user_${userId}`).emit("notification", {
          title: status === "approved" ? "Document Approved" : "Document Rejected",
          message: notificationMessage,
          type: "document",
        });
      }
    }

    res.json({
      message: `Bulk review completed. ${result.modifiedCount} documents updated.`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Bulk review documents error:", error);
    res.status(500).json({
      message: "Error in bulk review",
      error: error.message,
    });
  }
};
