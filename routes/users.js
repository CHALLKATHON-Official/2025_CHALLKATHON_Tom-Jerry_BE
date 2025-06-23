const express = require('express');
const router = express.Router();
const { User, Poll, Response } = require('../models');
const auth = require('../middleware/auth');

// @route   GET api/users/me
// @desc    Get current user's profile, created polls, and participated polls
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        // 1. Get user profile
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] } // Don't send the password hash
        });

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // 2. Get polls created by the user
        const createdPolls = await Poll.findAll({
            where: { creator_id: req.user.id },
            order: [['createdAt', 'DESC']],
            include: [{ model: User, as: 'Creator', attributes: ['nickname'] }]
        });

        // 3. Get polls the user has responded to
        const userResponses = await Response.findAll({
            where: { user_id: req.user.id },
            attributes: ['poll_id'],
            group: ['poll_id']
        });

        const respondedPollIds = userResponses.map(r => r.poll_id);

        const participatedPolls = await Poll.findAll({
            where: {
                poll_id: respondedPollIds
            },
            include: [{ model: User, as: 'Creator', attributes: ['nickname'] }],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            user,
            createdPolls,
            participatedPolls
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router; 