const express = require('express');
const router = express.Router();

const { stkPush } = require('../controllers/paymentController');

console.log("TYPE OF stkPush:", typeof stkPush);

router.post('/pay', stkPush); // ✅ must be a function

module.exports = router;