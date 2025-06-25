const express = require('express');
const router = express.Router();
const { User, Poll, Response } = require('../models');
const authMiddleware = require('../middleware/auth');

// @route   GET api/users/me
// @desc    Get current user's profile, created polls, and participated polls
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: '내 정보 조회 실패', error: err.message });
    }
});

// 내가 만든 여론조사
router.get('/me/polls', authMiddleware, async (req, res) => {
    try {
        const polls = await Poll.findAll({
            where: { creator_id: req.user.id },
            order: [['created_at', 'DESC']]
        });
        res.json(polls);
    } catch (err) {
        res.status(500).json({ message: '내가 만든 여론조사 조회 실패', error: err.message });
    }
});

// 내가 참여한 여론조사
router.get('/me/participated', authMiddleware, async (req, res) => {
    try {
        const responses = await Response.findAll({
            where: { user_id: req.user.id },
            attributes: ['poll_id'],
            group: ['poll_id']
        });
        const pollIds = responses.map(r => r.poll_id);
        const polls = await Poll.findAll({
            where: { poll_id: pollIds },
            order: [['created_at', 'DESC']]
        });
        res.json(polls);
    } catch (err) {
        res.status(500).json({ message: '내가 참여한 여론조사 조회 실패', error: err.message });
    }
});

module.exports = router; 