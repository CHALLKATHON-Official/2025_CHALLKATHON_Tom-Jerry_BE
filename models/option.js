const { DataTypes } = require("sequelize");
const sequelize = require("../config/databaseInstance");

const Option = sequelize.define(
  "Option",
  {
    option_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    poll_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "polls", // 'polls' is the table name for the Poll model
        key: "poll_id",
      },
    },
    option_text: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: false, // No created_at or updated_at for options
    underscored: true,
    tableName: 'options'
  }
);

module.exports = Option;
