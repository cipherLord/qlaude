import { expect } from "@playwright/test";
import { teamTest as test } from "../fixtures/quiz-fixture";
import {
  createRoomViaUI,
  navigateToRoom,
  createTeamViaUI,
  postQuestion,
  submitAnswer,
  waitForQuestionVisible,
  markCorrect,
  closeRoomViaUI,
  waitForRoomClosed,
  getTeamCodeFromAPI,
} from "../helpers/room";

test.describe("Team + Normal Mode", () => {
  test("Full team quiz: create room, form teams, answer, mark, leaderboard", async ({
    qmPage,
    cap1Page,
    cap2Page,
    cap1User,
    cap2User,
  }) => {
    let roomCode: string;

    await test.step("Quizmaster creates a team-mode room", async () => {
      roomCode = await createRoomViaUI(qmPage, {
        name: "E2E Team Normal Quiz",
        mode: "team",
        scoringMode: "normal",
      });
      expect(roomCode).toBeTruthy();
      await expect(qmPage.locator("text=Connected")).toBeVisible({
        timeout: 20_000,
      });
    });

    await test.step("Captain 1 joins room and creates Team Alpha", async () => {
      await cap1Page.goto(`/room/${roomCode}`);
      await createTeamViaUI(cap1Page, "Team Alpha");
    });

    await test.step("Captain 2 joins room and creates Team Beta", async () => {
      await cap2Page.goto(`/room/${roomCode}`);
      await createTeamViaUI(cap2Page, "Team Beta");
    });

    await test.step("QM sees teams in participant list", async () => {
      await qmPage.waitForTimeout(2000);
      await expect(qmPage.getByRole("heading", { name: /Teams/ })).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("QM posts a question", async () => {
      await postQuestion(qmPage, "Which planet is closest to the Sun?", {
        timerSeconds: 60,
        points: 10,
        correctAnswer: "Mercury",
      });
    });

    await test.step("Both captains see the question", async () => {
      await waitForQuestionVisible(
        cap1Page,
        "Which planet is closest to the Sun?"
      );
      await waitForQuestionVisible(
        cap2Page,
        "Which planet is closest to the Sun?"
      );
    });

    await test.step("Captain 1 (Team Alpha) submits answer", async () => {
      await submitAnswer(cap1Page, "Mercury");
      await expect(cap1Page.locator("text=Answer Submitted")).toBeVisible({
        timeout: 5_000,
      });
    });

    await test.step("Captain 2 (Team Beta) submits answer", async () => {
      await submitAnswer(cap2Page, "Venus");
      await expect(cap2Page.locator("text=Answer Submitted")).toBeVisible({
        timeout: 5_000,
      });
    });

    await test.step("QM sees incoming team answers", async () => {
      await expect(
        qmPage.locator("text=Incoming Answers")
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step("QM marks the correct answer", async () => {
      await markCorrect(qmPage, 0);
    });

    await test.step("Captains see answers revealed", async () => {
      await expect(
        cap1Page.locator("text=Answers Revealed")
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        cap2Page.locator("text=Answers Revealed")
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step("Leaderboard shows team scores", async () => {
      await expect(qmPage.locator("text=Leaderboard")).toBeVisible();
      const leaderboardPts = qmPage.locator("text=pts").first();
      await expect(leaderboardPts).toBeVisible({ timeout: 10_000 });
    });

    await test.step("QM posts a second question", async () => {
      await postQuestion(qmPage, "What is H2O?", {
        timerSeconds: 30,
        correctAnswer: "Water",
      });
    });

    await test.step("Captains see Question 2 and answer", async () => {
      await waitForQuestionVisible(cap1Page, "What is H2O?");
      await waitForQuestionVisible(cap2Page, "What is H2O?");

      await submitAnswer(cap1Page, "Water");
      await submitAnswer(cap2Page, "Water");
    });

    await test.step("QM marks Q2 correct and closes room", async () => {
      await qmPage.waitForTimeout(1000);
      await markCorrect(qmPage, 0);

      await qmPage.waitForTimeout(1000);
      await closeRoomViaUI(qmPage);
    });

    await test.step("All see room closed with history", async () => {
      await waitForRoomClosed(qmPage);
      await waitForRoomClosed(cap1Page);
      await waitForRoomClosed(cap2Page);

      await expect(
        qmPage.locator("text=Previous Questions")
      ).toBeVisible({ timeout: 10_000 });
    });
  });
});
