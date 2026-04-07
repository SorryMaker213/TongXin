const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/session', chatController.createSession);
router.get('/sessions', chatController.getSessions);
router.delete('/session/:sessionId', chatController.deleteSession);
router.post('/rag/reindex', chatController.reindexManualRag);
router.get('/:sessionId', chatController.getMessages);
router.post('/', chatController.sendMessage);

module.exports = router;
