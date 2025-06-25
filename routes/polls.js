const express = require("express");
const router = express.Router();
const { Poll, Option, sequelize, User, Response, Discussion, Comment } = require("../models");
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
  const token = req.header('Authorization')?.replace('Bearer ', '');
  let userId = null;

  // 토큰이 있으면 사용자 ID 추출
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret');
      if (decoded && decoded.user && decoded.user.id) {
        userId = decoded.user.id;
      }
    } catch (error) {
      // 토큰이 유효하지 않으면 무시하고 계속 진행
      console.log('Invalid token, continuing without user context:', error.message);
    }
  }

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

    // 각 poll의 참여자 수를 responses 테이블에서 count(*)로 계산
    const pollIds = rows.map(p => p.poll_id);
    let countMap = {};
    
    if (pollIds.length > 0) {
      const responseCounts = await Response.findAll({
        attributes: ['poll_id', [sequelize.fn('COUNT', sequelize.col('response_id')), 'respondent_count']],
        where: { poll_id: pollIds },
        group: ['poll_id']
      });
      
      responseCounts.forEach(rc => {
        countMap[rc.poll_id] = parseInt(rc.get('respondent_count'), 10);
      });
    }

    // 인증된 사용자가 있으면 추가 정보 포함
    let processedPolls = rows;
    if (userId) {
      // 사용자가 참여한 여론조사 ID 목록 조회
      const participatedPolls = await Response.findAll({
        where: { user_id: userId },
        attributes: ['poll_id'],
        raw: true
      });
      const participatedPollIds = participatedPolls.map(p => p.poll_id);

      // 사용자가 생성한 여론조사 ID 목록 조회
      const createdPolls = await Poll.findAll({
        where: { creator_id: userId },
        attributes: ['poll_id'],
        raw: true
      });
      const createdPollIds = createdPolls.map(p => p.poll_id);

      // 각 여론조사에 isParticipated와 isMine 필드 추가
      processedPolls = rows.map(poll => {
        const pollObj = poll.toJSON();
        pollObj.respondent_count = countMap[poll.poll_id] || 0;
        pollObj.isParticipated = participatedPollIds.includes(poll.poll_id);
        pollObj.isMine = createdPollIds.includes(poll.poll_id);
        pollObj.participant_count = pollObj.respondent_count; // 프론트엔드 호환성을 위해
        return pollObj;
      });
    } else {
      // 인증되지 않은 사용자
      processedPolls = rows.map(poll => {
        const pollObj = poll.toJSON();
        pollObj.respondent_count = countMap[poll.poll_id] || 0;
        pollObj.participant_count = pollObj.respondent_count; // 프론트엔드 호환성을 위해
        return pollObj;
      });
    }

    return res.status(200).json({
      total: count,
      polls: processedPolls,
    });

  } catch (error) {
    console.error("Error fetching polls:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code
    });
    return res.status(500).json({ message: "서버 오류가 발생했습니다.", error: error.message });
  }
});

// Get a single poll by ID
router.get("/:id", async (req, res) => {
  const pollId = req.params.id;
  const token = req.header('Authorization')?.replace('Bearer ', '');

  try {
    let userResponse = null;
    
    // If token exists, get user's response
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret');
        if (decoded && decoded.user && decoded.user.id) {
          const userResponseData = await Response.findOne({
            where: {
              poll_id: pollId,
              user_id: decoded.user.id
            },
            include: [{
              model: Option,
              attributes: ['option_id', 'option_text']
            }]
          });
          if (userResponseData) {
            userResponse = {
              option_id: userResponseData.Option.option_id,
              option_text: userResponseData.Option.option_text
            };
          }
        }
      } catch (error) {
        // Token is invalid, continue without user response
        console.log('Invalid token, continuing without user response:', error.message);
      }
    }

    const poll = await Poll.findByPk(pollId, {
      include: [
        {
          model: User,
          as: 'Creator',
          attributes: ['user_id', 'nickname', 'gender', 'birth_date', 'region', 'job']
        },
        {
          model: Option,
          as: 'Options',
          include: [{
            model: Response,
            include: [{ model: User, attributes: ['user_id', 'nickname', 'gender', 'birth_date', 'region', 'job'] }],
            attributes: []
          }],
          attributes: {
            include: [
              [
                sequelize.literal(`(
                  SELECT COUNT(*)
                  FROM responses AS r
                  WHERE
                    r.option_id = "Options".option_id
                )`),
                'response_count'
              ]
            ]
          }
        },
        {
          model: Comment,
          include: [{ model: User, as: 'Author', attributes: ['nickname'] }],
        }
      ]
    });

    if (!poll) {
      return res.status(404).json({ message: "Poll not found." });
    }

    // Add user response to the poll data
    const pollData = poll.toJSON();
    pollData.user_response = userResponse;

    // 옵션별 투표자(User) 정보에서 birth_date를 만나이로 변환
    if (pollData.Options) {
      pollData.Options.forEach(option => {
        if (option.Responses) {
          option.Responses.forEach(response => {
            if (response.User && response.User.birth_date) {
              const birth = new Date(response.User.birth_date);
              const today = new Date();
              let age = today.getFullYear() - birth.getFullYear();
              const m = today.getMonth() - birth.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                age--;
              }
              response.User.age = age;
              delete response.User.birth_date;
            }
          });
        }
      });
    }

    return res.status(200).json(pollData);

  } catch (error) {
    console.error(`Error fetching poll ${pollId}:`, error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// Vote on a poll
router.post("/:id/responses", auth, async (req, res) => {
  const pollId = req.params.id;
  const { option_id } = req.body; // option_id from body
  const user_id = req.user.id; // user_id from auth token

  if (!option_id) {
    return res.status(400).json({ message: "option_id is required." });
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

    // 1.5. Check if user already voted
    const alreadyVoted = await Response.findOne({ where: { user_id, poll_id: pollId } });
    if (alreadyVoted) {
      return res.status(409).json({ message: '이미 이 여론조사에 투표하셨습니다.' });
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
        [sequelize.col('"options"."option_text"'), 'option_text'],
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
        '"options"."option_text"',
      ],
      order: [
        [sequelize.col(`"User"."${groupBy}"`), 'ASC'],
        [sequelize.col('"options"."option_text"'), 'ASC'],
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

// 여론조사 전체/카테고리별/검색
router.get('/', async (req, res) => {
  // 구현 예정
});

// 인기 여론조사
router.get('/popular', async (req, res) => {
  // 구현 예정
});

// 급상승 여론조사
router.get('/trending', async (req, res) => {
  // 구현 예정
});

// 여론조사 상세
router.get('/:id', async (req, res) => {
  // 구현 예정
});

// 투표
router.post('/:id/vote', auth, async (req, res) => {
  // 구현 예정
});

// 결과 통계
router.get('/:id/results', async (req, res) => {
  // 구현 예정
});

// 댓글 목록
router.get('/:id/comments', async (req, res) => {
  const pollId = req.params.id;
  try {
    const comments = await Comment.findAll({
      where: { poll_id: pollId },
      include: [
        { 
          model: User, 
          as: 'Author', 
          attributes: ['user_id', 'nickname'] 
        }
      ],
      order: [['createdAt', 'ASC']]
    });
    
    console.log('댓글 목록 조회:', {
      pollId,
      commentCount: comments.length,
      comments: comments.map(c => ({ id: c.comment_id, content: c.content, author: c.Author?.nickname }))
    });
    
    return res.status(200).json(comments);
  } catch (error) {
    console.error(`Error fetching comments for poll ${pollId}:`, error);
    return res.status(500).json({ message: '댓글 목록 조회 중 서버 오류가 발생했습니다.' });
  }
});

// 댓글 작성
router.post('/:id/comments', auth, async (req, res) => {
  const pollId = req.params.id;
  const user_id = req.user.id;
  const { text } = req.body;
  
  console.log('댓글 생성 요청:', {
    pollId,
    user_id,
    text,
    user: req.user
  });
  
  if (!text || !text.trim()) {
    return res.status(400).json({ message: '댓글 내용을 입력하세요.' });
  }
  
  try {
    // 사용자가 실제로 존재하는지 확인
    const user = await User.findByPk(user_id);
    if (!user) {
      console.error('사용자를 찾을 수 없음:', user_id);
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    const newComment = await Comment.create({
      poll_id: pollId,
      author_id: user_id,
      content: text.trim()
      // discussion_id를 완전히 제외
    });
    
    // 새로 생성된 댓글을 작성자 정보와 함께 반환
    const commentWithAuthor = await Comment.findByPk(newComment.comment_id, {
      include: [
        { 
          model: User, 
          as: 'Author', 
          attributes: ['user_id', 'nickname'] 
        }
      ]
    });
    
    console.log('댓글 생성 완료:', {
      commentId: newComment.comment_id,
      content: text.trim(),
      author: commentWithAuthor?.Author?.nickname
    });
    
    return res.status(201).json({ 
      message: '댓글이 등록되었습니다.', 
      comment: commentWithAuthor 
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return res.status(500).json({ message: '댓글 등록 중 서버 오류가 발생했습니다.' });
  }
});

module.exports = router; 