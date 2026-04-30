const Document = require("../models/Document");
const ActivityLog = require("../models/ActivityLog");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Application = require("../models/ApplicationMongoose");

/**
 * Upload a document
 * POST /api/documents/upload
 */
exports.uploadDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!req.file.mimetype || !allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Invalid document type. Only PDF, DOC, and DOCX files are allowed.' });
    }

    if (!type || !["passport", "cv", "certificate", "cover_letter", "photo"].includes(type)) {
      return res.status(400).json({ message: "Invalid document type" });
    }

    // Create document record
    const document = await Document.create({
      userId,
      type,
      fileUrl: req.file.path || req.file.location, // Multer path or S3 location
      fileType: req.file.mimetype,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: "pending",
      uploadedAt: new Date(),
    });

    // Log activity
    await ActivityLog.create({
      userId,
      action: "uploaded_document",
      description: `Uploaded ${type} document`,
      metadata: {
        documentId: document._id,
        documentType: type,
      },
    });

    // Create notification for admins
    const admins = await User.find({ role: "admin" });
    const notifications = admins.map((admin) => ({
      userId: admin._id,
      title: "New Document Upload",
      message: `${req.user.name} uploaded a new ${type} document`,
      type: "document",
      link: `/admin/documents/${document._id}`,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      // Emit socket notification to admins - broadcast to all connected users
      if (global.io) {
        admins.forEach((admin) => {
          global.io.to(`user_${admin._id}`).emit("notification", {
            title: "New Document Upload",
            message: `${req.user.name} uploaded a new ${type} document`,
            type: "document",
            documentId: document._id,
          });
        });
      }
    }

    res.status(201).json({
      message: "Document uploaded successfully",
      document,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    res.status(500).json({
      message: "Error uploading document",
      error: error.message,
    });
  }
};

/**
 * Get all documents for a user
 * GET /api/documents
 */
exports.getDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const documents = await Document.find({ userId }).sort({ uploadedAt: -1 });

    res.json({
      message: "Documents retrieved successfully",
      documents,
    });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({
      message: "Error retrieving documents",
      error: error.message,
    });
  }
};

/**
 * Get a single document by ID
 * GET /api/documents/:id
 */
exports.getDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Check authorization - user can view only their own documents, admins can view all
    if (document.userId.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json({
      message: "Document retrieved successfully",
      document,
    });
  } catch (error) {
    console.error("Get document error:", error);
    res.status(500).json({
      message: "Error retrieving document",
      error: error.message,
    });
  }
};

/**
 * Review document (Admin only)
 * PUT /api/documents/:id/review
 */
exports.reviewDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, feedback } = req.body;
    const adminId = req.user.id;

    // Validate status
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'rejected'" });
    }

    const document = await Document.findByIdAndUpdate(
      id,
      {
        status,
        rejectionReason: status === "rejected" ? rejectionReason : null,
        feedback: feedback || null,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Log activity
    await ActivityLog.create({
      userId: document.userId,
      action: status === "approved" ? "document_approved" : "document_rejected",
      description: `${status} ${document.type} document`,
      metadata: {
        documentId: document._id,
        documentType: document.type,
        reviewedBy: adminId,
      },
    });

    // Create notification for user
    const notificationMessage =
      status === "approved"
        ? `Your ${document.type} document has been approved`
        : `Your ${document.type} document was rejected${feedback ? `: ${feedback}` : rejectionReason ? `: ${rejectionReason}` : '.'}`;

    const notification = await Notification.create({
      userId: document.userId,
      title: status === "approved" ? "Document Approved" : "Document Rejected",
      message: notificationMessage,
      type: "document",
      link: `/documents/${document._id}`,
    });

    // Emit socket notification to user
    if (global.io) {
      global.io.to(`user_${document.userId}`).emit("notification", {
        title: status === "approved" ? "Document Approved" : "Document Rejected",
        message: notificationMessage,
        type: "document",
        documentId: document._id,
        status: status,
      });
    }

    // 🔑 CHECK IF ALL DOCUMENTS APPROVED - Auto-update application stage
    if (status === "approved") {
      const allDocuments = await Document.find({ userId: document.userId });
      const allApproved = allDocuments.every((d) => d.status === "approved");

      if (allApproved) {
        // Update application to interview stage
        const application = await Application.findOne({ userId: document.userId });
        if (application) {
          application.status = "interview"; // or "shortlisted" depending on your flow
          application.stage = "interview";
          await application.save();

          // Log activity
          await ActivityLog.create({
            userId: document.userId,
            action: "application_approved",
            description: "All documents approved. Application moved to interview stage.",
            metadata: {
              applicationId: application._id,
              previousStatus: "pending",
              newStatus: "interview",
            },
          });

          // Notify user that they can now schedule interview
          const interviewNotification = await Notification.create({
            userId: document.userId,
            title: "Documents Complete! Ready for Interview",
            message: "All your documents have been approved. You can now schedule your interview.",
            type: "interview",
            link: `/interviews/schedule`,
          });

          // Emit socket notification
          if (global.io) {
            global.io.to(`user_${document.userId}`).emit("notification", {
              title: "Documents Complete! Ready for Interview",
              message: "All your documents have been approved. You can now schedule your interview.",
              type: "interview",
              applicationId: application._id,
            });
          }
        }
      }
    }

    res.json({
      message: `Document ${status} successfully`,
      document,
    });
  } catch (error) {
    console.error("Review document error:", error);
    res.status(500).json({
      message: "Error reviewing document",
      error: error.message,
    });
  }
};

/**
 * Delete a document
 * DELETE /api/documents/:id
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Check authorization - user can delete only their own documents
    if (document.userId.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Document.findByIdAndDelete(id);

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({
      message: "Error deleting document",
      error: error.message,
    });
  }
};
