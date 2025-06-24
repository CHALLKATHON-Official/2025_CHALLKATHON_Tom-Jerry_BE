const express = require('express');
const router = express.Router();
const { User, Poll, Response } = require('../models');
const authMiddleware = require('../middleware/auth');

// @route   GET api/users/me
// @desc    Get current user's profile, created polls, and participated polls
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
    // 구현 예정
});

// 내가 만든 여론조사
router.get('/me/polls', authMiddleware, async (req, res) => {
    // 구현 예정
});

// 내가 참여한 여론조사
router.get('/me/participated', authMiddleware, async (req, res) => {
    // 구현 예정
});

module.exports = router; 