const express = require("express");
const router = express.Router();
const { Poll, Option, sequelize, User, Response, Discussion } = require("../models");
const auth = require('../middleware/auth'); // Import auth middleware

// TODO: Add authentication middleware to get creator_id from token

// Create a new poll
router.post("/", auth, async (req, res) => { // Apply auth middleware
  console.log("--- Poll Creation Request Received ---");
  console.log("Request Body:", JSON.stringify(req.body, null, 2));
  console.log("Authenticated User ID:", req.user.id);

  const {
    category = 'General', // Default category if not provided
    title,
    description, // Assuming description might be sent from frontend
    deadline, // Changed from expires_at to match frontend
    options, // An array of objects, e.g., [{ content: "Option 1" }, { content: "Option 2" }]
  } = req.body;

  // Basic validation
  if (!title || !options || !Array.isArray(options) || options.length < 2 || options.some(opt => !opt.content)) {
    console.error("Validation failed for input:", { title, options });
    return res.status(400).json({
      message: "Title and at least two options with content are required.",
    });
  }

  const t = await sequelize.transaction();
  console.log("Database transaction started.");

  try {
    const pollData = {
      creator_id: req.user.id, // Use ID from authenticated user
      category,
      title,
      description,
      expires_at: deadline, // Map deadline to expires_at
    };
    console.log("Creating poll with data:", JSON.stringify(pollData, null, 2));

    const newPoll = await Poll.create(pollData, { transaction: t });
    console.log("Poll created successfully. Poll ID:", newPoll.poll_id);

    // Create the options
    const optionDocs = options.map((opt) => ({
      poll_id: newPoll.poll_id,
      option_text: opt.content, // Use content from the option object
    }));
    console.log("Creating options with data:", JSON.stringify(optionDocs, null, 2));

    await Option.bulkCreate(optionDocs, { transaction: t });
    console.log("Options created successfully.");

    // Commit the transaction
    await t.commit();
    console.log("Transaction committed successfully.");
    
    // Refetch the poll with its options to return
    const result = await Poll.findByPk(newPoll.poll_id, {
        include: [{ model: Option }]
    });

    return res.status(201).json(result);
  } catch (error) {
    // Rollback the transaction
    await t.rollback();
    console.error("---!!! ERROR DURING POLL CREATION !!!---");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    console.error("-----------------------------------------");
    return res.status(500).json({ message: "서버 오류가 발생했습니다.", error: error.message });
  }
});

// Get all polls with pagination
router.get("/", async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const { count, rows } = await Poll.findAndCountAll({
      include: [
        {
          model: User,
          as: 'Creator',
          attributes: ['nickname'] // Only get the nickname
        },
        {
          model: Option, // Include options for each poll
        }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });
    
    return res.status(200).json({
      total: count,
      polls: rows,
    });

  } catch (error) {
    console.error("Error fetching polls:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// Get a single poll by ID
router.get("/:id", async (req, res) => {
  const pollId = req.params.id;

  try {
    const poll = await Poll.findByPk(pollId, {
      include: [
        {
          model: User,
          as: 'Creator',
          attributes: ['user_id', 'nickname']
        },
        {
          model: Option,
          attributes: {
            include: [
              [
                sequelize.literal(`(
                  SELECT COUNT(*)
                  FROM responses AS r
                  WHERE
                    r.option_id = "Option".option_id
                )`),
                'response_count'
              ]
            ]
          }
        }
      ]
    });

    if (!poll) {
      return res.status(404).json({ message: "Poll not found." });
    }

    return res.status(200).json(poll);

  } catch (error) {
    console.error(`Error fetching poll ${pollId}:`, error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// Vote on a poll
router.post("/:id/responses", async (req, res) => {
  const pollId = req.params.id;
  const { user_id, option_id } = req.body; // user_id should come from auth

  if (!user_id || !option_id) {
    return res.status(400).json({ message: "user_id and option_id are required." });
  }

  try {
    // 1. Check if poll exists and is active
    const poll = await Poll.findByPk(pollId);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found." });
    }
    if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
      return res.status(403).json({ message: "This poll has expired." });
    }

    // 2. Check if the chosen option belongs to this poll
    const option = await Option.findOne({ where: { option_id, poll_id: pollId } });
    if (!option) {
        return res.status(400).json({ message: "This option does not belong to the poll." });
    }

    // 3. Create the response (unique constraint on [user_id, poll_id] will prevent duplicates)
    const newResponse = await Response.create({
      user_id,
      poll_id: pollId,
      option_id,
    });

    return res.status(201).json(newResponse);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'You have already voted on this poll.' });
    }
    console.error(`Error voting on poll ${pollId}:`, error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// Get detailed results for a poll
router.get("/:id/results", async (req, res) => {
  const pollId = req.params.id;
  const { groupBy } = req.query; // e.g., 'gender', 'region', 'job'

  const allowedGroupBy = ['gender', 'region', 'job']; // Add age range later
  if (!groupBy || !allowedGroupBy.includes(groupBy)) {
    return res.status(400).json({ message: `Invalid or missing groupBy parameter. Allowed values: ${allowedGroupBy.join(', ')}` });
  }
  
  // TODO: Add authorization check here (is user the creator or has purchased?)

  try {
    const results = await Response.findAll({
      where: { poll_id: pollId },
      attributes: [
        [sequelize.col(`"User"."${groupBy}"`), groupBy],
        [sequelize.col('"Option"."option_text"'), 'option_text'],
        [sequelize.fn('COUNT', sequelize.col('Response.response_id')), 'count'],
      ],
      include: [
        {
          model: User,
          attributes: [], // We only need the user's demographic data for grouping
        },
        {
          model: Option,
          attributes: [], // We only need the option_text for grouping
        }
      ],
      group: [
        `"User"."${groupBy}"`,
        '"Option"."option_text"',
      ],
      order: [
        [sequelize.col(`"User"."${groupBy}"`), 'ASC'],
        [sequelize.col('"Option"."option_text"'), 'ASC'],
      ],
      raw: true,
    });
    
    if (!results || results.length === 0) {
        return res.status(404).json({ message: "No results found for this poll." });
    }

    // Process the flat results into a nested structure for easier consumption
    const processedResults = results.reduce((acc, row) => {
        const { [groupBy]: groupValue, option_text, count } = row;
        if (!acc[groupValue]) {
            acc[groupValue] = [];
        }
        acc[groupValue].push({ option: option_text, count: parseInt(count, 10) });
        return acc;
    }, {});

    return res.status(200).json(processedResults);

  } catch (error) {
    console.error(`Error fetching results for poll ${pollId}:`, error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }

});

// Get all discussions for a poll
router.get("/:pollId/discussions", async (req, res) => {
  const { pollId } = req.params;
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const { count, rows } = await Discussion.findAndCountAll({
      where: { poll_id: pollId },
      include: [
        {
          model: User,
          as: 'Author',
          attributes: ['nickname']
        }
      ],
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM comments AS c
              WHERE
                c.discussion_id = "Discussion".discussion_id
            )`),
            'comment_count'
          ]
        ]
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      total: count,
      discussions: rows,
    });
  } catch (error) {
    console.error(`Error fetching discussions for poll ${pollId}:`, error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

module.exports = router; 