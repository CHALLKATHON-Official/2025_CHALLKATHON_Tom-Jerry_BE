const { DataTypes } = require("sequelize");
const sequelize = require("../config/databaseInstance");

const News = sequelize.define(
  "News",
  {
    news_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    poll_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "polls",
        key: "poll_id",
      },
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: 'news'
  }
);

module.exports = News; 