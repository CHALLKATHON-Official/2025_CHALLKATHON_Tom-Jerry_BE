const express = require("express");
const router = express.Router();
const { News, Poll } = require("../models");

// Get all news articles with pagination
router.get("/", async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const { count, rows } = await News.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });
    
    return res.status(200).json({
      total: count,
      news: rows,
    });

  } catch (error) {
    console.error("Error fetching news:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// 기사 상세
router.get('/:id', async (req, res) => {
  // 구현 예정
});

module.exports = router; 