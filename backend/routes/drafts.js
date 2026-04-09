const express = require('express');
const { getDraft, saveDraft, clearDraft, checkDraft } = require('../controllers/draftController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, getDraft);
router.get('/check', verifyToken, checkDraft);
router.post('/', verifyToken, saveDraft);
router.post('/save', verifyToken, saveDraft);
router.delete('/', verifyToken, clearDraft);

module.exports = router;
