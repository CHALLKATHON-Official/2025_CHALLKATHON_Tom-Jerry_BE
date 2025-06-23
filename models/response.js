const { DataTypes } = require("sequelize");
const sequelize = require("../config/databaseInstance");

const Response = sequelize.define(
  "Response",
  {
    response_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    poll_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "polls",
        key: "poll_id",
      },
    },
    option_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "options",
        key: "option_id",
      },
    },
  },
  {
    timestamps: true, // created_at will be used as responded_at
    updatedAt: false, // No need for an updated_at field
    underscored: true,
    tableName: 'responses',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'poll_id']
      }
    ]
  }
);

module.exports = Response;
