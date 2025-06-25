const express = require("express");
const router = express.Router();
const { News, Poll } = require("../models");
const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');
const parser = new Parser();

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

// 실시간 뉴스 가져오기 (키워드, 날짜, 언어, 정렬 등 쿼리 지원)
router.get('/realtime', async (req, res) => {
  try {
    const { q, from, to, language, sortBy, pageSize, country, category } = req.query;
    const params = {
      apiKey: '72c5ca55d2f14d0485498befb41eaf02',
      pageSize: pageSize || 20
    };
    if (q) params.q = q;
    if (from) params.from = from;
    if (to) params.to = to;
    if (language) params.language = language;
    if (sortBy) params.sortBy = sortBy;
    if (country) params.country = country;
    if (category) params.category = category;

    // 기본값: 한국 헤드라인 뉴스
    const url = q || from || to || language || sortBy || category
      ? 'https://newsapi.org/v2/everything'
      : 'https://newsapi.org/v2/top-headlines';
    if (!q && !country) params.country = 'kr';

    const response = await axios.get(url, { params });
    return res.json({ articles: response.data.articles });
  } catch (error) {
    console.error('Error fetching news:', error.message);
    return res.status(500).json({ message: '뉴스를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 네이버 뉴스 인기기사 상위 15개 크롤링 API
router.get('/naver', async (req, res) => {
  try {
    const response = await axios.get('https://news.naver.com/main/ranking/popularDay.naver');
    const $ = cheerio.load(response.data);
    const articles = [];
    $('.rankingnews_box .list_content li').each((i, el) => {
      if (i >= 15) return false;
      const $el = $(el);
      const title = $el.find('a').text().trim();
      const url = 'https://news.naver.com' + $el.find('a').attr('href');
      const image = $el.find('img').attr('src');
      const summary = $el.find('.lede').text().trim() || '';
      articles.push({ title, url, image, summary });
    });
    res.json({ articles });
  } catch (error) {
    console.error('네이버 뉴스 크롤링 실패:', error.message);
    res.status(500).json({ message: '네이버 뉴스 크롤링 실패', error: error.message });
  }
});

// 구글 뉴스 주요 뉴스 상위 15개 RSS 파싱 API
router.get('/google', async (req, res) => {
  try {
    const feed = await parser.parseURL('https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko');
    const articles = feed.items.slice(0, 15).map(item => ({
      title: item.title,
      url: item.link,
      summary: item.contentSnippet,
      pubDate: item.pubDate
    }));
    res.json({ articles });
  } catch (error) {
    console.error('구글 뉴스 RSS 파싱 실패:', error.message);
    res.status(500).json({ message: '구글 뉴스 RSS 파싱 실패', error: error.message });
  }
});

// 뉴스 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const news = await News.findByPk(req.params.id);
    if (!news) return res.status(404).json({ message: '뉴스를 찾을 수 없습니다.' });
    res.json(news);
  } catch (err) {
    res.status(500).json({ message: '뉴스 상세 조회 실패', error: err.message });
  }
});

module.exports = router; 