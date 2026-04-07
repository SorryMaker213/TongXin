const express = require('express');
const router = express.Router();
const emotionController = require('../controllers/emotionController');

router.get('/', emotionController.getEmotions);
router.post('/', emotionController.saveEmotion);
router.delete('/reset', emotionController.resetEmotions);

module.exports = router;
