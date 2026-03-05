# Qlaude - Real-Time Multiplayer Quiz Platform

Qlaude is a real-time quiz platform where quizmasters host live quizzes for individuals or teams. Players join with a room code, answer timed questions, and compete on a live leaderboard.

## What It Does

### Room Modes

- **Individual** -- each player answers on their own and climbs a solo leaderboard.
- **Team** -- players form teams (with optional passwords), discuss answers in private team chat, and the team captain submits the final answer.

### Quiz Flow

1. A quizmaster creates a room and shares the room code.
2. Participants join using the code.
3. The quizmaster posts questions one at a time with a configurable timer (5--300 seconds).
4. Participants (or team captains in team mode) submit answers before time runs out.
5. Only the quizmaster can see answers while the timer is running.
6. After the timer expires, the quizmaster marks the correct answer.
7. All answers are revealed and points are awarded (10 base + up to 5 speed bonus).
8. The leaderboard updates after each round.

### Social Features

- **Quizmates** -- a mutual friend system. Send and accept requests by email.
- **Room Invites** -- invite quizmates to a room via in-app notifications.
- **Notifications** -- real-time bell for friend requests and room invites.
- **Profile** -- quiz history with stats: quizzes played, answers given, total points.

### Rules

- A user can only be in one quiz room at a time.
- A user can only captain one team at a time.
- Teams can only be deleted by their captain before the quiz starts.
- The quizmaster can disqualify teams or individuals at any time.
- Disqualified users cannot rejoin the room.
- Answers submitted after the timer are rejected server-side.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- [MongoDB](https://www.mongodb.com/) (local instance or MongoDB Atlas)
- [Redis](https://redis.io/) (local instance or a cloud provider)

## Local Development Setup

**1. Clone the repository**

```bash
git clone <repo-url>
cd p2p-quiz
```

**2. Install dependencies**

```bash
npm install
```

**3. Create the environment file**

Create a file named `.env.local` in the project root:

```
MONGODB_URI=mongodb://localhost:27017/p2p-quiz
REDIS_URL=redis://localhost:6379
JWT_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-secret>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate secure values for the JWT secrets:

```bash
openssl rand -hex 32
```

**4. Start MongoDB and Redis**

Make sure both services are running before starting the app.

**5. Start the development server**

```bash
npm run dev
```

The app starts at `http://localhost:3000` with Socket.IO running on the same port.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the custom server (Next.js + Socket.IO) |
| `npm run dev:next` | Start Next.js only (no real-time features) |
| `npm run build` | Create a production build |
| `npm start` | Run the production server |
| `npm run lint` | Run ESLint |

## Contributing

1. Fork the repository and clone your fork.
2. Create a feature branch from `main`.
3. Make your changes.
4. Run `npm run lint` and fix any issues.
5. Open a pull request describing what you changed and why.

### Conventions

- TypeScript for all source files.
- Tailwind CSS for styling.
- API routes live under `src/app/api/`.
- Socket.IO event handlers live under `src/socket/`.
