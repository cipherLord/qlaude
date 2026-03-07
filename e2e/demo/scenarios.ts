import { Page, expect } from "@playwright/test";
import {
  createRoomViaUI,
  joinRoomViaUI,
  createTeamViaUI,
  postQuestion,
  submitAnswer,
  waitForQuestionVisible,
  markCorrect,
  markWrong,
  closeRoomViaUI,
  waitForRoomClosed,
  RoomMode,
  ScoringMode,
} from "../helpers/room";

export interface DemoStep {
  id: string;
  label: string;
  actor: "qm" | "player1" | "player2" | "cap1" | "cap2" | "cap3";
  action: (pages: DemoPages) => Promise<void>;
  highlight?: { selector: string; annotation: string };
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  mode: RoomMode;
  scoringMode: ScoringMode;
  actors: string[];
  steps: DemoStep[];
}

export interface DemoPages {
  qm: Page;
  player1: Page;
  player2: Page;
  cap1: Page;
  cap2: Page;
  cap3: Page;
  roomCode: string;
  setRoomCode: (code: string) => void;
}

function individualNormalScenario(): DemoScenario {
  return {
    id: "individual-normal",
    name: "Individual + Normal",
    description: "Classic quiz: players answer individually, QM marks correct/wrong",
    mode: "individual",
    scoringMode: "normal",
    actors: ["qm", "player1", "player2"],
    steps: [
      {
        id: "create-room",
        label: "Quizmaster creates an individual-mode room",
        actor: "qm",
        highlight: { selector: "text=Create Room", annotation: "Creating a new quiz room" },
        action: async (pages) => {
          const code = await createRoomViaUI(pages.qm, {
            name: "Demo Individual Quiz",
            mode: "individual",
          });
          pages.setRoomCode(code);
          await expect(pages.qm.locator("text=Connected")).toBeVisible({ timeout: 20_000 });
        },
      },
      {
        id: "p1-joins",
        label: "Player 1 joins the room",
        actor: "player1",
        highlight: { selector: 'input[placeholder="Enter room code"]', annotation: "Joining with room code" },
        action: async (pages) => {
          await joinRoomViaUI(pages.player1, pages.roomCode);
          await expect(pages.player1.locator("text=Connected")).toBeVisible({ timeout: 20_000 });
        },
      },
      {
        id: "p2-joins",
        label: "Player 2 joins the room",
        actor: "player2",
        highlight: { selector: 'input[placeholder="Enter room code"]', annotation: "Joining with room code" },
        action: async (pages) => {
          await joinRoomViaUI(pages.player2, pages.roomCode);
          await expect(pages.player2.locator("text=Connected")).toBeVisible({ timeout: 20_000 });
        },
      },
      {
        id: "qm-sees-players",
        label: "QM sees players in participant list",
        actor: "qm",
        highlight: { selector: "text=Players", annotation: "Participant list updated" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(2000);
          await expect(pages.qm.locator("text=Players")).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "qm-posts-q1",
        label: "QM posts Question 1: Capital of France",
        actor: "qm",
        highlight: { selector: 'textarea[placeholder="Type your question..."]', annotation: "Posting a question" },
        action: async (pages) => {
          await postQuestion(pages.qm, "What is the capital of France?", {
            timerSeconds: 60,
            points: 10,
            correctAnswer: "Paris",
          });
        },
      },
      {
        id: "players-see-q1",
        label: "Both players see the question",
        actor: "player1",
        highlight: { selector: "text=What is the capital of France?", annotation: "Question received!" },
        action: async (pages) => {
          await waitForQuestionVisible(pages.player1, "What is the capital of France?");
          await waitForQuestionVisible(pages.player2, "What is the capital of France?");
        },
      },
      {
        id: "p1-answers-correct",
        label: "Player 1 submits correct answer: Paris",
        actor: "player1",
        highlight: { selector: 'input[placeholder="Type your answer..."]', annotation: 'Answering: "Paris"' },
        action: async (pages) => {
          await submitAnswer(pages.player1, "Paris");
          await expect(pages.player1.locator("text=Answer Submitted")).toBeVisible({ timeout: 5_000 });
        },
      },
      {
        id: "p2-answers-wrong",
        label: "Player 2 submits wrong answer: London",
        actor: "player2",
        highlight: { selector: 'input[placeholder="Type your answer..."]', annotation: 'Answering: "London"' },
        action: async (pages) => {
          await submitAnswer(pages.player2, "London");
          await expect(pages.player2.locator("text=Answer Submitted")).toBeVisible({ timeout: 5_000 });
        },
      },
      {
        id: "qm-sees-answers",
        label: "QM sees incoming answers",
        actor: "qm",
        highlight: { selector: "text=Incoming Answers", annotation: "Reviewing answers" },
        action: async (pages) => {
          await expect(pages.qm.locator("text=Incoming Answers")).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "qm-marks-correct",
        label: "QM marks the first answer correct",
        actor: "qm",
        highlight: { selector: 'button:has-text("Correct")', annotation: "Marking answer correct" },
        action: async (pages) => {
          await markCorrect(pages.qm, 0);
        },
      },
      {
        id: "answers-revealed",
        label: "Players see answers revealed",
        actor: "player1",
        highlight: { selector: "text=Answers Revealed", annotation: "Results are in!" },
        action: async (pages) => {
          await expect(pages.player1.locator("text=Answers Revealed")).toBeVisible({ timeout: 10_000 });
          await expect(pages.player2.locator("text=Answers Revealed")).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "leaderboard-q1",
        label: "Leaderboard updates for all users",
        actor: "qm",
        highlight: { selector: "text=Leaderboard", annotation: "Scores updated!" },
        action: async (pages) => {
          await expect(pages.qm.locator("text=Leaderboard")).toBeVisible();
          await expect(pages.qm.locator("text=pts").first()).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "qm-posts-q2",
        label: "QM posts Question 2: What is 2 + 2?",
        actor: "qm",
        highlight: { selector: 'textarea[placeholder="Type your question..."]', annotation: "Posting question 2" },
        action: async (pages) => {
          await postQuestion(pages.qm, "What is 2 + 2?", {
            timerSeconds: 30,
            points: 10,
            correctAnswer: "4",
          });
        },
      },
      {
        id: "players-see-q2",
        label: "Both players see Question 2",
        actor: "player1",
        action: async (pages) => {
          await waitForQuestionVisible(pages.player1, "What is 2 + 2?");
          await waitForQuestionVisible(pages.player2, "What is 2 + 2?");
        },
      },
      {
        id: "both-answer-q2",
        label: "Both players submit correct answers",
        actor: "player1",
        highlight: { selector: 'input[placeholder="Type your answer..."]', annotation: 'Both answering: "4"' },
        action: async (pages) => {
          await submitAnswer(pages.player1, "4");
          await submitAnswer(pages.player2, "4");
        },
      },
      {
        id: "qm-marks-q2",
        label: "QM marks Q2 answer correct",
        actor: "qm",
        highlight: { selector: 'button:has-text("Correct")', annotation: "Marking Q2 correct" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(1000);
          await markCorrect(pages.qm, 0);
        },
      },
      {
        id: "qm-closes",
        label: "QM closes the room",
        actor: "qm",
        highlight: { selector: "text=Close Room", annotation: "Closing the quiz room" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(1000);
          await closeRoomViaUI(pages.qm);
        },
      },
      {
        id: "all-see-closed",
        label: "All users see room closed",
        actor: "qm",
        highlight: { selector: "text=This room has been closed", annotation: "Quiz complete!" },
        action: async (pages) => {
          await waitForRoomClosed(pages.qm);
          await waitForRoomClosed(pages.player1);
          await waitForRoomClosed(pages.player2);
        },
      },
    ],
  };
}

function individualBounceScenario(): DemoScenario {
  return {
    id: "individual-bounce",
    name: "Individual + Bounce",
    description: "Questions are assigned to one player; wrong answers bounce to the next",
    mode: "individual",
    scoringMode: "bounce",
    actors: ["qm", "player1", "player2"],
    steps: [
      {
        id: "create-room",
        label: "QM creates an individual bounce room",
        actor: "qm",
        highlight: { selector: "text=Create Room", annotation: "Creating bounce-mode room" },
        action: async (pages) => {
          const code = await createRoomViaUI(pages.qm, {
            name: "Demo Individual Bounce",
            mode: "individual",
            scoringMode: "bounce",
          });
          pages.setRoomCode(code);
          await expect(pages.qm.locator("text=Connected")).toBeVisible({ timeout: 20_000 });
        },
      },
      {
        id: "p1-joins",
        label: "Player 1 joins the room",
        actor: "player1",
        action: async (pages) => {
          await joinRoomViaUI(pages.player1, pages.roomCode);
          await expect(pages.player1.locator("text=Connected")).toBeVisible({ timeout: 20_000 });
        },
      },
      {
        id: "p2-joins",
        label: "Player 2 joins the room",
        actor: "player2",
        action: async (pages) => {
          await joinRoomViaUI(pages.player2, pages.roomCode);
          await expect(pages.player2.locator("text=Connected")).toBeVisible({ timeout: 20_000 });
        },
      },
      {
        id: "qm-sees-players",
        label: "QM sees players in participant list",
        actor: "qm",
        action: async (pages) => {
          await pages.qm.waitForTimeout(2000);
          await expect(pages.qm.getByRole("heading", { name: /Players/ })).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "qm-posts-q",
        label: "QM posts bounce question: Largest planet?",
        actor: "qm",
        highlight: { selector: 'textarea[placeholder="Type your question..."]', annotation: "Posting bounce question" },
        action: async (pages) => {
          await postQuestion(pages.qm, "What is the largest planet?", {
            timerSeconds: 60,
            points: 10,
            correctAnswer: "Jupiter",
          });
          await expect(pages.qm.locator("text=What is the largest planet?")).toBeVisible({ timeout: 15_000 });
        },
      },
      {
        id: "players-see-q",
        label: "Both players see the question",
        actor: "player1",
        action: async (pages) => {
          await waitForQuestionVisible(pages.player1, "What is the largest planet?");
          await waitForQuestionVisible(pages.player2, "What is the largest planet?");
        },
      },
      {
        id: "assigned-answers-wrong",
        label: "Assigned player submits wrong answer: Saturn",
        actor: "player1",
        highlight: { selector: "text=Your turn to answer", annotation: "Assigned player answers wrong" },
        action: async (pages) => {
          const playerPages = [pages.player1, pages.player2];
          for (const page of playerPages) {
            const turnIndicator = page.locator("text=Your turn to answer");
            if (await turnIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
              await page.fill('input[placeholder="Type your answer..."]', "Saturn");
              await page.click('button:has-text("Submit")');
              break;
            }
          }
        },
      },
      {
        id: "qm-marks-wrong",
        label: "QM marks the answer wrong to trigger bounce",
        actor: "qm",
        highlight: { selector: 'button:has-text("Wrong")', annotation: "Wrong! Question bounces..." },
        action: async (pages) => {
          await expect(pages.qm.locator("text=Incoming Answers")).toBeVisible({ timeout: 10_000 });
          await markWrong(pages.qm, 0);
        },
      },
      {
        id: "bounced-answers-correct",
        label: "Question bounces to next player who answers: Jupiter",
        actor: "player2",
        highlight: { selector: "text=Bounced to you!", annotation: "Bounce! Your turn now" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(2000);
          const playerPages = [pages.player1, pages.player2];
          for (const page of playerPages) {
            const bounceIndicator = page.locator("text=Bounced to you!");
            if (await bounceIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
              await page.fill('input[placeholder="Type your answer..."]', "Jupiter");
              await page.click('button:has-text("Submit")');
              break;
            }
          }
        },
      },
      {
        id: "qm-marks-bounced-correct",
        label: "QM marks the bounced answer correct",
        actor: "qm",
        highlight: { selector: 'button:has-text("Correct")', annotation: "Correct on the bounce!" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(1000);
          const correctButtons = pages.qm.locator('button:has-text("Correct")');
          const count = await correctButtons.count();
          if (count > 0) await correctButtons.first().click();
        },
      },
      {
        id: "leaderboard",
        label: "Leaderboard updates with bounce scoring",
        actor: "qm",
        highlight: { selector: "text=Leaderboard", annotation: "Bounce scores tallied" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(2000);
          await expect(pages.qm.locator("text=Leaderboard")).toBeVisible();
          await expect(pages.qm.locator("text=pts").first()).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "qm-closes",
        label: "QM closes the room",
        actor: "qm",
        highlight: { selector: "text=Close Room", annotation: "Closing the quiz" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(500);
          await closeRoomViaUI(pages.qm);
          await waitForRoomClosed(pages.qm);
        },
      },
    ],
  };
}

function individualPounceBounceScenario(): DemoScenario {
  return {
    id: "individual-pounce-bounce",
    name: "Individual + Pounce & Bounce",
    description: "Players can pounce (bet on knowing the answer) before the bounce phase",
    mode: "individual",
    scoringMode: "pounce_bounce",
    actors: ["qm", "player1", "player2"],
    steps: [
      {
        id: "create-room",
        label: "QM creates an individual pounce-bounce room",
        actor: "qm",
        highlight: { selector: "text=Create Room", annotation: "Creating pounce+bounce room" },
        action: async (pages) => {
          const code = await createRoomViaUI(pages.qm, {
            name: "Demo Individual Pounce Bounce",
            mode: "individual",
            scoringMode: "pounce_bounce",
          });
          pages.setRoomCode(code);
          await expect(pages.qm.locator("text=Connected")).toBeVisible({ timeout: 20_000 });
        },
      },
      {
        id: "p1-joins",
        label: "Player 1 joins the room",
        actor: "player1",
        action: async (pages) => {
          await joinRoomViaUI(pages.player1, pages.roomCode);
          await expect(pages.player1.locator("text=Connected")).toBeVisible({ timeout: 20_000 });
        },
      },
      {
        id: "p2-joins",
        label: "Player 2 joins the room",
        actor: "player2",
        action: async (pages) => {
          await joinRoomViaUI(pages.player2, pages.roomCode);
          await expect(pages.player2.locator("text=Connected")).toBeVisible({ timeout: 20_000 });
        },
      },
      {
        id: "qm-sees-players",
        label: "QM sees players in participant list",
        actor: "qm",
        action: async (pages) => {
          await pages.qm.waitForTimeout(2000);
          await expect(pages.qm.getByRole("heading", { name: /Players/ })).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "qm-posts-q",
        label: "QM posts pounce-bounce question: Berlin Wall?",
        actor: "qm",
        highlight: { selector: 'textarea[placeholder="Type your question..."]', annotation: "Posting pounce-bounce question" },
        action: async (pages) => {
          await postQuestion(pages.qm, "What year did the Berlin Wall fall?", {
            timerSeconds: 60,
            points: 10,
            correctAnswer: "1989",
          });
        },
      },
      {
        id: "players-see-q",
        label: "Both players see the question",
        actor: "player1",
        action: async (pages) => {
          await waitForQuestionVisible(pages.player1, "What year did the Berlin Wall fall?");
          await waitForQuestionVisible(pages.player2, "What year did the Berlin Wall fall?");
        },
      },
      {
        id: "pounce-window",
        label: "QM sees Pounce Window Open",
        actor: "qm",
        highlight: { selector: "text=Pounce Window Open", annotation: "Pounce phase active!" },
        action: async (pages) => {
          await expect(pages.qm.getByText("Pounce Window Open", { exact: true })).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "player-pounces",
        label: "A player pounces with answer: 1989",
        actor: "player1",
        highlight: { selector: 'button:has-text("Pounce!")', annotation: "Pouncing on this question!" },
        action: async (pages) => {
          const playerPages = [pages.player1, pages.player2];
          for (const page of playerPages) {
            const pounceBtn = page.locator('button:has-text("Pounce!")');
            if (await pounceBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
              await pounceBtn.click();
              await page.fill('input[placeholder="Your pounce answer..."]', "1989");
              await page.click('button:has-text("Submit Pounce")');
              break;
            }
          }
        },
      },
      {
        id: "qm-closes-pounce",
        label: "QM advances from pounce to bounce phase",
        actor: "qm",
        highlight: { selector: 'button:has-text("Close Pounce")', annotation: "Closing pounce window" },
        action: async (pages) => {
          const advanceBtn = pages.qm.locator('button:has-text("Close Pounce")');
          await expect(advanceBtn).toBeVisible({ timeout: 5_000 });
          await advanceBtn.click();
        },
      },
      {
        id: "assigned-answers",
        label: "Assigned player answers in bounce phase",
        actor: "player1",
        highlight: { selector: "text=Your turn to answer", annotation: "Bounce phase: your turn!" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(2000);
          const playerPages = [pages.player1, pages.player2];
          for (const page of playerPages) {
            const turnText = page.locator("text=Your turn to answer");
            if (await turnText.isVisible({ timeout: 3000 }).catch(() => false)) {
              await page.fill('input[placeholder="Type your answer..."]', "1989");
              await page.click('button:has-text("Submit")');
              break;
            }
          }
        },
      },
      {
        id: "qm-marks-bounce",
        label: "QM marks the bounce answer correct",
        actor: "qm",
        highlight: { selector: 'button:has-text("Correct")', annotation: "Correct!" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(1000);
          const correctButtons = pages.qm.locator('button:has-text("Correct")');
          const count = await correctButtons.count();
          if (count > 0) await correctButtons.first().click();
        },
      },
      {
        id: "pounce-marking",
        label: "QM marks pounce answers",
        actor: "qm",
        highlight: { selector: "text=Mark Pounce Answers", annotation: "Reviewing pounce answers" },
        action: async (pages) => {
          const markPounce = pages.qm.locator("text=Mark Pounce Answers");
          const hasPouncePhase = await markPounce.isVisible({ timeout: 5_000 }).catch(() => false);
          if (hasPouncePhase) {
            const pounceCorrectBtns = pages.qm.locator('.border-purple-500\\/15 button:has-text("Correct")');
            const pounceCount = await pounceCorrectBtns.count();
            for (let i = 0; i < pounceCount; i++) {
              await pounceCorrectBtns.nth(i).click();
              await pages.qm.waitForTimeout(500);
            }
          }
        },
      },
      {
        id: "leaderboard",
        label: "Leaderboard reflects pounce-bounce scores",
        actor: "qm",
        highlight: { selector: "text=Leaderboard", annotation: "Pounce+bounce scores!" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(2000);
          await expect(pages.qm.locator("text=Leaderboard")).toBeVisible();
        },
      },
      {
        id: "qm-closes",
        label: "QM closes the room",
        actor: "qm",
        action: async (pages) => {
          await pages.qm.waitForTimeout(500);
          await closeRoomViaUI(pages.qm);
          await waitForRoomClosed(pages.qm);
        },
      },
    ],
  };
}

function teamNormalScenario(): DemoScenario {
  return {
    id: "team-normal",
    name: "Team + Normal",
    description: "Teams compete: captains create teams, answer questions together",
    mode: "team",
    scoringMode: "normal",
    actors: ["qm", "cap1", "cap2"],
    steps: [
      {
        id: "create-room",
        label: "QM creates a team-mode room",
        actor: "qm",
        highlight: { selector: "text=Create Room", annotation: "Creating team quiz room" },
        action: async (pages) => {
          const code = await createRoomViaUI(pages.qm, {
            name: "Demo Team Normal Quiz",
            mode: "team",
            scoringMode: "normal",
          });
          pages.setRoomCode(code);
          await expect(pages.qm.locator("text=Connected")).toBeVisible({ timeout: 20_000 });
        },
      },
      {
        id: "cap1-creates-team",
        label: "Captain 1 joins and creates Team Alpha",
        actor: "cap1",
        highlight: { selector: 'button:has-text("Create Team")', annotation: "Creating Team Alpha" },
        action: async (pages) => {
          await pages.cap1.goto(`/room/${pages.roomCode}`);
          await createTeamViaUI(pages.cap1, "Team Alpha");
        },
      },
      {
        id: "cap2-creates-team",
        label: "Captain 2 joins and creates Team Beta",
        actor: "cap2",
        highlight: { selector: 'button:has-text("Create Team")', annotation: "Creating Team Beta" },
        action: async (pages) => {
          await pages.cap2.goto(`/room/${pages.roomCode}`);
          await createTeamViaUI(pages.cap2, "Team Beta");
        },
      },
      {
        id: "qm-sees-teams",
        label: "QM sees teams in participant list",
        actor: "qm",
        highlight: { selector: "text=Teams", annotation: "All teams joined!" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(2000);
          await expect(pages.qm.getByRole("heading", { name: /Teams/ })).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "qm-posts-q1",
        label: "QM posts question: Closest planet to the Sun?",
        actor: "qm",
        highlight: { selector: 'textarea[placeholder="Type your question..."]', annotation: "Posting team question" },
        action: async (pages) => {
          await postQuestion(pages.qm, "Which planet is closest to the Sun?", {
            timerSeconds: 60,
            points: 10,
            correctAnswer: "Mercury",
          });
        },
      },
      {
        id: "caps-see-q1",
        label: "Both captains see the question",
        actor: "cap1",
        action: async (pages) => {
          await waitForQuestionVisible(pages.cap1, "Which planet is closest to the Sun?");
          await waitForQuestionVisible(pages.cap2, "Which planet is closest to the Sun?");
        },
      },
      {
        id: "cap1-answers",
        label: "Team Alpha answers: Mercury",
        actor: "cap1",
        highlight: { selector: 'input[placeholder="Type your answer..."]', annotation: 'Team Alpha: "Mercury"' },
        action: async (pages) => {
          await submitAnswer(pages.cap1, "Mercury");
          await expect(pages.cap1.locator("text=Answer Submitted")).toBeVisible({ timeout: 5_000 });
        },
      },
      {
        id: "cap2-answers",
        label: "Team Beta answers: Venus",
        actor: "cap2",
        highlight: { selector: 'input[placeholder="Type your answer..."]', annotation: 'Team Beta: "Venus"' },
        action: async (pages) => {
          await submitAnswer(pages.cap2, "Venus");
          await expect(pages.cap2.locator("text=Answer Submitted")).toBeVisible({ timeout: 5_000 });
        },
      },
      {
        id: "qm-sees-answers",
        label: "QM sees incoming team answers",
        actor: "qm",
        highlight: { selector: "text=Incoming Answers", annotation: "Reviewing team answers" },
        action: async (pages) => {
          await expect(pages.qm.locator("text=Incoming Answers")).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "qm-marks-correct",
        label: "QM marks the correct answer",
        actor: "qm",
        highlight: { selector: 'button:has-text("Correct")', annotation: "Marking correct" },
        action: async (pages) => {
          await markCorrect(pages.qm, 0);
        },
      },
      {
        id: "answers-revealed",
        label: "Captains see answers revealed",
        actor: "cap1",
        highlight: { selector: "text=Answers Revealed", annotation: "Results are in!" },
        action: async (pages) => {
          await expect(pages.cap1.locator("text=Answers Revealed")).toBeVisible({ timeout: 10_000 });
          await expect(pages.cap2.locator("text=Answers Revealed")).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "leaderboard-q1",
        label: "Leaderboard shows team scores",
        actor: "qm",
        highlight: { selector: "text=Leaderboard", annotation: "Team scores updated!" },
        action: async (pages) => {
          await expect(pages.qm.locator("text=Leaderboard")).toBeVisible();
          await expect(pages.qm.locator("text=pts").first()).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "qm-posts-q2",
        label: "QM posts Question 2: What is H2O?",
        actor: "qm",
        highlight: { selector: 'textarea[placeholder="Type your question..."]', annotation: "Posting Q2" },
        action: async (pages) => {
          await postQuestion(pages.qm, "What is H2O?", {
            timerSeconds: 30,
            correctAnswer: "Water",
          });
        },
      },
      {
        id: "caps-answer-q2",
        label: "Both captains answer Q2: Water",
        actor: "cap1",
        action: async (pages) => {
          await waitForQuestionVisible(pages.cap1, "What is H2O?");
          await waitForQuestionVisible(pages.cap2, "What is H2O?");
          await submitAnswer(pages.cap1, "Water");
          await submitAnswer(pages.cap2, "Water");
        },
      },
      {
        id: "qm-marks-q2-closes",
        label: "QM marks Q2 correct and closes room",
        actor: "qm",
        highlight: { selector: "text=Close Room", annotation: "Wrapping up the quiz" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(1000);
          await markCorrect(pages.qm, 0);
          await pages.qm.waitForTimeout(1000);
          await closeRoomViaUI(pages.qm);
        },
      },
      {
        id: "all-see-closed",
        label: "All see room closed with history",
        actor: "qm",
        highlight: { selector: "text=This room has been closed", annotation: "Quiz complete!" },
        action: async (pages) => {
          await waitForRoomClosed(pages.qm);
          await waitForRoomClosed(pages.cap1);
          await waitForRoomClosed(pages.cap2);
        },
      },
    ],
  };
}

function teamBounceScenario(): DemoScenario {
  return {
    id: "team-bounce",
    name: "Team + Bounce",
    description: "Questions assigned to teams; wrong answers bounce to the next team",
    mode: "team",
    scoringMode: "bounce",
    actors: ["qm", "cap1", "cap2", "cap3"],
    steps: [
      {
        id: "create-room",
        label: "QM creates a bounce-mode team room",
        actor: "qm",
        highlight: { selector: "text=Create Room", annotation: "Creating team bounce room" },
        action: async (pages) => {
          const code = await createRoomViaUI(pages.qm, {
            name: "Demo Team Bounce Quiz",
            mode: "team",
            scoringMode: "bounce",
          });
          pages.setRoomCode(code);
          await expect(pages.qm.locator("text=Connected")).toBeVisible({ timeout: 20_000 });
        },
      },
      {
        id: "cap1-creates-team",
        label: "Captain 1 creates Team Alpha",
        actor: "cap1",
        action: async (pages) => {
          await pages.cap1.goto(`/room/${pages.roomCode}`);
          await createTeamViaUI(pages.cap1, "Team Alpha");
        },
      },
      {
        id: "cap2-creates-team",
        label: "Captain 2 creates Team Beta",
        actor: "cap2",
        action: async (pages) => {
          await pages.cap2.goto(`/room/${pages.roomCode}`);
          await createTeamViaUI(pages.cap2, "Team Beta");
        },
      },
      {
        id: "cap3-creates-team",
        label: "Captain 3 creates Team Gamma",
        actor: "cap3",
        action: async (pages) => {
          await pages.cap3.goto(`/room/${pages.roomCode}`);
          await createTeamViaUI(pages.cap3, "Team Gamma");
        },
      },
      {
        id: "qm-sees-teams",
        label: "QM sees all teams",
        actor: "qm",
        action: async (pages) => {
          await pages.qm.waitForTimeout(2000);
          await expect(pages.qm.getByRole("heading", { name: /Teams/ })).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "qm-posts-q",
        label: "QM posts bounce question: Largest ocean?",
        actor: "qm",
        highlight: { selector: 'textarea[placeholder="Type your question..."]', annotation: "Posting bounce question" },
        action: async (pages) => {
          await postQuestion(pages.qm, "Name the largest ocean on Earth", {
            timerSeconds: 60,
            points: 10,
            correctAnswer: "Pacific",
          });
        },
      },
      {
        id: "caps-see-q",
        label: "All captains see the question",
        actor: "cap1",
        action: async (pages) => {
          await waitForQuestionVisible(pages.cap1, "Name the largest ocean on Earth");
          await waitForQuestionVisible(pages.cap2, "Name the largest ocean on Earth");
          await waitForQuestionVisible(pages.cap3, "Name the largest ocean on Earth");
        },
      },
      {
        id: "assigned-answers-wrong",
        label: "Assigned team submits wrong answer: Atlantic",
        actor: "cap1",
        highlight: { selector: "text=Your turn to answer", annotation: "Assigned team answers wrong" },
        action: async (pages) => {
          const capPages = [pages.cap1, pages.cap2, pages.cap3];
          for (const page of capPages) {
            const turnIndicator = page.locator("text=Your turn to answer");
            if (await turnIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
              await page.fill('input[placeholder="Type your answer..."]', "Atlantic");
              await page.click('button:has-text("Submit")');
              break;
            }
          }
        },
      },
      {
        id: "qm-marks-wrong",
        label: "QM marks wrong to trigger bounce",
        actor: "qm",
        highlight: { selector: 'button:has-text("Wrong")', annotation: "Wrong! Bouncing..." },
        action: async (pages) => {
          await expect(pages.qm.locator("text=Incoming Answers")).toBeVisible({ timeout: 10_000 });
          await markWrong(pages.qm, 0);
        },
      },
      {
        id: "bounced-answers",
        label: "Question bounces to next team who answers: Pacific",
        actor: "cap2",
        highlight: { selector: "text=Bounced to you!", annotation: "Bounce! Your team's turn" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(2000);
          const capPages = [pages.cap1, pages.cap2, pages.cap3];
          for (const page of capPages) {
            const bounceIndicator = page.locator("text=Bounced to you!");
            if (await bounceIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
              await page.fill('input[placeholder="Type your answer..."]', "Pacific");
              await page.click('button:has-text("Submit")');
              break;
            }
          }
        },
      },
      {
        id: "qm-marks-correct",
        label: "QM marks the bounced answer correct",
        actor: "qm",
        highlight: { selector: 'button:has-text("Correct")', annotation: "Correct on the bounce!" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(1000);
          const correctButtons = pages.qm.locator('button:has-text("Correct")');
          const count = await correctButtons.count();
          if (count > 0) await correctButtons.first().click();
        },
      },
      {
        id: "leaderboard",
        label: "Leaderboard updates with bounce scoring",
        actor: "qm",
        highlight: { selector: "text=Leaderboard", annotation: "Team bounce scores!" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(2000);
          await expect(pages.qm.locator("text=Leaderboard")).toBeVisible();
          await expect(pages.qm.locator("text=pts").first()).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "qm-closes",
        label: "QM closes the room",
        actor: "qm",
        action: async (pages) => {
          await pages.qm.waitForTimeout(500);
          await closeRoomViaUI(pages.qm);
          await waitForRoomClosed(pages.qm);
        },
      },
    ],
  };
}

function teamPounceBounceScenario(): DemoScenario {
  return {
    id: "team-pounce-bounce",
    name: "Team + Pounce & Bounce",
    description: "Teams can pounce before the bounce phase; most complex scoring mode",
    mode: "team",
    scoringMode: "pounce_bounce",
    actors: ["qm", "cap1", "cap2", "cap3"],
    steps: [
      {
        id: "create-room",
        label: "QM creates a pounce-bounce team room",
        actor: "qm",
        highlight: { selector: "text=Create Room", annotation: "Creating pounce+bounce team room" },
        action: async (pages) => {
          const code = await createRoomViaUI(pages.qm, {
            name: "Demo Pounce Bounce Quiz",
            mode: "team",
            scoringMode: "pounce_bounce",
          });
          pages.setRoomCode(code);
          await expect(pages.qm.locator("text=Connected")).toBeVisible({ timeout: 20_000 });
        },
      },
      {
        id: "cap1-creates-team",
        label: "Captain 1 creates Team Alpha",
        actor: "cap1",
        action: async (pages) => {
          await pages.cap1.goto(`/room/${pages.roomCode}`);
          await createTeamViaUI(pages.cap1, "Team Alpha");
        },
      },
      {
        id: "cap2-creates-team",
        label: "Captain 2 creates Team Beta",
        actor: "cap2",
        action: async (pages) => {
          await pages.cap2.goto(`/room/${pages.roomCode}`);
          await createTeamViaUI(pages.cap2, "Team Beta");
        },
      },
      {
        id: "cap3-creates-team",
        label: "Captain 3 creates Team Gamma",
        actor: "cap3",
        action: async (pages) => {
          await pages.cap3.goto(`/room/${pages.roomCode}`);
          await createTeamViaUI(pages.cap3, "Team Gamma");
        },
      },
      {
        id: "qm-sees-teams",
        label: "QM sees all teams in participant list",
        actor: "qm",
        action: async (pages) => {
          await pages.qm.waitForTimeout(2000);
          await expect(pages.qm.getByRole("heading", { name: /Teams/ })).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "qm-posts-q",
        label: "QM posts pounce-bounce question: Moon landing year?",
        actor: "qm",
        highlight: { selector: 'textarea[placeholder="Type your question..."]', annotation: "Posting pounce-bounce question" },
        action: async (pages) => {
          await postQuestion(pages.qm, "What year did the first Moon landing happen?", {
            timerSeconds: 60,
            points: 10,
            correctAnswer: "1969",
          });
        },
      },
      {
        id: "caps-see-q",
        label: "All captains see the question",
        actor: "cap1",
        action: async (pages) => {
          await waitForQuestionVisible(pages.cap1, "What year did the first Moon landing happen?");
          await waitForQuestionVisible(pages.cap2, "What year did the first Moon landing happen?");
          await waitForQuestionVisible(pages.cap3, "What year did the first Moon landing happen?");
        },
      },
      {
        id: "pounce-window",
        label: "QM sees Pounce Window Open",
        actor: "qm",
        highlight: { selector: "text=Pounce Window Open", annotation: "Pounce phase active!" },
        action: async (pages) => {
          await expect(pages.qm.getByText("Pounce Window Open", { exact: true })).toBeVisible({ timeout: 10_000 });
        },
      },
      {
        id: "team-pounces",
        label: "A team pounces with answer: 1969",
        actor: "cap1",
        highlight: { selector: 'button:has-text("Pounce!")', annotation: "Team pouncing!" },
        action: async (pages) => {
          const capPages = [pages.cap1, pages.cap2, pages.cap3];
          for (const page of capPages) {
            const pounceBtn = page.locator('button:has-text("Pounce!")');
            if (await pounceBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
              await pounceBtn.click();
              await page.fill('input[placeholder="Your pounce answer..."]', "1969");
              await page.click('button:has-text("Submit Pounce")');
              break;
            }
          }
        },
      },
      {
        id: "qm-closes-pounce",
        label: "QM advances from pounce to bounce phase",
        actor: "qm",
        highlight: { selector: 'button:has-text("Close Pounce")', annotation: "Closing pounce window" },
        action: async (pages) => {
          const advanceBtn = pages.qm.locator('button:has-text("Close Pounce")');
          await expect(advanceBtn).toBeVisible({ timeout: 5_000 });
          await advanceBtn.click();
        },
      },
      {
        id: "assigned-answers",
        label: "Assigned team answers in bounce phase",
        actor: "cap1",
        highlight: { selector: "text=Your turn to answer", annotation: "Bounce phase: your turn!" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(2000);
          const capPages = [pages.cap1, pages.cap2, pages.cap3];
          for (const page of capPages) {
            const turnText = page.locator("text=Your turn to answer");
            if (await turnText.isVisible({ timeout: 3000 }).catch(() => false)) {
              await page.fill('input[placeholder="Type your answer..."]', "1969");
              await page.click('button:has-text("Submit")');
              break;
            }
          }
        },
      },
      {
        id: "qm-marks-bounce",
        label: "QM marks the bounce answer correct",
        actor: "qm",
        highlight: { selector: 'button:has-text("Correct")', annotation: "Correct!" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(1000);
          const correctButtons = pages.qm.locator('button:has-text("Correct")');
          const count = await correctButtons.count();
          if (count > 0) await correctButtons.first().click();
        },
      },
      {
        id: "pounce-marking",
        label: "QM marks pounce answers",
        actor: "qm",
        highlight: { selector: "text=Mark Pounce Answers", annotation: "Reviewing pounce answers" },
        action: async (pages) => {
          const markPounce = pages.qm.locator("text=Mark Pounce Answers");
          const hasPouncePhase = await markPounce.isVisible({ timeout: 5_000 }).catch(() => false);
          if (hasPouncePhase) {
            const pounceCorrectBtns = pages.qm.locator('.border-purple-500\\/15 button:has-text("Correct")');
            const pounceCount = await pounceCorrectBtns.count();
            for (let i = 0; i < pounceCount; i++) {
              await pounceCorrectBtns.nth(i).click();
              await pages.qm.waitForTimeout(500);
            }
          }
        },
      },
      {
        id: "leaderboard",
        label: "Leaderboard reflects pounce-bounce scores",
        actor: "qm",
        highlight: { selector: "text=Leaderboard", annotation: "Pounce+bounce scores!" },
        action: async (pages) => {
          await pages.qm.waitForTimeout(2000);
          await expect(pages.qm.locator("text=Leaderboard")).toBeVisible();
        },
      },
      {
        id: "qm-closes",
        label: "QM closes the room",
        actor: "qm",
        action: async (pages) => {
          await pages.qm.waitForTimeout(500);
          await closeRoomViaUI(pages.qm);
          await waitForRoomClosed(pages.qm);
        },
      },
    ],
  };
}

export function getAllScenarios(): DemoScenario[] {
  return [
    individualNormalScenario(),
    individualBounceScenario(),
    individualPounceBounceScenario(),
    teamNormalScenario(),
    teamBounceScenario(),
    teamPounceBounceScenario(),
  ];
}

export function getScenarioById(id: string): DemoScenario | undefined {
  return getAllScenarios().find((s) => s.id === id);
}
