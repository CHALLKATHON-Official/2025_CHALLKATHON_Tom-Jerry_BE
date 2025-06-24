const { User, Poll, Option } = require('./models');
const bcrypt = require('bcrypt');

const seedData = async () => {
  try {
    console.log('🌱 시드 데이터 생성 시작...');

    // 기존 사용자가 있는지 확인
    const existingUser = await User.findOne({ where: { nickname: 'testuser' } });
    if (existingUser) {
      console.log('✅ 테스트 사용자가 이미 존재합니다.');
      return;
    }

    // 테스트 사용자 생성
    const hashedPassword = await bcrypt.hash('password123', 10);
    const testUser = await User.create({
      real_name: '테스트 사용자',
      nickname: 'testuser',
      gender: 'male',
      birth_date: '1990-01-01',
      region: '서울특별시',
      job: '학생',
      password: hashedPassword,
      interest_categories: ['정치', '경제', '사회'],
      phone_number: '010-1234-5678'
    });

    console.log('✅ 테스트 사용자 생성 완료');

    // 테스트 여론조사들 생성
    const polls = [
      {
        title: '다음 대선에서 가장 중요한 이슈는?',
        description: '2025년 대선을 앞두고 가장 중요한 이슈를 선택해주세요.',
        category: '정치',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후
        options: [
          { text: '경제 정책' },
          { text: '외교 정책' },
          { text: '사회 복지' },
          { text: '교육 정책' }
        ]
      },
      {
        title: '최근 부동산 정책에 대한 의견은?',
        description: '정부의 부동산 정책에 대한 여러분의 의견을 들려주세요.',
        category: '경제',
        expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15일 후
        options: [
          { text: '매우 만족' },
          { text: '만족' },
          { text: '보통' },
          { text: '불만족' },
          { text: '매우 불만족' }
        ]
      },
      {
        title: 'AI 기술 발전에 대한 견해는?',
        description: '인공지능 기술의 발전이 우리 사회에 미치는 영향에 대해 어떻게 생각하시나요?',
        category: 'IT/과학',
        expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20일 후
        options: [
          { text: '매우 긍정적' },
          { text: '긍정적' },
          { text: '중립' },
          { text: '부정적' },
          { text: '매우 부정적' }
        ]
      },
      {
        title: '일과 삶의 균형에 대한 의견은?',
        description: '현재 한국의 일과 삶의 균형에 대해 어떻게 생각하시나요?',
        category: '사회',
        expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25일 후
        options: [
          { text: '매우 좋음' },
          { text: '좋음' },
          { text: '보통' },
          { text: '나쁨' },
          { text: '매우 나쁨' }
        ]
      }
    ];

    for (const pollData of polls) {
      const { options, ...pollInfo } = pollData;
      
      const poll = await Poll.create({
        ...pollInfo,
        creator_id: testUser.user_id
      });

      // 옵션들 생성
      for (const optionData of options) {
        await Option.create({
          poll_id: poll.poll_id,
          option_text: optionData.text
        });
      }

      console.log(`✅ 여론조사 "${poll.title}" 생성 완료`);
    }

    console.log('🎉 모든 시드 데이터 생성 완료!');
  } catch (error) {
    console.error('❌ 시드 데이터 생성 실패:', error.message);
  }
};

module.exports = seedData; 