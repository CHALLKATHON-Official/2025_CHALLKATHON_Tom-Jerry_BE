const express = require("express");
const router = express.Router();
const { Discussion, Poll, User, Comment } = require("../models");

// TODO: Add authentication middleware to get author_id from token

// Create a new discussion for a poll
router.post("/", async (req, res) => {
  const { poll_id, author_id, title, content } = req.body;

  if (!poll_id || !author_id || !title || !content) {
    return res
      .status(400)
      .json({ message: "poll_id, author_id, title, and content are required." });
  }

  try {
    // Check if the poll exists
    const poll = await Poll.findByPk(poll_id);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found." });
    }

    // Create the discussion
    const newDiscussion = await Discussion.create({
      poll_id,
      author_id,
      title,
      content,
    });

    return res.status(201).json(newDiscussion);
  } catch (error) {
    console.error("Error creating discussion:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// Get a single discussion by ID with comments
router.get("/:discussionId", async (req, res) => {
  const { discussionId } = req.params;
  try {
    const discussion = await Discussion.findByPk(discussionId, {
      include: [
        { model: User, as: 'Author', attributes: ['nickname'] },
        { 
          model: Comment, 
          include: [{ model: User, as: 'Author', attributes: ['nickname'] }] 
        }
      ],
      order: [[Comment, 'createdAt', 'ASC']],
    });

    if (!discussion) {
      return res.status(404).json({ message: "Discussion not found." });
    }
    return res.status(200).json(discussion);
  } catch (error) {
    console.error(`Error fetching discussion ${discussionId}:`, error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// Post a new comment to a discussion
router.post("/:discussionId/comments", async (req, res) => {
  const { discussionId } = req.params;
  const { author_id, content } = req.body;

  if (!author_id || !content) {
    return res.status(400).json({ message: "author_id and content are required." });
  }

  try {
    // Check if discussion exists
    const discussion = await Discussion.findByPk(discussionId);
    if (!discussion) {
      return res.status(404).json({ message: "Discussion not found." });
    }

    const newComment = await Comment.create({
      discussion_id: discussionId,
      author_id,
      content,
    });

    return res.status(201).json(newComment);
  } catch (error) {
    console.error(`Error posting comment to discussion ${discussionId}:`, error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

module.exports = router; 