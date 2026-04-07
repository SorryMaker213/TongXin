const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const chatRoutes = require('./chatRoutes');
const emotionRoutes = require('./emotionRoutes');
const assessmentRoutes = require('./assessmentRoutes');

router.use('/auth', authRoutes);
router.use('/messages', chatRoutes);
router.use('/emotions', emotionRoutes);
router.use('/assessments', assessmentRoutes);

module.exports = router;
