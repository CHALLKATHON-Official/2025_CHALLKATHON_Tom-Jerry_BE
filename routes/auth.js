const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { User } = require("../models"); // ../models/index.js
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

// 회원가입
router.post("/register", async (req, res) => {
  const {
    real_name,
    nickname,
    gender,
    birth_date,
    region,
    job,
    password,
    interest_categories, // Array of categories
    phone_number,
  } = req.body;

  // Validate required fields
  if (!real_name || !nickname || !gender || !birth_date || !region || !job || !password || !interest_categories || !phone_number) {
    return res.status(400).json({ message: "모든 필드를 입력해주세요." });
  }

  // Validate phone number format (010-xxxx-xxxx)
  const phoneRegex = /^010-\d{4}-\d{4}$/;
  if (!phoneRegex.test(phone_number)) {
    return res.status(400).json({ message: "휴대폰 번호 형식이 올바르지 않습니다. (010-xxxx-xxxx)" });
  }

  // Validate interest_categories (max 3)
  if (!Array.isArray(interest_categories) || interest_categories.length !== 3) {
    return res.status(400).json({ message: "관심 카테고리는 3개만 선택해야 합니다." });
  }

  console.log('[회원가입] 요청:', phone_number, real_name, nickname);

  try {
    // Check if nickname or phone_number already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { nickname },
          { phone_number },
        ],
      },
    });
    if (existingUser) {
      console.log('[회원가입] 이미 존재하는 사용자:', phone_number, nickname);
      return res.status(409).json({ message: "닉네임 또는 휴대폰 번호가 이미 사용 중입니다." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await User.create({
      real_name,
      nickname,
      gender,
      birth_date,
      region,
      job,
      password: hashedPassword,
      interest_categories,
      phone_number,
    });

    const userResponse = newUser.toJSON();
    delete userResponse.password;

    console.log('[회원가입] 성공:', phone_number, nickname);

    return res.status(201).json({
      message: "회원가입 성공",
      data: userResponse,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// 로그인
router.post("/login", async (req, res) => {
  const { phone_number, password } = req.body;
  console.log('[로그인] 시도:', phone_number);

  if (!phone_number || !password) {
    return res.status(400).json({ message: "휴대폰 번호와 비밀번호를 입력해주세요." });
  }

  try {
    // Find user by phone_number
    const user = await User.findOne({ where: { phone_number } });
    if (!user) {
      console.log('[로그인] 실패 - 사용자 없음:', phone_number);
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('[로그인] 실패 - 비밀번호 불일치:', phone_number);
      return res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });
    }

    // Create JWT
    const payload = {
      user: {
        id: user.user_id,
        nickname: user.nickname,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_default_secret', { expiresIn: '1h' });

    console.log('[로그인] 성공:', phone_number);

    res.json({ token });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// 토큰 검증
router.get("/verify", async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: "토큰이 없습니다." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret');
    const user = await User.findByPk(decoded.user.id);
    
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ message: "유효하지 않은 토큰입니다." });
  }
});

router.get('/login', (req, res) => {
  res.status(405).json({ message: '로그인은 POST 요청으로만 가능합니다.' });
});

router.get('/', (req, res) => {
  res.status(405).json({ message: '이 경로는 직접 접근할 수 없습니다. 하위 엔드포인트를 이용하세요.' });
});

module.exports = router;
