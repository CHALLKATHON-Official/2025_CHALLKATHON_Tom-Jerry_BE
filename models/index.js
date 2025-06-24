// backend/models/index.js
const sequelize = require("../config/databaseInstance");
const User = require("./user");
const Poll = require("./poll");
const Option = require("./option");
const Response = require("./response");
const News = require("./news");
const Discussion = require("./discussion");
const Comment = require("./comment");
const Transaction = require("./transaction");

const db = {};

db.sequelize = sequelize;
db.User = User;
db.Poll = Poll;
db.Option = Option;
db.Response = Response;
db.News = News;
db.Discussion = Discussion;
db.Comment = Comment;
db.Transaction = Transaction;

// User-Poll relationship
User.hasMany(Poll, { foreignKey: 'creator_id' });
Poll.belongsTo(User, { as: 'Creator', foreignKey: 'creator_id' });

// Poll-Option relationship
Poll.hasMany(Option, { foreignKey: 'poll_id', onDelete: 'CASCADE' });
Option.belongsTo(Poll, { foreignKey: 'poll_id' });

// User-Response relationship
User.hasMany(Response, { foreignKey: 'user_id' });
Response.belongsTo(User, { foreignKey: 'user_id' });

// Poll-Response relationship
Poll.hasMany(Response, { foreignKey: 'poll_id' });
Response.belongsTo(Poll, { foreignKey: 'poll_id' });

// Option-Response relationship
Option.hasMany(Response, { foreignKey: 'option_id' });
Response.belongsTo(Option, { foreignKey: 'option_id' });

// User-Discussion relationship
User.hasMany(Discussion, { foreignKey: 'author_id' });
Discussion.belongsTo(User, { as: 'Author', foreignKey: 'author_id' });

// Poll-Discussion relationship
Poll.hasMany(Discussion, { foreignKey: 'poll_id' });
Discussion.belongsTo(Poll, { foreignKey: 'poll_id' });

// User-Comment relationship
User.hasMany(Comment, { foreignKey: 'author_id' });
Comment.belongsTo(User, { as: 'Author', foreignKey: 'author_id' });

// Discussion-Comment relationship
Discussion.hasMany(Comment, { foreignKey: 'discussion_id', onDelete: 'CASCADE' });
Comment.belongsTo(Discussion, { foreignKey: 'discussion_id' });

// Poll-Transaction relationship
Poll.hasMany(Transaction, { foreignKey: 'poll_id' });
Transaction.belongsTo(Poll, { foreignKey: 'poll_id' });

// User-Transaction relationship
User.hasMany(Transaction, { as: 'Purchases', foreignKey: 'buyer_id' });
User.hasMany(Transaction, { as: 'Sales', foreignKey: 'seller_id' });
Transaction.belongsTo(User, { as: 'Buyer', foreignKey: 'buyer_id' });
Transaction.belongsTo(User, { as: 'Seller', foreignKey: 'seller_id' });

// Poll-Comment relationship
Poll.hasMany(Comment, { foreignKey: 'poll_id' });
Comment.belongsTo(Poll, { foreignKey: 'poll_id' });

module.exports = db;
