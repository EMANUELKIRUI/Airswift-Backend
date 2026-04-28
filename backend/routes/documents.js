const express = require("express");
const router = express.Router();
const { verifyToken, protect, authorize } = require("../middleware/auth");
const permit = require("../middleware/permission");
const { cloudUpload } = require("../middleware/cloudinaryUpload");
const {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
  reviewDocument,
} = require("../controllers/documentController");

// ✅ User routes (require authentication)
router.use(verifyToken);

// Upload document - POST /api/documents/upload
router.post("/upload", cloudUpload.single("file"), uploadDocument);

// Get all user's documents - GET /api/documents
router.get("/", getDocuments);

// Get single document - GET /api/documents/:id
router.get("/:id", getDocument);

// Delete document - DELETE /api/documents/:id
router.delete("/:id", deleteDocument);

// ✅ Admin routes (require protection and admin role + permission)
// Review document (admin) - PUT /api/documents/:id/review
router.put("/:id/review", protect, authorize("admin"), permit("manage_documents"), reviewDocument);

module.exports = router;
