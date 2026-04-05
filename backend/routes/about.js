const express = require('express');
const adminMiddleware = require('../middleware/admin');
const { verifyToken } = require('../middleware/auth');
const {
  getAbout,
  getAboutSection,
  getAllAboutSections,
  createAboutSection,
  updateAboutSection,
  deleteAboutSection,
  toggleAboutSection,
} = require('../controllers/aboutController');

const router = express.Router();

// ADMIN ROUTES (must come before dynamic public route)

// Get all about sections (including inactive)
router.get('/admin/all', adminMiddleware, getAllAboutSections);

// Create a new about section
router.post('/admin', adminMiddleware, createAboutSection);

// Update an about section
router.put('/admin/:section', adminMiddleware, updateAboutSection);

// Delete an about section
router.delete('/admin/:section', adminMiddleware, deleteAboutSection);

// Toggle about section visibility
router.patch('/admin/:section/toggle', adminMiddleware, toggleAboutSection);

// PUBLIC ROUTES

// Get all active about sections
router.get('/', getAbout);

// Get a specific about section
router.get('/:section', getAboutSection);
// Create a new about section
router.post('/admin', adminMiddleware, createAboutSection);

// Update an about section
router.put('/admin/:section', adminMiddleware, updateAboutSection);

// Delete an about section
router.delete('/admin/:section', adminMiddleware, deleteAboutSection);

// Toggle about section visibility
router.patch('/admin/:section/toggle', adminMiddleware, toggleAboutSection);

module.exports = router;
