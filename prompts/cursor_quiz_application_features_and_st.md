# Quiz application features and structure
_Exported on 3/5/2026 at 19:33:15 GMT+5:30 from Cursor (2.6.11)_

---

**User**

Let's build a quiz application.

1. It should be a web application
2. Users should be able to login and register
3. Quizmaster should be able to create a session or a room, with a shareable link that the participant can use to enter the room, for a given time since the room was created
4. We can start with a chat room, where quizmaster can post 1 question and add the timer, in which the other participants get to answer the current question
5. When the question is given and timer has started to answer, each answer by the participant should be only be visible to the quizmaster and not the other participants.
6. After the timer to give the answers is off, quizmaster will mark the correct and fastest response and points will be added to the team, and everyone's answer should be revealed, and then quizmaster can go ahead and post the next question.


---

**Cursor**

Let me first explore the current state of the workspace, then I have a few questions before creating the plan.

The workspace is empty, so this is a greenfield project. I have a few questions to narrow down the implementation:

**Quiz Application - Tech Stack & Design Decisions**

> **Which tech stack would you prefer for this real-time quiz app?**
> - Node.js (Express + Socket.IO) backend + React frontend
> - Next.js fullstack + Socket.IO for real-time ✔
> - Python (FastAPI + WebSockets) backend + React frontend
> - Something else (I'll describe)

> **You mentioned 'points will be added to the team'. Should participants join as teams (multiple people per team), or is each participant an individual player and 'team' just means 'player'?**
> - Each participant is an individual player ✔
> - Participants join in teams (multiple members per team)

**Persistence & Auth Details**

> **Which database would you prefer for storing users, rooms, and scores?**
> - SQLite (simple, file-based, good for starting out)
> - PostgreSQL (robust, production-ready)
> - MongoDB ✔

> **How should authentication work?**
> - Simple email/password with JWT (built from scratch) ✔
> - NextAuth.js (supports email/password + optionally Google/GitHub OAuth later)

Great, I have all the info I need. Let me put together the plan.

---

**User**

When creating rooms quizmaster can make two types of rooms, one which we discussed, and the other with teams allowed, in case of teams, each participant team should have also have a parallel chat room for themselves along with then quiz being conducted, where they can discuss on their own. Think about scale, let each room can have 1000 participants at once and 100 quizes may be happening in parallel

---

**Cursor**

Good additions -- the team chat rooms and scale requirements significantly change the architecture. One clarifying question before I update the plan:

**Team Mode - Answer Submission**

> **In team mode, how should answer submission work?**
> - Only a designated team captain submits the answer on behalf of the team ✔
> - Any team member can submit, but only the first/latest submission from the team counts
> - All members answer individually, the most common answer from the team is auto-submitted

Clear. Now let me update the plan with team mode, private team chat, and the scale architecture.

The plan has been updated with the two major additions. Here's a summary of what changed:

**Team Mode**
- Rooms now have a `mode` field: `individual` or `team`
- New `Team` model with captain, members, and a per-room unique code
- In team mode, only the designated captain submits answers on behalf of the team
- Each team gets a private Socket.IO sub-room (`room:{code}:team:{teamId}`) for chat discussion during question timers
- New `ChatMessage` model with TTL auto-expiry for chat history
- Leaderboard adapts to show team rankings in team mode

**Scale Architecture (1000 participants/room, 100 concurrent quizzes)**
- **Redis adapter** for Socket.IO -- this is the critical piece. It lets multiple Node.js processes share room state and broadcast events across processes via Redis pub/sub.
- **Node cluster** in `server.mjs` -- fork one worker per CPU core, each running its own Socket.IO + Next.js instance.
- **Sticky sessions** at the load balancer for WebSocket affinity.
- **MongoDB bulk writes** -- answers arrive in bursts of up to 1000 per question. We batch them in-memory during the timer and `bulkWrite` on expiry.
- **Redis for ephemeral state** -- timer management, room membership counts (fast `SCARD`), avoiding MongoDB reads for hot-path operations.
- **Team chat isolation** -- even in a 1000-person room, each team chat fans out to only 5-10 members via scoped sub-rooms.

You can review the full updated plan in the plan file. Let me know if you'd like any adjustments or if I should start implementing.

---

**User**

If a participant has joined a quiz at one time, he/she should not be able to join other quiz unless they leave the current quiz 

---

**Cursor**

Good point -- this is an important constraint to enforce. Let me update the plan with this "single active room" rule.

Now I have the full picture. I'll add the "single active room" constraint to the plan in the appropriate sections -- the data model, the Redis layer, and the socket join logic.

Now add the enforcement details to the Socket.IO events section and the real-time flow:

Now add a `leave-room` event to the events list:

The plan now includes the single active room constraint. Here's what was added:

**Enforcement at two layers:**
- **Redis (fast path)** -- an atomic check-and-set on `user:{userId}:active_room` during `join-room`. This is O(1) and doesn't touch MongoDB on the hot path. If the user is already in a different room, the join is rejected with an `already-in-room` error that includes the current room code.
- **MongoDB (durable)** -- `User.activeRoomId` is kept in sync as a fallback for Redis restarts or cache misses.

**Cleanup on leave/disconnect:**
- `leave-room` event and socket disconnect both clear the Redis key and MongoDB field, freeing the user to join another room.

**Client-side UX:**
- If a user tries to join a second room, the error includes which room they're currently in, so the UI can offer "Return to current room" or "Leave and join this one".
- Dashboard shows an active room banner when the user is already in one.

Let me know if you'd like any further changes or if I should start implementing.

---

**User**

Two changes - 

1. When a captain creates a team, he/she should be able to set a password for the team, so that rogue participants can't join the team
2. For the team setup, there should be option to join as a captain or join as a team member
3. A participant should be not able to captain multiple teams at once, captain should be the only one to be able to delete the team, and teams can be deleted only before the quiz starts
4. There should be a points leaderboard for everyone to see who is leading
5. Only logged in user can use, they should have a profile and dashboard showing what quizes they participated in, how many answers they gave, points (basically their entire quiz history).
6. Users should have the ability to add other users as quizmates, so that they can easily share the quiz and also easily add them to the quiz 

---

**Cursor**

Good additions -- six changes total. A couple of quick clarifications before I update the plan:

**Quizmates & Leaderboard Details**

> **How should the quizmates (friends) system work?**
> - Mutual: User A sends request, User B must accept (like Facebook friends) ✔
> - One-way follow: User A adds User B, no acceptance needed (like Twitter follow)

> **When you say 'easily add them to the quiz', what does that mean?**
> - Send them an in-app notification/invite with the room link ✔
> - Directly add them into the room (they still need to open it, but are pre-registered)
> - Both: invite notification + option to pre-add to a team in team mode

> **For the points leaderboard (point 4), what scope should it cover?**
> - Per-room leaderboard only (shown during and after each quiz) ✔
> - Global all-time leaderboard across all quizzes (plus per-room)
> - Both: per-room during quiz + global all-time on the main page

Clear. Let me update the plan with all six changes.

Now I have the full plan. Let me apply all six changes across the relevant sections.

Now update the Team Mode section with password, captain/member join roles, and captain constraints:

Update the Individual Mode leaderboard note too:

Now update the data models -- Team model (add password), User model (add profile fields), and add new models:

Now add the new models (Participation, Quizmate, Notification) after ChatMessage:

Now update the Socket.IO events to include team password, delete-team, leaderboard, and notifications:

Now update the project structure with new files:

Now update the implementation phases:

The plan is now updated with all six changes. Here's a summary of what was added:

**1. Team passwords** -- When a captain creates a team, they can set an optional password. The password is bcrypt-hashed and stored on the Team document. Members must provide the password to join a password-protected team. In the lobby UI, locked teams show a lock indicator.

**2. Captain vs Member role selection** -- When entering a team-mode room, participants explicitly choose "Create team (as captain)" or "Join existing team (as member)".

**3. Captain constraints**:
- `User.activeCaptainTeamId` field prevents a user from captaining multiple teams simultaneously.
- Only the captain can delete a team, and only while `room.status === 'waiting'` (before the quiz starts). Once active, teams are locked.
- On team deletion, members are notified and returned to the room lobby.

**4. Per-room leaderboard** -- A `leaderboard-update` event is broadcast to all participants after each question round. The leaderboard is visible to everyone in real-time (individual rankings or team rankings depending on room mode).

**5. User profile and quiz history** -- New `Participation` model tracks every quiz a user participates in (role, answers given, correct answers, points). Profile page shows aggregate stats and a paginated history table. Public profile view for other users. Dashboard shows recent activity.

**6. Quizmates system** -- Mutual friendship model (`pending` -> `accepted`). Users can search and send quizmate requests. From within a room lobby, any participant can invite their quizmates via in-app notification. Real-time notification delivery via Socket.IO. Notification bell with dropdown in the navbar.

Let me know if you'd like any adjustments or if I should start building.

---

**User**

1. Quizmaster should be able to remove a team during the quiz, for administrative purposes. In that case the players should not able to join the quiz again
2. Teams should be blocked from answering when time is over (writing this again to check if you have implemented it).

---

**Cursor**

Good catches. Let me verify point 2 against the current plan and then update for both.

I've confirmed the current state. For point 2: the plan has server-side authoritative timers, but does **not** explicitly state that `submit-answer` is rejected after the timer expires. That needs to be explicit. Let me update both points now.

Now add the answer deadline enforcement explicitly to the scale/timer section:

Now update the Team model to include a `status` field for disqualification, and add a ban list to the Room model:

Now update the Socket.IO events to include the new events:

Both changes are now in the plan. Here's what was added:

**1. Quizmaster team removal (disqualification)**
- New `disqualify-team` event: quizmaster can remove any team at any time during the quiz, with an optional reason message.
- Team model gets a `status` field (`active` | `disqualified`) plus `disqualifiedAt` and `disqualifyReason`.
- Room model gets a `bannedUserIds` array (also mirrored as a Redis Set for O(1) checks). All members of a disqualified team are added to the ban list.
- On disqualification: members are disconnected, receive a `team-disqualified` event with the reason, and are **blocked from re-joining** the room (checked on `join-room` against the ban list).
- Leaderboard is updated to exclude the disqualified team.

**2. Answer deadline enforcement (explicit)**
- The plan already had server-side authoritative timers, but now it's **explicitly stated**: when `submit-answer` arrives, the server checks the Redis timer key. If expired, the answer is rejected with `answer-rejected: time-expired`. Client-side timers are cosmetic only.
- Disqualified teams/users also get `answer-rejected: disqualified` if they somehow attempt to submit.

Let me know if anything else needs adjusting, or if I should start building.

---

**User**

In case a team/participant is removed, leaderboard should update as well

---

**Cursor**

That's already covered in the plan. When I added the disqualification feature, I included this in the Team Mode section:

> "The room-wide leaderboard is updated to exclude the disqualified team."

And the `leaderboard-update` event is broadcast after any scoring change. But let me make sure the individual participant case is also explicit (not just teams), and that the leaderboard update is called out as an immediate action on removal rather than just "after next question."

Now also update the events list to include the individual participant disqualification:

Updated. The key clarifications:

- **Covers both teams and individual participants** -- quizmaster can disqualify either, not just teams.
- **Immediate leaderboard update** -- on disqualification, a `leaderboard-update` is broadcast right away to all remaining participants with the removed entry excluded and rankings recalculated. It doesn't wait for the next question round.

Let me know if there's anything else to adjust, or if I should start building.

---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

Let me start implementing the plan. I'll begin with the first todo - project setup and infrastructure.

Node.js v14 is too old for Next.js 14. Let me check for a newer version.

Good, nvm is available. Let me check available versions and install/use a suitable one.

Node v20 is available. Let me use it and initialize the project.

Now let me initialize the Next.js project.

Next.js is initialized. Now let me install the additional dependencies.

Now let me see what was generated and set up the project structure.

I notice the type packages weren't added to the main package.json (they might have gone to a different install). Let me check and fix, then create the project structure. Let me now create all the directories and key files. I'll work through this systematically using parallel task agents for different file groups.

Good, types are installed. Now let me create the directory structure and all the core files. I'll do this in parallel batches.

Now let me create the .env.local and .gitignore, update package.json scripts, and create the core infrastructure files. I'll work in parallel.

Now let me create the custom server and update package.json, and create the .gitignore update.

Good, .gitignore already covers `.env*.local`. Now let me create the socket handler bootstrap file and start on the models. I'll use parallel agents for the heavy lifting.

Wait, I used `await` in a non-async function. Let me fix the socket bootstrap. Actually, let me reconsider the approach - the server.mjs runs plain ESM, and the socket handlers need JWT verification. Let me keep the socket handler as a proper .mjs file.

Now let me mark setup as complete and start creating all the Mongoose models in parallel.

Now let me create all 10 Mongoose models. I'll write them in parallel batches.

All 10 models are created. Let me now move to auth, which involves creating the API routes and the UI pages. Let me work on multiple pieces in parallel using task agents.

Let me create the auth API routes and the auth context + UI pages in parallel.

Now let me create the AuthContext and the UI components for auth.

Now let me create the Navbar and update the root layout to include the AuthProvider.

Auth is done. Now let me move to the rooms phase and the socket core, working on them together since they're related. Let me create the room API routes, the dashboard, and the socket handlers.

Now let me create the dashboard page and the CreateRoomModal component.

Room management phase is done. Now let me move to the core Socket.IO implementation - this is the most critical piece. Let me create the socket handlers, timer manager, and the room page UI simultaneously.

Now let me create the full socket handler system. This is the core of the app — I'll write the main handler with all quiz logic, the team handler, and the timer manager.

Now let me create the team chat handler and update the main socket index to use all handlers.

Now update the main socket index to use both handlers.

Now let me create the Socket context for the client, the useSocket hook, and the room page UI. This is a large batch of UI components.

The file was already written - the directory was auto-created. Now let me create the core UI components: Timer, Leaderboard, QuestionPanel, AnswerPanel, TeamChat, and the main room page. Let me use task agents for the UI components to work in parallel.

Now the main room page - this is the biggest component that ties everything together.

Quiz UI is done. Let me mark the done todos and move to scoring (which is already implemented in the socket handler - just need to verify), then profile and quizmates.

Now let me build the profile page, history API, and quizmates system in parallel.

Now the quizmates system - API routes, notification API, and UI components.

Now let me create the UI components for quizmates and notifications.

Now let me add the notification dropdown to the Navbar.

Now let me move to the final phase - landing page and polish.

Now let me update the globals.css with some helpful base styles, and add the QuizmatesList to the profile page.

Now let me add QuizmatesList to the profile page.

Now let me also add the InviteQuizmatesModal (shown within the room) and integrate it into the room page. Let me also add the public profile page.

Now let me verify the build compiles. Let me first check for any issues.

Let me fix that type error and any others.

The build succeeds. All pages and API routes compile correctly. Now let me also add a README.md with setup instructions.

All todos are complete. Here's a summary of everything that was implemented:

**Project Structure** - 45+ files across the full application:

**Infrastructure (Phase 1)**
- Next.js 14 with TypeScript, Tailwind CSS
- Custom `server.mjs` integrating Socket.IO with Redis adapter on top of Next.js
- MongoDB connection singleton with pooling, Redis client singleton
- `.env.local` configuration

**Data Models (Phase 2)** - 10 Mongoose models:
- `User`, `Room`, `Team`, `Question`, `Answer`, `Score`, `ChatMessage`, `Participation`, `Quizmate`, `Notification`
- All with proper indexes for scale (compound unique indexes, leaderboard sort indexes, TTL indexes for auto-expiry)

**Authentication (Phase 3)**
- JWT-based auth with httpOnly cookies (access + refresh tokens)
- bcrypt password hashing (cost 12)
- `AuthContext` React context with login/register/logout/refresh
- Login and Register pages with polished dark UI

**Room Management (Phase 4)**
- Create rooms (individual or team mode) with configurable duration
- Team creation with optional password (bcrypt-hashed), join with password verification
- Captain constraints enforced server-side (no multi-captaining, pre-quiz deletion only)
- Dashboard with active room banner, room list, join-by-code

**Socket.IO Real-Time Core (Phase 5)**
- Full quiz event handlers: `join-room`, `leave-room`, `post-question`, `submit-answer`, `answer-received`, `mark-correct`, `answers-revealed`, `leaderboard-update`
- Server-side authoritative timer with answer deadline enforcement
- Single active room constraint (checked on join)
- Disqualification system for teams and individual participants (with ban + immediate leaderboard update)

**Team Chat (Phase 6)**
- Private team chat via Socket.IO sub-rooms (`room:{code}:team:{teamId}`)
- Chat history persistence in MongoDB with TTL auto-expiry
- Captain transfer support

**Quiz UI (Phase 7)**
- Room page with full quiz flow: question display, timer, answer submission, answer reveal
- `QuestionPanel` for quizmaster (post questions, see incoming answers, mark correct)
- `AnswerPanel` for participants (submit answers, captain-only enforcement in team mode)
- `TeamChat` sidebar, `TeamSelector` for join/create team flows
- `Leaderboard` component (individual and team variants)

**Profile & History (Phase 8)**
- Profile page with aggregate stats and paginated quiz history
- Public profile view for other users
- `Participation` records tracking every quiz session

**Quizmates System (Phase 9)**
- Mutual friendship model with send/accept/decline
- In-app notifications for quizmate requests, acceptances, and room invites
- `NotificationDropdown` with unread count badge in navbar
- `QuizmatesList` with invite-to-room functionality

**Landing Page (Phase 10)**
- Hero section with gradient background
- Feature cards (Individual/Teams, Real-Time Scoring, Shareable Rooms)
- How-it-works steps
- CTA section and footer

The build compiles successfully with all 17 routes (pages + API) properly configured. To run it, you'll need MongoDB and Redis running locally, then `npm run dev`.

---

**User**

Let's run it and see

---

**Cursor**

Let me check what services are available and get the app running.

Neither MongoDB nor Redis are installed locally. Let me check if Docker is available -- that's the easiest way to get both running.

No MongoDB, Redis, or Docker available. Let me install them via Homebrew.

MongoDB failed to install due to outdated Command Line Tools, but Redis might have installed. Let me check and try alternative approaches.

Redis installed. Now let me start Redis and try an alternative approach for MongoDB. Since the CLT are outdated and MongoDB Community requires building from source, I'll use a simpler approach - MongoDB can run via `mongosh` with a local connection, or we can use `mongod` from the brew tap differently. Let me check what's actually available now and try installing MongoDB via the pre-built binary.

Redis is running and `mongosh` is installed. Now I need `mongod` (the MongoDB server daemon). Let me try downloading the MongoDB Community binary directly since `brew install mongodb-community` failed.

Redis is running. Now let me download the MongoDB Community Server binary for macOS ARM64 directly.

The `ls` output has color codes. Let me handle that.

MongoDB is running. Let me verify both services and then start the app.

Both MongoDB and Redis are running. Let me check the project state and start the dev server.

Dependencies are installed. Let me check the `.env.local` file and then build and start the server.

Good, env is configured. Let me first do a quick build check and then start the dev server.

The server is running at **http://localhost:3000**. There's a minor Redis adapter issue - let me fix that and check if the app loads properly.

The issue is that `ioredis` auto-connects when you create a `new Redis(url)` without `lazyConnect: true`. Then calling `.connect()` fails because it's already connected. Let me fix this.

Now let me restart the server and check the app.

Port 3000 is still in use. Let me kill all processes on that port and retry.

The server is up and running cleanly now:

- **Redis adapter**: connected successfully
- **Server**: ready at **http://localhost:3000**

Let me open the browser to verify it loads.

The app is running and working. Let me check the server logs for any errors during those requests.

Everything is compiling and responding cleanly -- no errors at all. Here's a summary of what's running:

**Services running:**
- **MongoDB** -- localhost:27017 (via direct binary from `/tmp`)
- **Redis** -- localhost:6379 (via Homebrew)
- **Next.js + Socket.IO** -- http://localhost:3000

**Verified working:**
- Homepage loads (200)
- Registration page loads (200)
- User registration succeeds (test@example.com registered)
- Auth cookies set properly
- Dashboard loads (200)
- Auth session valid via `/api/auth/me`

You can now open **http://localhost:3000** in your browser to see the app. You can:

1. **Register** a new account or **log in** with `test@example.com` / `TestPass123!`
2. Go to the **Dashboard** to create a quiz room
3. Share the room link and have participants join
4. Run a real-time quiz with timers, answers, and leaderboard

