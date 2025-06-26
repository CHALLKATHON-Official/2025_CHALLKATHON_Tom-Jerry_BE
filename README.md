# 2025_CHALLKATHON_Tom-Jerry_BE

2025_CHALLKATHON_Tom-Jerry_BE
🖥️ 프로젝트 소개
easypoll의 백엔드 서버입니다.
Node.js와 Express를 기반으로 하며, 여론조사 생성/참여/통계, 회원 관리, 댓글, 뉴스 등 easypoll의 모든 핵심 기능을 REST API로 제공합니다.

🚀 주요 기능
회원가입/로그인 (JWT 인증)
여론조사 생성, 옵션 추가, 참여, 결과 집계
댓글 작성/조회/삭제
뉴스(공지) 등록/조회
사용자별 참여/개설 내역 관리
실시간 통계(성별/연령/직업별 등)
토큰 기반 인증 및 권한 체크

🗂️ 폴더 구조

2025_CHALLKATHON_Tom-Jerry_BE/
├── config/           # 데이터베이스 설정 및 인스턴스
│   ├── database.js
│   └── databaseInstance.js
├── middleware/       # 인증 등 미들웨어
│   └── auth.js
├── models/           # Sequelize 모델(테이블 구조)
│   ├── user.js
│   ├── poll.js
│   ├── option.js
│   ├── response.js
│   ├── comment.js
│   ├── discussion.js
│   ├── news.js
│   ├── transaction.js
│   └── index.js
├── routes/           # API 라우터
│   ├── auth.js
│   ├── users.js
│   ├── polls.js
│   ├── comment.js
│   ├── discussions.js
│   └── news.js
├── seedData.js       # 샘플 데이터 삽입 스크립트
├── index.js          # 서버 진입점
├── package.json
└── README.md

각 폴더/파일에는 한글 주석이 포함되어 있어, 주니어 개발자도 쉽게 이해할 수 있습니다.

⚙️ 설치 및 실행

1. 의존성 설치
  npm install
   # 또는
  yarn install

2. 환경변수(.env) 설정
DB 접속 정보, JWT 시크릿 등 환경변수를 .env 파일에 작성합니다.
예시:
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=비밀번호
DB_NAME=easypoll
JWT_SECRET=임의의_시크릿값

3. 데이터베이스 준비
DB를 설치하고, 위에서 지정한 DB를 생성하세요.
테이블은 서버 실행 시 자동 생성됩니다

4. 서버 실행
npm start
# 또는
node index.js

5. 샘플 데이터 삽입
node seedData.js

🔑 환경변수/설정
.env 파일에 DB, JWT 등 민감 정보를 관리합니다.

예시)
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=비밀번호
  DB_NAME=easypoll
  JWT_SECRET=시크릿값


🛠️ 주요 라이브러리
express: 웹 서버 프레임워크
sequelize: ORM (MySQL 등 지원)
jsonwebtoken: JWT 인증
bcrypt: 비밀번호 암호화
dotenv: 환경변수 관리
기타: cors, morgan 등

📡 API 엔드포인트 예시
회원가입/로그인
POST /auth/register (회원가입)
POST /auth/login (로그인)
여론조사
POST /polls (여론조사 생성)
GET /polls/:id (여론조사 상세)
POST /polls/:id/response (투표 참여)
GET /polls/:id/results (결과 조회)
댓글
POST /comment (댓글 작성)
GET /comment/:pollId (댓글 목록)
DELETE /comment/:id (댓글 삭제)
뉴스/공지
GET /news (뉴스 목록)
POST /news (뉴스 등록, 관리자)
사용자
GET /users/me (내 정보)
GET /users/:id/polls (내가 만든/참여한 여론조사)

> 자세한 API 명세는 코드 내 라우터 파일(routes/) 및 주석 참고


🧩 개발/운영 팁
모든 API는 JWT 토큰 인증 필요(회원가입/로그인 제외)
미들웨어(middleware/auth.js)에서 토큰 검증 및 권한 체크
DB 모델 구조는 models/ 폴더 참고
에러 발생 시, 한글 메시지와 함께 HTTP 상태코드 반환
PR/이슈 작성 시, 명확한 제목과 상세 설명 권장

❓ Troubleshooting
DB 연결 오류:
.env의 DB 정보가 올바른지 확인
DB 서버가 실행 중인지 확인
JWT 인증 오류:
토큰 만료/누락 여부 확인
Authorization 헤더에 Bearer 토큰값 포함 필요
포트 충돌:
기본 포트(3000) 사용 중이면 .env에서 포트 변경

🤝 기여/문의
버그/기능 제안: GitHub Issue 등록
문의: 팀원 또는 관리자에게 직접 연락

📝 라이선스
본 프로젝트는 MIT License를 따릅니다.


💡 추가 설명
각 모델/라우터/미들웨어 파일에는 한글 주석이 포함되어 있어, 코드 흐름을 쉽게 파악할 수 있습니다.
변수명, 함수명은 명확하게 작성되어 있어, 주니어 개발자도 이해하기 쉽습니다.
에러가 발생할 수 있는 부분은 try-catch 등으로 미리 예외 처리가 되어 있습니다.
코드가 길어질 경우, 작은 함수로 분리하여 가독성과 유지보수성을 높였습니다.















