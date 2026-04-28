const Document = require("../models/Document");
const Application = require("../models/ApplicationMongoose");
const Notification = require("../models/Notification");

/**
 * Middleware to check if user has all documents approved before proceeding to interview
 * 
 * Usage:
 * router.post("/schedule", checkDocumentsComplete, scheduleInterview);
 */
const checkDocumentsComplete = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Check if all documents are approved
    const documents = await Document.find({ userId });

    if (documents.length === 0) {
      return res.status(403).json({
        message: "No documents found. Please upload all required documents first.",
        blocking: true,
        documentsRequired: ["passport", "cv", "certificate"],
      });
    }

    const allApproved = documents.every((d) => d.status === "approved");

    if (!allApproved) {
      const pendingDocs = documents.filter((d) => d.status !== "approved");
      const rejectedDocs = documents.filter((d) => d.status === "rejected");

      return res.status(403).json({
        message: "Cannot schedule interview. Complete all document reviews first.",
        blocking: true,
        documentsStatus: {
          total: documents.length,
          approved: documents.filter((d) => d.status === "approved").length,
          pending: pendingDocs.filter((d) => d.status === "pending").length,
          rejected: rejectedDocs.length,
        },
        pendingDocuments: pendingDocs.map((d) => ({
          id: d._id,
          type: d.type,
          status: d.status,
          rejectionReason: d.rejectionReason,
        })),
      });
    }

    // Check if application stage is already updated to interview
    const application = await Application.findOne({ userId });
    if (application && application.stage !== "interview") {
      application.stage = "interview";
      application.status = "interview";
      await application.save();
    }

    // Proceed to next middleware/handler
    next();
  } catch (error) {
    console.error("checkDocumentsComplete error:", error);
    res.status(500).json({
      message: "Error checking document status",
      error: error.message,
    });
  }
};

/**
 * Middleware to validate interview scheduling parameters
 */
const validateInterviewParams = async (req, res, next) => {
  try {
    const { scheduled_at, type, mode } = req.body;

    // Validate scheduled_at
    if (scheduled_at) {
      const scheduledTime = new Date(scheduled_at);
      const now = new Date();

      if (scheduledTime <= now) {
        return res.status(400).json({
          message: "Interview date must be in the future",
        });
      }

      // Check if within reasonable timeframe (e.g., within 90 days)
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);

      if (scheduledTime > maxDate) {
        return res.status(400).json({
          message: "Interview must be scheduled within 90 days",
        });
      }
    }

    // Validate type
    if (type && !["video", "voice_ai", "in_person"].includes(type)) {
      return res.status(400).json({
        message: "Invalid interview type. Must be video, voice_ai, or in_person",
      });
    }

    // Validate mode
    if (mode && !["online", "in_person", "hybrid"].includes(mode)) {
      return res.status(400).json({
        message: "Invalid interview mode. Must be online, in_person, or hybrid",
      });
    }

    next();
  } catch (error) {
    console.error("validateInterviewParams error:", error);
    res.status(500).json({
      message: "Error validating interview parameters",
      error: error.message,
    });
  }
};

/**
 * Middleware to log interview-related activities
 */
const logInterviewActivity = async (req, res, next) => {
  try {
    const ActivityLog = require("../models/ActivityLog");
    const userId = req.user?.id;
    const action = req.body.action || req.method.toLowerCase();

    // Store activity info for later use (after response is sent)
    req.activityToLog = {
      userId,
      action,
      metadata: {
        endpoint: req.path,
        method: req.method,
      },
    };

    next();
  } catch (error) {
    console.error("logInterviewActivity error:", error);
    next(); // Don't block if logging fails
  }
};

module.exports = {
  checkDocumentsComplete,
  validateInterviewParams,
  logInterviewActivity,
};
