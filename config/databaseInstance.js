// backend/config/databaseInstance.js
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME || 'challkathon_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'aldud7015!',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false, // SQL 로그 출력 끄기
  }
);

module.exports = sequelize;
