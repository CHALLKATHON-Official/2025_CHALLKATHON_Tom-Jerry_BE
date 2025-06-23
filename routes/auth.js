const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { User } = require("../models"); // ../models/index.js
const jwt = require("jsonwebtoken");

router.post("/register", async (req, res) => {
  const {
    real_name,
    nickname,
    gender,
    birth_date,
    region,
    job,
    password,
    interest_categories, // Assuming this comes from the request
  } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { nickname } });
    if (existingUser) {
      return res.status(409).json({ message: "Nickname already in use." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

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
    });

    // Don't send password back in the response
    const userResponse = newUser.toJSON();
    delete userResponse.password;

    return res.status(201).json({
      message: "회원가입 성공",
      data: userResponse,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// Login a user
router.post("/login", async (req, res) => {
  const { nickname, password } = req.body;

  if (!nickname || !password) {
    return res.status(400).json({ message: "Nickname and password are required." });
  }

  try {
    // Find user by nickname
    const user = await User.findOne({ where: { nickname } });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Create JWT
    const payload = {
      user: {
        id: user.user_id,
        nickname: user.nickname,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_default_secret', { expiresIn: '1h' });

    res.json({ token });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

module.exports = router;
