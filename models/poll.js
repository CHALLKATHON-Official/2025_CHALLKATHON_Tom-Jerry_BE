const { DataTypes } = require("sequelize");
const sequelize = require("../config/databaseInstance");

const Poll = sequelize.define(
  "Poll",
  {
    poll_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    creator_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users", // 'users' is the table name for the User model
        key: "user_id",
      },
    },
    category: {
      type: DataTypes.ENUM(
        "정치", "경제", "사회", "생활/문화", "IT/과학", "세계", "엔터", "스포츠"
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    news_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_public_stat: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    respondent_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    news_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "news",
        key: "news_id",
      },
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: 'polls'
  }
);

module.exports = Poll;
