const express = require('express');
const { protect, authorize } = require('../middleware/auth');
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
router.get('/admin/all', protect, authorize('admin'), getAllAboutSections);

// Create a new about section
router.post('/admin', protect, authorize('admin'), createAboutSection);

// Update an about section
router.put('/admin/:section', protect, authorize('admin'), updateAboutSection);

// Delete an about section
router.delete('/admin/:section', protect, authorize('admin'), deleteAboutSection);

// Toggle about section visibility
router.patch('/admin/:section/toggle', protect, authorize('admin'), toggleAboutSection);

// PUBLIC ROUTES

// Get all active about sections
router.get('/', getAbout);

// Get a specific about section
router.get('/:section', getAboutSection);
// Create a new about section
router.post('/admin', protect, authorize('admin'), createAboutSection);

// Update an about section
router.put('/admin/:section', protect, authorize('admin'), updateAboutSection);

// Delete an about section
router.delete('/admin/:section', protect, authorize('admin'), deleteAboutSection);

// Toggle about section visibility
router.patch('/admin/:section/toggle', protect, authorize('admin'), toggleAboutSection);

module.exports = router;
