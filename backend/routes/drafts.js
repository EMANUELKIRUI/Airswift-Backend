const express = require('express');
const { getDraft, saveDraft, clearDraft, checkDraft } = require('../controllers/draftController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, getDraft);
router.get('/check', authMiddleware, checkDraft);
router.post('/', authMiddleware, saveDraft);
router.post('/save', authMiddleware, saveDraft);
router.delete('/', authMiddleware, clearDraft);

module.exports = router;
