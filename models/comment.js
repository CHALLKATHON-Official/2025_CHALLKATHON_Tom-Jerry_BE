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
  },
  {
    timestamps: true,
    underscored: true,
    tableName: 'comments'
  }
);

module.exports = Comment; 