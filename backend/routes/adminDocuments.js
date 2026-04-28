const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const { permit } = require("../middleware/permission");

const {
  getAllDocuments,
  getAllApplications,
  getUserDocumentsAndApplication,
  checkInterviewEligibility,
  overrideInterviewLock,
  bulkReviewDocuments,
} = require("../controllers/adminDocumentController");

// 🔐 All admin routes require authentication and admin role
router.use(protect, authorize("admin"));

/**
 * Admin Document Management Routes
 */

// GET all documents with filters
// GET /api/admin/documents?status=pending&type=passport&sortBy=createdAt
router.get("/documents", getAllDocuments);

// GET all applications with filters
// GET /api/admin/applications?status=pending&stage=documents
router.get("/applications", getAllApplications);

// GET specific user's documents and application
// GET /api/admin/users/:userId
router.get("/users/:userId", getUserDocumentsAndApplication);

// GET interview eligibility for a user
// GET /api/admin/users/:userId/interview-eligibility
router.get("/users/:userId/interview-eligibility", checkInterviewEligibility);

// PUT override interview lock for a user
// PUT /api/admin/users/:userId/override-interview-lock
router.put("/users/:userId/override-interview-lock", overrideInterviewLock);

// PUT bulk review documents
// PUT /api/admin/documents/bulk-review
router.put("/documents/bulk-review", bulkReviewDocuments);

module.exports = router;
