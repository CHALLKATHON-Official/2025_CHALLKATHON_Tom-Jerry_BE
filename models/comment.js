const { DataTypes } = require("sequelize");
const sequelize = require("../config/databaseInstance");

const Comment = sequelize.define(
  "Comment",
  {
    comment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    discussion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "discussions",
        key: "discussion_id",
      },
    },
    author_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    parent_comment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "comments",
        key: "comment_id",
      },
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
    tableName: 'comments'
  }
);

module.exports = Comment; 