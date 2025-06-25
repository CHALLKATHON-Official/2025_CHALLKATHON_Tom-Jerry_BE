const path = require('path');
const dotenv = require('dotenv');

// --- Standard dotenv loading with full debugging ---
const envPath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envPath, debug: true });

if (result.error) {
  console.error('❌ FATAL: dotenv could not parse the .env file. Error:', result.error);
  throw result.error;
}

console.log('✅ dotenv parsed the following variables:');
console.log(result.parsed);
// --- End dotenv debugging ---

const express = require("express");
const cors = require("cors");
const sequelize = require("./config/databaseInstance");
const newsRoutes = require('./routes/news');
const discussionRoutes = require('./routes/discussions');
const userRoutes = require('./routes/users');
const seedData = require('./seedData');
const commentRoutes = require('./routes/comment');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*', // 모든 도메인에서 접근 허용
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// DB 연결
sequelize
  .sync({ force: false })
  .then(async () => {
    console.log("✅ PostgreSQL 연결 성공");
    console.log("📦 DB 테이블이 동기화되었습니다.");
    
    // 시드 데이터 실행 (첫 실행 시에만)
    try {
      await seedData();
    } catch (error) {
      console.log('시드 데이터 실행 중 오류 (무시 가능):', error.message);
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT} and accessible from any IP`);
    });
  })
  .catch((err) => {
    console.error("❌ DB 동기화 실패", err);
  });

// 라우터
app.use("/api/auth", require("./routes/auth"));
app.use("/api/polls", require("./routes/polls"));
app.use("/api/discussions", discussionRoutes);
app.use("/api/news", newsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comment', commentRoutes);
