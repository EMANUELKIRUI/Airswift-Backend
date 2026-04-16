const express = require('express');
const router = express.Router();

const { stkPush } = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/auth');

console.log("TYPE OF stkPush:", typeof stkPush);

router.post('/pay', verifyToken, stkPush); // ✅ Protected with authentication

module.exports = router;