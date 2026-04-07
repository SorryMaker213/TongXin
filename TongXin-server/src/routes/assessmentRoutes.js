const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');

router.get('/catalog', assessmentController.getCatalog);
router.get('/tests/:toolKey', assessmentController.getTestDetails);
router.get('/content/:toolKey', assessmentController.getTestContent);
router.post('/submit', assessmentController.submitTest);
router.get('/history', assessmentController.getHistory);
router.get('/history/:id', assessmentController.getHistoryDetails);
router.delete('/history/:id', assessmentController.deleteHistory);

module.exports = router;
