const express = require("express");
const router = express.Router();
const { News, Poll } = require("../models");
const axios = require('axios');

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

// 실시간 뉴스 가져오기
router.get('/realtime', async (req, res) => {
  try {
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        country: 'kr', // 한국 뉴스
        apiKey: '72c5ca55d2f14d0485498befb41eaf02',
        pageSize: 20
      }
    });
    return res.json({ articles: response.data.articles });
  } catch (error) {
    console.error('Error fetching news:', error.message);
    return res.status(500).json({ message: '뉴스를 불러오는 중 오류가 발생했습니다.' });
  }
});

module.exports = router; 