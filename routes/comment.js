const express = require('express');
const router = express.Router();
const Comment = require('../models/comment');

// 모든 댓글 조회 또는 poll_id로 필터링
router.get('/', async (req, res) => {
  try {
    const { poll_id } = req.query;
    const where = poll_id ? { poll_id } : {};
    const comments = await Comment.findAll({ where, order: [['created_at', 'DESC']] });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: '댓글 조회 실패', error: err.message });
  }
});

// 댓글 생성
router.post('/', async (req, res) => {
  try {
    const { content, author_id, discussion_id, poll_id, parent_comment_id } = req.body;
    const comment = await Comment.create({ content, author_id, discussion_id, poll_id, parent_comment_id });
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: '댓글 생성 실패', error: err.message });
  }
});

router.get('/:id', (req, res) => {
  res.status(405).json({ message: '이 API는 GET /:id로는 지원되지 않습니다.' });
});

module.exports = router; 