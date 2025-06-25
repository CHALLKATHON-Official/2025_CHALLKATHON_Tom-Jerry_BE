const express = require("express");
const router = express.Router();
const { News, Poll } = require("../models");
const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');
const parser = new Parser();
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/facebook/bart-large-cnn';
const HUGGINGFACE_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN;
const fetch = require('node-fetch');
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const https = require('https');

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

// 네이버 뉴스 오픈 API를 활용한 뉴스 검색 (비로그인 오픈 API)
router.get('/naver-open', async (req, res) => {
  try {
    const query = encodeURIComponent(req.query.query || '미국증시');
    const display = encodeURIComponent(req.query.display || '10');
    const api_url = `https://openapi.naver.com/v1/search/news.json?query=${query}&display=${display}`;

    const options = {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      }
    };

    https.get(api_url, options, (apiRes) => {
      let body = '';
      apiRes.on('data', (chunk) => { body += chunk; });
      apiRes.on('end', async () => {
        if (apiRes.statusCode === 200) {
          try {
            const json = JSON.parse(body);
            // DB 저장 로직 추가 (중복 저장 방지, url 기준)
            if (Array.isArray(json.items)) {
              for (const item of json.items) {
                const url = (item.link || '').slice(0, 255);
                let news = await News.findOne({ where: { url } });
                if (!news) {
                  // 네이버 뉴스는 title, description(요약), url, pubDate, originallink 등 제공
                  await News.create({
                    title: (item.title || '').replace(/<[^>]+>/g, '').slice(0, 255),
                    content: (item.description || '').replace(/<[^>]+>/g, '').slice(0, 1000) || '내용 없음',
                    url,
                    category: ('네이버뉴스').slice(0, 255),
                    image_url: null,
                  });
                }
              }
            }
            res.json(json);
          } catch (e) {
            res.status(500).json({ message: '네이버 뉴스 응답 파싱 실패', error: e.message });
          }
        } else {
          res.status(apiRes.statusCode).json({ message: '네이버 뉴스 API 호출 실패', body });
        }
      });
    }).on('error', (e) => {
      res.status(500).json({ message: '네이버 뉴스 API 호출 중 오류', error: e.message });
    });
  } catch (error) {
    res.status(500).json({ message: '네이버 뉴스 API 호출 중 서버 오류', error: error.message });
  }
});

async function summarizeTextHuggingFace(text, maxLen = 255) {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  if (!HUGGINGFACE_API_TOKEN) return text.slice(0, maxLen); // 토큰 없으면 그냥 자름
  try {
    const response = await fetch(HUGGINGFACE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text })
    });
    const data = await response.json();
    if (Array.isArray(data) && data[0]?.summary_text) {
      return data[0].summary_text.slice(0, maxLen);
    }
    return text.slice(0, maxLen);
  } catch (e) {
    return text.slice(0, maxLen);
  }
}

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